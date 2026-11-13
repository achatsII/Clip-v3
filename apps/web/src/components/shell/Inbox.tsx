'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell, ClipboardCheck, MessageSquare, ShieldAlert, Stamp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/States'
import { useFeedback, useInboxInstructions } from '@/hooks/queries'
import { ensureContact } from '@/lib/notify'
import { useLang, useMessages } from '@/lib/i18n'
import { signingGroups } from '@/lib/model/approvals'
import { listExecutions } from '@/lib/model/executions'
import { buildInbox, unseenCount, type InboxItem, type InboxKind } from '@/lib/model/inbox'
import { useToggle } from '@/lib/toggles'
import { cn, timeAgo } from '@/lib/util/cn'

const ICONS: Record<InboxKind, ReactNode> = {
  review: <Stamp className="h-5 w-5" />,
  changes: <MessageSquare className="h-5 w-5" />,
  danger: <ShieldAlert className="h-5 w-5" />,
  deviation: <ClipboardCheck className="h-5 w-5" />,
}
const TONES: Record<InboxKind, string> = {
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  changes: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  deviation: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
}

/** Ce qui a été vu, par personne et par appareil : sans visite, la dernière semaine compte. */
const seenKey = (userId: string) => `clip_inbox_seen_${userId}`
function readSeen(userId: string): string {
  try {
    return localStorage.getItem(seenKey(userId)) ?? new Date(Date.now() - 7 * 86400_000).toISOString()
  } catch {
    return new Date(Date.now() - 7 * 86400_000).toISOString()
  }
}

/** Les éléments « À voir » de la personne, et ce qui est nouveau depuis sa dernière visite. */
export function useInbox() {
  const { profile, org, can, data } = useSession()
  const on = useToggle('notify')
  const recordsOn = useToggle('records')
  const multiOn = useToggle('multiApproval')
  // Seulement ce que « À voir » regarde : à approuver, et mes instructions où l'on demande des changements.
  const instructions = useInboxInstructions(on)
  const canFeedback = can('feedback', 'write')
  const feedback = useFeedback({ 'json_data.status': { $eq: 'new' }, 'json_data.kind': { $eq: 'danger' } }, ['feedback', 'danger-new'])
  const since = useMemo(() => new Date(Date.now() - 14 * 86400_000).toISOString(), [])
  const executions = useQuery({
    queryKey: ['executions-inbox'],
    queryFn: () => listExecutions(data, { deviations: true, since, limit: 50 }),
    enabled: on && recordsOn && canFeedback,
    refetchInterval: 120_000,
  })
  const [seenAt, setSeenAt] = useState(() => readSeen(profile.userId))
  const items = useMemo(
    () =>
      on
        ? buildInbox({
            userId: profile.userId,
            instructions: instructions.data ?? [],
            feedback: canFeedback ? (feedback.data ?? []) : [],
            executions: executions.data ?? [],
            groups: signingGroups(org.json_data, multiOn),
            can: { approve: can('approve', 'write'), feedback: canFeedback },
          })
        : [],
    [on, profile.userId, instructions.data, feedback.data, executions.data, org.json_data, multiOn, can, canFeedback],
  )
  const markSeen = () => {
    const now = new Date().toISOString()
    setSeenAt(now)
    try {
      localStorage.setItem(seenKey(profile.userId), now)
    } catch {
      /* vu pour cette visite */
    }
  }
  return { on, items, seenAt, unseen: unseenCount(items, seenAt), markSeen }
}

/**
 * La cloche « À voir » : un chiffre quand quelque chose de nouveau attend, et la liste d'un toucher.
 * L'ouvrir marque tout comme vu ; ce qui était nouveau le reste pendant qu'elle est ouverte.
 */
export function InboxButton({ className }: { className?: string }) {
  const t = useMessages().inbox
  const router = useRouter()
  const { on, items, seenAt, unseen, markSeen } = useInbox()
  const [open, setOpen] = useState(false)
  // Le seuil de « nouveau » pendant que la liste est ouverte : celui d'avant l'ouverture.
  const [shownSince, setShownSince] = useState(seenAt)
  useEffect(() => {
    if (open) markSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!on) return null
  const go = (item: InboxItem) => {
    setOpen(false)
    router.push(item.href)
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShownSince(seenAt)
          setOpen(true)
        }}
        aria-label={t.open(unseen)}
        title={t.open(unseen)}
        className={cn('btn-press relative flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10', className)}
      >
        <Bell className="h-5 w-5" />
        {unseen > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-black text-white tabular-nums">{unseen > 9 ? '9+' : unseen}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.title} size="md">
        {!items.length ? (
          <EmptyState icon={<Bell className="h-7 w-7" />} title={t.empty} description={t.emptyHint} />
        ) : (
          <ul className="space-y-1.5">
            {items.slice(0, 40).map((item) => {
              const fresh = item.at > shownSince
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => go(item)} className={cn('btn-press flex w-full items-start gap-3 rounded-2xl p-3 text-left', fresh ? 'bg-primary-soft' : 'hover:bg-slate-900/5 dark:hover:bg-white/5')}>
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[item.kind])}>{ICONS[item.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-xs font-black tracking-wide text-slate-500 uppercase">
                        {t.kinds[item.kind]}
                        {fresh && <span className="rounded-md bg-[var(--primary)] px-1.5 py-0.5 text-[10px] text-white">{t.isNew}</span>}
                      </span>
                      <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{item.title}</span>
                      <span className="block truncate text-sm font-bold text-slate-500">{[item.text, item.who ? t.by(item.who) : null, timeAgo(item.at)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
    </>
  )
}

/**
 * La fiche de contact de la personne (courriel, langue) : créée à sa première visite, mise à jour
 * quand son nom, son courriel ou sa langue changent. Sans elle, personne ne peut l'avertir.
 */
export function ContactSync() {
  const { data, profile, displayName } = useSession()
  const on = useToggle('notify')
  const lang = useLang()
  useEffect(() => {
    if (on) void ensureContact(data, { userId: profile.userId, name: displayName, email: profile.email }, lang).catch(() => undefined)
  }, [on, data, profile.userId, displayName, profile.email, lang])
  return null
}
