'use client'

import { useQuery } from '@tanstack/react-query'
import { Eye, Mail, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { CATEGORIES, CATEGORY_KEYS, ROLES } from '@/lib/model/catalog'
import type { CategoryKey, MemberRole, MemberSettings } from '@/lib/model/types'
import { cn, initials } from '@/lib/util/cn'

const org$ = orgApi(gateway)

/** En une phrase : ce sur quoi la personne se concentre, ce qu'elle voit, ce qu'elle modifie. */
export function summaryOf(m: MemberSettings, stationNames: Map<string, string>): string {
  const role = ROLES[m.role]
  const focus = [...m.categories.map((c) => CATEGORIES[c].label.toLowerCase()), ...m.stationIds.map((s) => stationNames.get(s)).filter(Boolean)]
  return `${role.summary}${focus.length ? ` Se concentre sur : ${focus.join(', ')}.` : ' Voit tout, sans focus particulier.'}`
}

export function MembersTab() {
  const { org, updateOrg, profile, can } = useSession()
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

  const settingsFor = (m: Member): MemberSettings => org.json_data.members[m.user_id] ?? org.json_data.members[`email:${m.email.toLowerCase()}`] ?? { role: m.role === 'admin' ? 'admin' : 'author', categories: [], stationIds: [] }

  async function saveMember(key: string, value: MemberSettings) {
    const becomesWriter = value.role !== 'reader' && org.json_data.members[key]?.role === 'reader'
    if (becomesWriter && editorLimit?.reached) {
      openPaywall({ feature: 'editors', used: editorLimit.used })
      return
    }
    await updateOrg({ [`members.${key}`]: value })
    toast.success('Accès mis à jour')
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
      toast.success('Invitation envoyée', `${invite.email} recevra un courriel pour rejoindre l’usine.`)
      setInviteOpen(false)
      setInvite({ email: '', role: 'author' })
    } catch (e) {
      toast.error('L’invitation n’est pas partie', e instanceof Error && e.message === 'grant' ? 'L’accès de l’application n’a pas pu être déterminé : invitez depuis le portail de votre organisation.' : isNotAdmin(e) ? 'Seul un administrateur de l’organisation peut inviter.' : errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Membres et responsabilités</h2>
            <p className="text-sm font-medium text-slate-500">Un rôle, quelques responsabilités : c’est fini. Les opérateurs au poste n’ont pas besoin de compte.</p>
          </div>
          {canWrite && (
            <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Inviter {editorLimit?.reached && <LockBadge />}
            </Button>
          )}
        </div>
        <UsageMeter feature="editors" limit={editorLimit} className="mb-5" />
        {members.isLoading ? (
          <SkeletonRows count={3} />
        ) : members.error ? (
          isNotAdmin(members.error) ? (
            <p className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">Seul un administrateur de l’organisation voit la liste des membres.</p>
          ) : (
            <ErrorState error={members.error} onRetry={() => members.refetch()} />
          )
        ) : !members.data?.length ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title="Vous êtes seul pour l’instant" description="Invitez une collègue : elle rédigera, approuvera ou consultera selon le rôle choisi." />
        ) : (
          <ul className="space-y-2">
            {members.data.map((m) => {
              const s = settingsFor(m)
              const name = m.full_name || m.email
              return (
                <li key={m.user_id} className="glass-card flex flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center">
                  <span className="flex items-center gap-3 sm:flex-1">
                    <span className="bg-gradient-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white">{initials(name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-black">
                        {name} {m.user_id === profile.userId && <span className="text-xs text-slate-400">(vous)</span>}
                      </span>
                      <span className="block text-sm font-medium text-slate-500">{summaryOf(s, stationNames)}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => setViewAs({ name, value: s })}>
                      Voir comme
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
            {pending.map(([k, v]) => (
              <li key={k} className="flex items-center gap-3 rounded-[22px] border-2 border-dashed border-slate-200 p-3 dark:border-slate-700">
                <Mail className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-bold text-slate-500">
                  {k.slice(6)} · invitation envoyée · {ROLES[v.role].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Annuler</Button>
            <Button variant="primary" onClick={() => editing && void saveMember(editing.key, editing.value)}>
              Enregistrer
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div>
              <Label>Rôle</Label>
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
              <Label hint="Ce qu’elle voit en premier">Responsabilités</Label>
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
                  aria-label="Ajouter un poste"
                >
                  <option value="">+ Un poste dont elle est responsable…</option>
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
        title="Inviter une collègue"
        footer={
          <>
            <Button onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button variant="primary" loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(invite.email)} onClick={sendInvite}>
              Envoyer l’invitation {inviteBlocked && <LockBadge />}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="inv-email">Courriel</Label>
            <Input id="inv-email" type="email" inputMode="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="collegue@usine.com" />
          </div>
          <div>
            <Label htmlFor="inv-role">Rôle</Label>
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
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Votre plan compte {countText('editors', editorLimit.limit)}, et {editorLimit.limit > 1 ? 'les places sont prises' : 'la place est prise'} : pour l’inviter comme {ROLES[invite.role].label.toLowerCase()}, il faut un plan qui en compte plus. Comme lecteur, c’est gratuit et sans limite.
              </p>
              <Button size="sm" className="mt-3" onClick={() => setInvite({ ...invite, role: 'reader' })}>
                Inviter plutôt comme lecteur
              </Button>
            </div>
          )}
          <p className="text-xs font-medium text-slate-400">Les opérateurs n’ont pas besoin d’être invités : ils ouvrent les instructions par le code QR de leur poste.</p>
        </div>
      </Modal>

      <Modal open={!!viewAs} onClose={() => setViewAs(null)} title={`Voir comme ${viewAs?.name ?? ''}`}>
        {viewAs && (
          <div className="space-y-3 text-sm font-bold">
            <p>{summaryOf(viewAs.value, stationNames)}</p>
            <ul className="space-y-1">
              {Object.entries(ROLES[viewAs.value.role].permissions).map(([f, p]) => (
                <li key={f} className="flex justify-between rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/10">
                  <span>{{ instructions: 'Instructions', publish: 'Publier', approve: 'Approuver', stations: 'Postes', feedback: 'Retours', stats: 'Statistiques', members: 'Membres', settings: 'Réglages' }[f]}</span>
                  <span className={cn(p === 'none' ? 'text-slate-400' : p === 'read' ? 'text-sky-600' : 'text-emerald-600')}>{p === 'none' ? 'Aucun accès' : p === 'read' ? 'Lecture' : 'Modification'}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-slate-400">Les accès de CLIP s’appliquent à l’écran ; tant que l’application partage l’identifiant « html » de la Gateway, ils ne sont pas appliqués aux données côté serveur.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
