'use client'

import { useQuery } from '@tanstack/react-query'
import { Eye, Mail, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { UsageMeter } from '@/components/billing/Usage'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { useStations } from '@/hooks/queries'
import { useBilling, useLimit } from '@/lib/billing/state'
import { countEditors, countText } from '@/lib/billing/usage'
import { gateway } from '@/lib/gateway/client'
import { currentGrantId, isNotAdmin, orgApi, type Member } from '@/lib/gateway/org'
import { messages, num, useMessages } from '@/lib/i18n'
import { CATEGORIES, CATEGORY_KEYS, ROLES, type Feature } from '@/lib/model/catalog'
import type { CategoryKey, MemberRole, MemberSettings } from '@/lib/model/types'
import { cn, initials } from '@/lib/util/cn'
import { SearchField } from '@/components/ui/SearchField'
import { matchesTokens, SEARCH_FROM, searchTokens } from '@/lib/util/people'

const org$ = orgApi(gateway)

/** En une phrase : ce sur quoi la personne se concentre, ce qu'elle voit, ce qu'elle modifie. */
export function summaryOf(m: MemberSettings, stationNames: Map<string, string>): string {
  const t = messages().settings.members
  const role = ROLES[m.role]
  const focus = [...m.categories.map((c) => CATEGORIES[c].label.toLowerCase()), ...m.stationIds.map((s) => stationNames.get(s)).filter(Boolean)]
  return `${role.summary} ${focus.length ? t.focus(focus.join(', ')) : t.noFocus}`
}

export function MembersTab() {
  const { org, updateOrg, profile, can } = useSession()
  const words = useMessages()
  const t = words.settings.members
  const toast = useToast()
  const stations = useStations()
  const { openPaywall } = useBilling()
  const members = useQuery({ queryKey: ['members'], queryFn: () => org$.members(), retry: false })
  const [editing, setEditing] = useState<{ key: string; name: string; value: MemberSettings } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState({ email: '', role: 'author' as MemberRole })
  const [busy, setBusy] = useState(false)
  const [viewAs, setViewAs] = useState<{ name: string; value: MemberSettings } | null>(null)
  const stationNames = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name])), [stations.data])
  const editorLimit = useLimit('editors', countEditors(org.json_data.members))
  // Inviter un rédacteur de plus que le plan n'en compte : on le dit avant l'envoi, avec la voie gratuite.
  const inviteBlocked = invite.role !== 'reader' && !!editorLimit?.reached
  const canWrite = can('members', 'write')
  const grantId = currentGrantId()
  const pending = Object.entries(org.json_data.members).filter(([k]) => k.startsWith('email:') && !(members.data ?? []).some((m) => `email:${m.email.toLowerCase()}` === k))
  // Des dizaines de personnes (les lecteurs ne se comptent pas) : une recherche et le filtre par rôle.
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'all'>('all')

  const settingsFor = (m: Member): MemberSettings => org.json_data.members[m.user_id] ?? org.json_data.members[`email:${m.email.toLowerCase()}`] ?? { role: m.role === 'admin' ? 'admin' : 'author', categories: [], stationIds: [] }

  async function saveMember(key: string, value: MemberSettings) {
    const becomesWriter = value.role !== 'reader' && org.json_data.members[key]?.role === 'reader'
    if (becomesWriter && editorLimit?.reached) {
      openPaywall({ feature: 'editors', used: editorLimit.used })
      return
    }
    await updateOrg({ [`members.${key}`]: value })
    toast.success(t.accessUpdated)
    setEditing(null)
  }

  async function sendInvite() {
    if (!/^\S+@\S+\.\S+$/.test(invite.email)) return
    if (inviteBlocked) {
      openPaywall({ feature: 'editors', used: editorLimit?.used, retry: () => setInviteOpen(true) })
      return
    }
    setBusy(true)
    try {
      if (!grantId) throw new Error('grant')
      await org$.invite(invite.email, [grantId])
      await updateOrg({ [`members.email:${invite.email.trim().toLowerCase()}`]: { role: invite.role, categories: [], stationIds: [], email: invite.email.trim().toLowerCase() } })
      toast.success(t.inviteSent, t.inviteSentHint(invite.email))
      setInviteOpen(false)
      setInvite({ email: '', role: 'author' })
    } catch (e) {
      toast.error(t.inviteFailed, e instanceof Error && e.message === 'grant' ? t.noGrant : isNotAdmin(e) ? t.notAdmin : errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">{t.title}</h2>
            <p className="text-sm font-medium text-slate-500">{t.intro}</p>
          </div>
          {canWrite && (
            <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              {t.invite} {editorLimit?.reached && <LockBadge />}
            </Button>
          )}
        </div>
        <UsageMeter feature="editors" limit={editorLimit} className="mb-5" />
        {members.isLoading ? (
          <SkeletonRows count={3} />
        ) : members.error ? (
          isNotAdmin(members.error) ? (
            <p className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{t.adminOnly}</p>
          ) : (
            <ErrorState error={members.error} onRetry={() => members.refetch()} />
          )
        ) : !members.data?.length ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <MembersList
            members={members.data}
            pending={pending}
            settingsFor={settingsFor}
            query={query}
            onQuery={setQuery}
            role={roleFilter}
            onRole={setRoleFilter}
            render={(list, pendingShown) => (
          <ul className="space-y-2">
            {list.map((m) => {
              const s = settingsFor(m)
              const name = m.full_name || m.email
              return (
                <li key={m.user_id} className="glass-card flex flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center">
                  <span className="flex items-center gap-3 sm:flex-1">
                    <span className="bg-gradient-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white">{initials(name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-black">
                        {name} {m.user_id === profile.userId && <span className="text-xs text-slate-400">{t.you}</span>}
                      </span>
                      <span className="block text-sm font-medium text-slate-500">{summaryOf(s, stationNames)}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => setViewAs({ name, value: s })}>
                      {t.viewAs}
                    </Button>
                    {canWrite && (
                      <Button size="sm" onClick={() => setEditing({ key: m.user_id, name, value: s })}>
                        {ROLES[s.role].label}
                      </Button>
                    )}
                  </span>
                </li>
              )
            })}
            {pendingShown.map(([k, v]) => (
              <li key={k} className="flex items-center gap-3 rounded-[22px] border-2 border-dashed border-slate-200 p-3 dark:border-slate-700">
                <Mail className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-bold text-slate-500">
                  {k.slice(6)} · {t.invitationSent} · {ROLES[v.role].label}
                </span>
              </li>
            ))}
          </ul>
            )}
          />
        )}
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>{words.common.cancel}</Button>
            <Button variant="primary" onClick={() => editing && void saveMember(editing.key, editing.value)}>
              {words.common.save}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div>
              <Label>{t.role}</Label>
              <div className="grid gap-2">
                {(Object.keys(ROLES) as MemberRole[]).map((r) => (
                  <button key={r} type="button" onClick={() => setEditing({ ...editing, value: { ...editing.value, role: r } })} className={cn('btn-press rounded-2xl border-2 p-3 text-left', editing.value.role === r ? 'border-[var(--primary)] bg-primary-soft' : 'glass-card border-transparent')}>
                    <span className="block font-black">{ROLES[r].label}</span>
                    <span className="block text-sm font-medium text-slate-500">{ROLES[r].summary}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label hint={t.responsibilitiesHint}>{t.responsibilities}</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_KEYS.map((c: CategoryKey) => {
                  const on = editing.value.categories.includes(c)
                  return (
                    <button key={c} type="button" onClick={() => setEditing({ ...editing, value: { ...editing.value, categories: on ? editing.value.categories.filter((x) => x !== c) : [...editing.value.categories, c] } })} className={cn('btn-press h-10 rounded-xl px-3 text-xs font-black', on ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : CATEGORIES[c].soft)}>
                      {CATEGORIES[c].label}
                    </button>
                  )
                })}
              </div>
              {!!stations.data?.length && (
                <Select
                  className="mt-3"
                  value=""
                  onChange={(e) => e.target.value && setEditing({ ...editing, value: { ...editing.value, stationIds: [...new Set([...editing.value.stationIds, e.target.value])] } })}
                  aria-label={t.addStation}
                >
                  <option value="">{t.addStationOption}</option>
                  {stations.data.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.json_data.name}
                    </option>
                  ))}
                </Select>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {editing.value.stationIds.map((id) => (
                  <button key={id} type="button" onClick={() => setEditing({ ...editing, value: { ...editing.value, stationIds: editing.value.stationIds.filter((x) => x !== id) } })} className="glass-card h-9 rounded-xl px-3 text-xs font-black">
                    {stationNames.get(id)} ✕
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-2xl bg-slate-900/5 p-3 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{summaryOf(editing.value, stationNames)}</p>
          </div>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t.inviteTitle}
        footer={
          <>
            <Button onClick={() => setInviteOpen(false)}>{words.common.cancel}</Button>
            <Button variant="primary" loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(invite.email)} onClick={sendInvite}>
              {t.sendInvite} {inviteBlocked && <LockBadge />}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="inv-email">{t.email}</Label>
            <Input id="inv-email" type="email" inputMode="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder={t.emailPlaceholder} />
          </div>
          <div>
            <Label htmlFor="inv-role">{t.role}</Label>
            <Select id="inv-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as MemberRole })}>
              {(Object.keys(ROLES) as MemberRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLES[r].label} — {ROLES[r].summary}
                </option>
              ))}
            </Select>
          </div>
          {inviteBlocked && editorLimit?.limit != null && (
            <div className="rounded-[20px] bg-amber-50 p-4 dark:bg-amber-500/10">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{t.editorLimit(countText('editors', editorLimit.limit), editorLimit.limit, ROLES[invite.role].label.toLowerCase())}</p>
              <Button size="sm" className="mt-3" onClick={() => setInvite({ ...invite, role: 'reader' })}>
                {t.inviteAsReader}
              </Button>
            </div>
          )}
          <p className="text-xs font-medium text-slate-400">{t.operatorsNote}</p>
        </div>
      </Modal>

      <Modal open={!!viewAs} onClose={() => setViewAs(null)} title={t.viewAsTitle(viewAs?.name ?? '')}>
        {viewAs && (
          <div className="space-y-3 text-sm font-bold">
            <p>{summaryOf(viewAs.value, stationNames)}</p>
            <ul className="space-y-1">
              {Object.entries(ROLES[viewAs.value.role].permissions).map(([f, p]) => (
                <li key={f} className="flex justify-between rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/10">
                  <span>{t.features[f as Feature]}</span>
                  <span className={cn(p === 'none' ? 'text-slate-400' : p === 'read' ? 'text-sky-600' : 'text-emerald-600')}>{p === 'none' ? t.access.none : p === 'read' ? t.access.read : t.access.write}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-slate-400">{t.serverNote}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

const ROLE_ORDER: MemberRole[] = ['admin', 'approver', 'author', 'reader']

/** La liste des membres, cherchée et filtrée par rôle dès qu'elle grandit ; le rendu reste celui de l'onglet. */
function MembersList({
  members,
  pending,
  settingsFor,
  query,
  onQuery,
  role,
  onRole,
  render,
}: {
  members: Member[]
  pending: Array<[string, MemberSettings]>
  settingsFor: (m: Member) => MemberSettings
  query: string
  onQuery: (v: string) => void
  role: MemberRole | 'all'
  onRole: (r: MemberRole | 'all') => void
  render: (list: Member[], pending: Array<[string, MemberSettings]>) => ReactNode
}) {
  const words = useMessages()
  const t = words.settings.members
  const tokens = searchTokens(query)
  const total = members.length + pending.length
  const roleOf = (m: Member) => settingsFor(m).role
  const counts = Object.fromEntries(ROLE_ORDER.map((r) => [r, members.filter((m) => roleOf(m) === r).length + pending.filter(([, v]) => v.role === r).length])) as Record<MemberRole, number>
  const list = members.filter((m) => (role === 'all' || roleOf(m) === role) && matchesTokens(tokens, m.full_name, m.email))
  const pendingShown = pending.filter(([k, v]) => (role === 'all' || v.role === role) && matchesTokens(tokens, k.slice(6)))
  if (total <= SEARCH_FROM) return <>{render(members, pending)}</>
  return (
    <div className="space-y-3">
      <SearchField value={query} onChange={onQuery} placeholder={t.search} />
      <div role="radiogroup" aria-label={t.role} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {(['all', ...ROLE_ORDER.filter((r) => counts[r] > 0)] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => onRole(r)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-3 text-sm font-black', role === r ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card text-slate-700 dark:text-slate-200')}>
            {r === 'all' ? t.allRoles : ROLES[r].label} <span className="opacity-60 tabular-nums">{num(r === 'all' ? total : counts[r])}</span>
          </button>
        ))}
      </div>
      {list.length || pendingShown.length ? (
        render(list, pendingShown)
      ) : (
        <p className="glass-card rounded-[22px] p-4 text-center text-sm font-bold text-slate-500">
          {words.common.noMatch}{' '}
          <button type="button" onClick={() => { onQuery(''); onRole('all') }} className="font-black text-[var(--primary)]">
            {words.common.showAll}
          </button>
        </p>
      )}
    </div>
  )
}
