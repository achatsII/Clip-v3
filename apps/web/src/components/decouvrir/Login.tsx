'use client'

/**
 * L'entrée de l'espace Découvrir relié à Sandboxes (INTEGRATION.md de Sandboxes, §2) : le courriel
 * (prérempli par `?courriel=`, le curseur va alors au mot de passe), le mot de passe, une seule action
 * « Entrer », et l'annonce du suivi. Le message d'un accès fermé arrive par `?raison=` (et `?fin=`). Pas de
 * création de compte ni de mot de passe oublié propres à l'espace : les comptes se créent ailleurs.
 */
import { AlertTriangle, ArrowRight, Eye, Info, MonitorPlay } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LogoMark } from '@/components/Logo'
import { Button, LinkButton } from '@/components/ui/Button'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { useAccessSetup } from '@/lib/decouvrir/access'
import { LIBRARY_PATH, LOGIN_PATH } from '@/lib/decouvrir/catalog'
import { isCloseReason, type CloseReason } from '@/lib/decouvrir/contract'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/** La suite après l'entrée : un chemin de Clip, jamais un autre site ni l'écran d'entrée. */
function safeSuite(p: string | null): string {
  return p && p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') && !p.startsWith(LOGIN_PATH) ? p : LIBRARY_PATH
}

type Notice = { tone: 'warning' | 'info' | 'danger'; reason: CloseReason | 'indisponible' | 'reseau'; fin?: number | null }

export function DecouvrirLogin() {
  const setup = useAccessSetup()
  const t = useMessages().decouvrir
  const sp = useSearchParams()
  const raison = sp.get('raison')
  const [email, setEmail] = useState(() => sp.get('courriel') ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(() => (isCloseReason(raison) ? { tone: raison === 'session' ? 'info' : 'warning', reason: raison, fin: Number(sp.get('fin')) || null } : null))
  const [fieldError, setFieldError] = useState<'identifiants' | 'requis' | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // Le courriel vient du lien « Ouvrir l'espace » de Sandboxes : il ne reste que le mot de passe.
  useEffect(() => {
    const field = sp.get('courriel') ? passwordRef : emailRef
    field.current?.focus()
  }, [sp])

  if (setup.mode !== 'sandboxes') {
    return (
      <div className="mx-auto grid max-w-md place-items-center pt-6 pb-10 sm:pt-12">
        <div className="glass-panel w-full rounded-[40px] p-8 text-center">
          <LogoMark className="mx-auto mb-5 h-14 w-14" />
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t.login.openTitle}</h1>
          <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">{t.login.openText}</p>
          <LinkButton href={LIBRARY_PATH} variant="primary" className="mt-6" icon={<MonitorPlay className="h-5 w-5" />}>
            {t.login.goVideos}
          </LinkButton>
        </div>
      </div>
    )
  }

  const message = (n: Notice) =>
    n.reason === 'aucun_acces' ? t.access.noAccess : n.reason === 'expire' ? t.access.ended(n.fin ?? null) : n.reason === 'session' ? t.access.session : n.reason === 'reseau' ? t.login.network : t.access.unavailable

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!email.trim() || !password) {
      setFieldError('requis')
      return
    }
    setLoading(true)
    setFieldError(null)
    try {
      const res = await fetch('/api/decouvrir/entrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courriel: email.trim(), motDePasse: password }),
        cache: 'no-store',
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; raison?: string; fin?: number }
      if (res.ok && body.ok) {
        window.location.assign(safeSuite(sp.get('suite')))
        return
      }
      if (body.raison === 'identifiants') {
        setFieldError('identifiants')
        setNotice(null)
        passwordRef.current?.select()
      } else if (body.raison === 'aucun_acces' || body.raison === 'expire') {
        setNotice({ tone: 'warning', reason: body.raison, fin: typeof body.fin === 'number' ? body.fin : null })
      } else {
        setNotice({ tone: 'danger', reason: 'indisponible' })
      }
    } catch {
      setNotice({ tone: 'danger', reason: 'reseau' })
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto grid max-w-md place-items-center pt-2 pb-10 sm:pt-8">
      <form onSubmit={submit} noValidate className="glass-panel animate-pop-in w-full space-y-5 rounded-[40px] p-7 sm:p-10">
        <div>
          <p className="label-caps text-[var(--primary)]">{t.login.eyebrow}</p>
          <h1 className="mt-2 text-3xl leading-tight font-black tracking-tighter text-slate-900 dark:text-white">{t.login.title}</h1>
          <p className="mt-1.5 font-medium text-slate-500 dark:text-slate-400">{t.login.subtitle}</p>
        </div>
        {notice && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold',
              notice.tone === 'warning' && 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
              notice.tone === 'info' && 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-200',
              notice.tone === 'danger' && 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
            )}
          >
            {notice.tone === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span>{message(notice)}</span>
          </div>
        )}
        <div>
          <Label htmlFor="decouvrir-courriel">{t.login.email}</Label>
          <Input
            ref={emailRef}
            id="decouvrir-courriel"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="decouvrir-courriel-aide"
          />
          <p id="decouvrir-courriel-aide" className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {setup.clients ? t.login.emailHintClients : t.login.emailHint}
          </p>
        </div>
        <div>
          <Label htmlFor="decouvrir-mot-de-passe">{t.login.password}</Label>
          <Input
            ref={passwordRef}
            id="decouvrir-mot-de-passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={fieldError === 'identifiants'}
            aria-invalid={fieldError === 'identifiants' || undefined}
          />
          <FieldError>{fieldError === 'identifiants' ? t.access.wrongCredentials : fieldError === 'requis' ? t.login.required : null}</FieldError>
        </div>
        <Button type="submit" variant="primary" size="lg" block loading={loading} iconRight={<ArrowRight className="h-5 w-5" />}>
          {t.login.submit}
        </Button>
        <p className="flex items-start gap-2 text-[13px] leading-snug font-semibold text-slate-500 dark:text-slate-400">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t.login.notice}
        </p>
      </form>
    </div>
  )
}
