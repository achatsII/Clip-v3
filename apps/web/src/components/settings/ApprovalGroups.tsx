'use client'

import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Input } from '@/components/ui/Field'
import { errorText, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { gateway } from '@/lib/gateway/client'
import { orgApi } from '@/lib/gateway/org'
import { useMessages } from '@/lib/i18n'
import { MAX_GROUPS } from '@/lib/model/approvals'
import { uid } from '@/lib/model/repo'
import type { ApprovalGroup } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const org$ = orgApi(gateway)

/**
 * Les groupes qui signent (approbation à plusieurs) : un nom chacun, et les approbateurs ou
 * administrateurs qui signent pour lui. Un nom s'enregistre en quittant le champ ; une personne, d'un
 * toucher.
 */
export function ApprovalGroups() {
  const { org, updateOrg } = useSession()
  const t = useMessages().settings.approval
  const toast = useToast()
  const members = useQuery({ queryKey: ['members'], queryFn: () => org$.members(), retry: false })
  const saved = org.json_data.approval.groups ?? []
  const [names, setNames] = useState<Record<string, string>>({})
  // Les noms enregistrés reviennent dans les champs (une clé stable : `?? []` change à chaque rendu).
  const savedNames = JSON.stringify(saved.map((g) => [g.id, g.name]))
  useEffect(() => setNames(Object.fromEntries(JSON.parse(savedNames) as Array<[string, string]>)), [savedNames])

  // Ceux qui peuvent signer : les approbateurs et les administrateurs de CLIP.
  const settings = org.json_data.members
  const signers = (members.data ?? []).filter((m) => {
    const role = settings[m.user_id]?.role ?? settings[`email:${m.email.toLowerCase()}`]?.role ?? (m.role === 'admin' ? 'admin' : 'author')
    return role === 'admin' || role === 'approver'
  })

  async function save(groups: ApprovalGroup[]) {
    try {
      await updateOrg({ approval: { ...org.json_data.approval, groups } })
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    }
  }
  const rename = (g: ApprovalGroup) => {
    const name = (names[g.id] ?? '').trim()
    if (name && name !== g.name) void save(saved.map((x) => (x.id === g.id ? { ...x, name } : x)))
  }
  const toggle = (g: ApprovalGroup, userId: string) => void save(saved.map((x) => (x.id === g.id ? { ...x, memberIds: x.memberIds.includes(userId) ? x.memberIds.filter((u) => u !== userId) : [...x.memberIds, userId] } : x)))

  return (
    <div className="mt-5 space-y-3">
      <div>
        <h3 className="text-base font-black tracking-tight">{t.groupsTitle}</h3>
        <p className="text-sm font-medium text-slate-500">{t.groupsHint}</p>
      </div>
      {saved.map((g, i) => (
        <div key={g.id} className="glass-card rounded-[24px] p-4">
          <div className="flex items-center gap-2">
            <Input value={names[g.id] ?? g.name} onChange={(e) => setNames({ ...names, [g.id]: e.target.value })} onBlur={() => rename(g)} placeholder={t.groupPlaceholder} aria-label={t.groupName(i + 1)} wrapperClassName="flex-1" className="font-black" />
            {saved.length > 1 && (
              <button type="button" onClick={() => void save(saved.filter((x) => x.id !== g.id))} aria-label={t.removeGroup(g.name)} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="label-caps mt-3 mb-2 text-slate-500">{t.members}</p>
          {members.isLoading ? (
            <Skeleton className="h-11 w-2/3 rounded-2xl" />
          ) : members.error ? (
            <p className="text-sm font-bold text-rose-600">{t.membersFailed}</p>
          ) : !signers.length ? (
            <p className="text-sm font-bold text-slate-500">{t.noApprovers}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!g.memberIds.length && <span className="flex h-11 items-center rounded-2xl bg-slate-900/5 px-3 text-sm font-black text-slate-500 dark:bg-white/10">{t.anyApprover}</span>}
              {signers.map((m) => {
                const on = g.memberIds.includes(m.user_id)
                return (
                  <button key={m.user_id} type="button" aria-pressed={on} onClick={() => toggle(g, m.user_id)} className={cn('btn-press h-11 rounded-2xl px-3 text-sm font-black', on ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}>
                    {m.full_name || m.email}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
      {saved.length < MAX_GROUPS && (
        <button type="button" onClick={() => void save([...saved, { id: uid('grp_'), name: t.groupPlaceholder, memberIds: [] }])} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
          <Plus className="h-4 w-4" /> {t.addGroup}
        </button>
      )}
    </div>
  )
}

/** Les deux groupes de départ, quand une usine choisit « Plusieurs signatures » la première fois. */
export const defaultGroups = (names: string[]): ApprovalGroup[] => names.map((name) => ({ id: uid('grp_'), name, memberIds: [] }))
