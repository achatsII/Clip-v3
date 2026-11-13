'use client'

import { Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { consentDate, saveConsent, setAiGate } from '@/lib/ai/consent'
import { PRIVACY_URL } from '@/lib/billing/store'
import { deleteAccount } from '@/lib/gateway/auth'
import { logout } from '@/lib/gateway/client'
import { useMessages } from '@/lib/i18n'
import { useToggle } from '@/lib/toggles'
import { formatDate } from '@/lib/util/cn'

/**
 * La fenêtre de l'accord avant le premier envoi à l'IA (toggle `aiConsent`). Elle se branche sur le
 * client de l'IA : le premier appel l'ouvre et attend la réponse ; plusieurs appels à la fois
 * attendent la même réponse. Refusé, l'appel ne part pas.
 */
export function AiConsentHost() {
  const t = useMessages().shell.aiConsent
  const { profile } = useSession()
  const on = useToggle('aiConsent')
  const [open, setOpen] = useState(false)
  const pending = useRef<{ promise: Promise<boolean>; resolve: (ok: boolean) => void } | null>(null)

  const ask = useCallback(async () => {
    if (!on || consentDate(profile.userId)) return true
    if (!pending.current) {
      let resolve!: (ok: boolean) => void
      const promise = new Promise<boolean>((r) => (resolve = r))
      pending.current = { promise, resolve }
      setOpen(true)
    }
    return pending.current.promise
  }, [on, profile.userId])

  useEffect(() => {
    setAiGate(ask)
    return () => setAiGate(null)
  }, [ask])

  const answer = (ok: boolean) => {
    if (ok) saveConsent(profile.userId, new Date().toISOString())
    setOpen(false)
    pending.current?.resolve(ok)
    pending.current = null
  }

  return (
    <Modal
      open={open}
      onClose={() => answer(false)}
      title={t.title}
      footer={
        <>
          <Button onClick={() => answer(false)}>{t.refuse}</Button>
          <Button variant="primary" data-autofocus onClick={() => answer(true)} icon={<Sparkles className="h-4 w-4" />}>
            {t.accept}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed font-bold text-slate-700 dark:text-slate-200">{t.body}</p>
      <p className="mt-3 text-sm font-medium text-slate-500">{t.more}</p>
      <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-[var(--primary)] underline-offset-4 hover:underline">
        {t.privacy}
      </a>
    </Modal>
  )
}

/** Réglages › Données : l'accord pour l'IA (le retirer), et supprimer son compte. */
export function AccountCard() {
  const t = useMessages().settings.account
  const { profile } = useSession()
  const toast = useToast()
  const consentOn = useToggle('aiConsent')
  const deleteOn = useToggle('deleteAccount')
  const [given, setGiven] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => setGiven(consentDate(profile.userId)), [profile.userId])
  if (!consentOn && !deleteOn) return null
  return (
    <section className="glass-panel rounded-[32px] p-6">
      <h2 className="mb-3 text-xl font-black tracking-tight">{t.title}</h2>
      {consentOn && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm font-bold text-slate-600 dark:text-slate-300">{given ? t.aiOn(formatDate(given)) : t.aiOff}</p>
          {given && (
            <Button
              size="sm"
              onClick={() => {
                saveConsent(profile.userId, null)
                setGiven(null)
                toast.success(t.withdrawn, t.withdrawnHint)
              }}
            >
              {t.withdraw}
            </Button>
          )}
        </div>
      )}
      {deleteOn && (
        <button type="button" onClick={() => setDeleting(true)} className="btn-press mt-4 flex min-h-11 items-center gap-2 rounded-2xl px-2 text-sm font-black text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
          <Trash2 className="h-4 w-4" /> {t.delete}
        </button>
      )}
      <DeleteAccountDialog open={deleting} onClose={() => setDeleting(false)} />
    </section>
  )
}

/** Supprimer son compte, pour de bon : on écrit son courriel pour confirmer. */
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMessages()
  const t = m.settings.account
  const { profile } = useSession()
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setTyped('')
  }, [open])
  const matches = typed.trim().toLowerCase() === profile.email.trim().toLowerCase()

  async function remove() {
    setBusy(true)
    try {
      await deleteAccount()
      // Le jeton est déjà révoqué : on vide tout et on revient à l'écran public.
      logout()
    } catch (e) {
      toast.error(t.failed, errorText(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.deleteTitle}
      footer={
        <>
          <Button onClick={onClose}>{m.common.cancel}</Button>
          <Button variant="danger" disabled={!matches} loading={busy} onClick={() => void remove()} icon={<Trash2 className="h-4 w-4" />}>
            {t.confirm}
          </Button>
        </>
      }
    >
      <p className="font-bold text-slate-700 dark:text-slate-200">{t.deleteBody}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{t.lastAdmin}</p>
      <label className="mt-4 block text-sm font-black text-slate-700 dark:text-slate-200" htmlFor="delete-email">
        {t.confirmLabel}
      </label>
      <Input id="delete-email" data-own-undo="" dictation={false} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={profile.email} className="mt-1.5 h-12" />
    </Modal>
  )
}
