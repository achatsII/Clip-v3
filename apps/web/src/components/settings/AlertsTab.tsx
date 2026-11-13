'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Send } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Field'
import { errorText, Skeleton } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { gateway, getAccessToken } from '@/lib/gateway/client'
import { orgApi } from '@/lib/gateway/org'
import { useLang, useMessages } from '@/lib/i18n'
import { addPushToken, ensureContact, notifyEvent, setContactPrefs } from '@/lib/notify'
import { cn, formatDate } from '@/lib/util/cn'

const org$ = orgApi(gateway)
/** Le téléphone de cet appareil, une fois enregistré (pour savoir si l'interrupteur est allumé ici). */
const PHONE_KEY = 'clip_push_token'
const readPhone = () => {
  try {
    return localStorage.getItem(PHONE_KEY)
  } catch {
    return null
  }
}

/**
 * Réglages › Avertissements. Pour chacun : par courriel, sur ce téléphone, et un essai. Pour un
 * administrateur : activer les avertissements de l'usine (le serveur crée alors son lien de
 * service), ce qui avertit, et qui est averti d'un danger ou d'un écart.
 */
export function AlertsTab() {
  const { data, profile, displayName, org, can } = useSession()
  const t = useMessages().settings.alerts
  const lang = useLang()
  const toast = useToast()
  const qc = useQueryClient()
  const contact = useQuery({ queryKey: ['contact', profile.userId, lang], queryFn: () => ensureContact(data, { userId: profile.userId, name: displayName, email: profile.email }, lang) })
  const [phone, setPhone] = useState(readPhone)
  const [busy, setBusy] = useState<string | null>(null)
  const n = org.json_data.notify
  const canPush = hasCapability('push.register')
  const c = contact.data?.json_data

  async function prefs(p: { emails?: boolean; push?: boolean }) {
    if (!contact.data) return
    await setContactPrefs(data, contact.data._id, p).catch((e) => toast.error(t.failed, errorText(e)))
    void qc.invalidateQueries({ queryKey: ['contact', profile.userId] })
  }

  async function phoneOn(on: boolean) {
    if (!contact.data) return
    if (!on) return prefs({ push: false })
    setBusy('phone')
    try {
      const r = await callNative('push.register', {})
      await addPushToken(data, contact.data, r.token, r.platform)
      try {
        localStorage.setItem(PHONE_KEY, r.token)
      } catch {
        /* l'interrupteur se relira de la fiche */
      }
      setPhone(r.token)
      toast.success(t.phoneOn)
      void qc.invalidateQueries({ queryKey: ['contact', profile.userId] })
    } catch (e) {
      toast.error(t.phoneDenied, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  async function test() {
    setBusy('test')
    const r = await notifyEvent({ kind: 'test' })
    setBusy(null)
    if (r && (r.emails || r.pushes)) toast.success(t.testSent(r.emails ?? 0, r.pushes ?? 0))
    else toast.error(t.testNone)
  }

  const phoneRegistered = !!phone && !!c?.pushTokens?.some((p) => p.token === phone) && c.push !== false

  return (
    <div className="grid max-w-3xl gap-5">
      <Panel>
        <h2 className="mb-1 text-xl font-black tracking-tight">{t.mineTitle}</h2>
        <p className="mb-4 text-sm font-medium text-slate-500">{t.mineIntro}</p>
        {contact.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <div className="divide-y divide-slate-900/5 dark:divide-white/5">
            <div className="pb-4">
              <Switch checked={!!c?.email && c.emails !== false} disabled={!c?.email} onChange={(v) => void prefs({ emails: v })} label={t.byEmail} description={c?.email ? t.byEmailHint(c.email) : t.noEmail} />
            </div>
            <div className="pt-4">
              {canPush ? <Switch checked={phoneRegistered} disabled={busy === 'phone'} onChange={(v) => void phoneOn(v)} label={t.onPhone} description={t.onPhoneHint} /> : <p className="text-sm font-bold text-slate-500">{t.phoneHint}</p>}
            </div>
          </div>
        )}
        {n?.on && (
          <Button className="mt-5" loading={busy === 'test'} onClick={() => void test()} icon={<Send className="h-4 w-4" />}>
            {t.test}
          </Button>
        )}
      </Panel>
      {can('settings', 'write') && <PlantAlerts />}
    </div>
  )
}

/** Ce que l'usine fait avertir, et qui (administrateur). */
function PlantAlerts() {
  const { org, updateOrg, refreshOrg } = useSession()
  const t = useMessages().settings.alerts
  const toast = useToast()
  const members = useQuery({ queryKey: ['members'], queryFn: () => org$.members(), retry: false })
  const [busy, setBusy] = useState(false)
  const n = org.json_data.notify

  async function turnOn() {
    setBusy(true)
    try {
      const res = await fetch('/api/notify/setup', { method: 'POST', headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } }).catch(() => null)
      const json = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: keyof typeof t.errors }
      if (!res) throw new Error(t.errors.network)
      if (!json.ok) throw new Error(t.errors[json.error ?? 'saveFailed'] ?? t.errors.saveFailed)
      await refreshOrg()
      toast.success(t.enabled)
    } catch (e) {
      toast.error(t.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const set = (patch: Partial<NonNullable<typeof n>>) => {
    if (!n) return
    void updateOrg({ notify: { ...n, ...patch } }).catch((e) => toast.error(t.failed, errorText(e)))
  }
  const recipients = n?.recipients ?? []

  return (
    <Panel>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black tracking-tight">
        <BellRing className="h-5 w-5 text-[var(--primary)]" /> {t.plantTitle}
      </h2>
      <Switch
        checked={!!n?.on}
        disabled={busy}
        onChange={(v) => {
          if (v && !n?.sealed) void turnOn()
          else if (v) set({ on: true })
          else {
            set({ on: false })
            toast.success(t.disabled)
          }
        }}
        label={t.on}
        description={t.onHint}
      />
      {n?.on && (
        <>
          <p className={cn('mt-3 rounded-2xl px-4 py-2.5 text-sm font-bold', n.email ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100')}>
            {n.email ? t.emailReady : t.emailMissing} {n.setByName && n.setAt ? t.setBy(n.setByName, formatDate(n.setAt)) : ''}
          </p>
          <div className="mt-5 space-y-4">
            <Switch checked={n.danger} onChange={(v) => set({ danger: v })} label={t.danger} />
            <Switch checked={n.deviation} onChange={(v) => set({ deviation: v })} label={t.deviation} />
          </div>
          <p className="label-caps mt-6 mb-2 text-slate-500">{t.recipients}</p>
          {members.isLoading ? (
            <Skeleton className="h-11 w-2/3 rounded-2xl" />
          ) : members.error ? (
            <p className="text-sm font-bold text-rose-600">{t.membersFailed}</p>
          ) : (
            <>
              {!recipients.length && <p className="mb-2 text-sm font-bold text-amber-700 dark:text-amber-300">{t.nobody}</p>}
              <div className="flex flex-wrap gap-2">
                {(members.data ?? []).map((m) => {
                  const on = recipients.includes(m.user_id)
                  return (
                    <button key={m.user_id} type="button" aria-pressed={on} onClick={() => set({ recipients: on ? recipients.filter((x) => x !== m.user_id) : [...recipients, m.user_id] })} className={cn('btn-press h-11 rounded-2xl px-3 text-sm font-black', on ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}>
                      {m.full_name || m.email}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  )
}
