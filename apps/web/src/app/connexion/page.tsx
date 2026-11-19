'use client'

import { ArrowRight, Factory, Mail, QrCode, Sparkles, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { login, requestPasswordReset, signup } from '@/lib/gateway/auth'
import { rememberSignup } from '@/lib/brand/orgBrand'
import { hasSession } from '@/lib/gateway/client'
import { parsePlanIntent, savePlanIntent, subscriptionPathFor } from '@/lib/billing/intent'
import { BILLING_V2, SELF_SERVICE } from '@/lib/config'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { setLang, useLang, useMessages } from '@/lib/i18n'
import { isLang } from '@/lib/i18n/core'
import { PRIVACY_URL } from '@/lib/billing/store'
import { useToggle } from '@/lib/toggles'
import { inNativeShell } from '@/lib/bridge/native'

type Mode = 'login' | 'signup' | 'forgot'

const noSubscribe = () => () => {}

export default function ConnexionPage() {
  const router = useRouter()
  const t = useMessages().auth.login
  const lang = useLang()
  const aiAtSignIn = useToggle('aiConsentAtSignIn')
  // Dans l'app des magasins, rien ne parle de gratuit ni de carte : on n'y vend rien (règles d'Apple et de Google).
  // Lu après l'hydratation : la page rendue au serveur ne sait pas qu'elle sera dans la coquille.
  const inApp = useSyncExternalStore(noSubscribe, inNativeShell, () => false)
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullname, setFullname] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Venu du site : la langue de la page qu'on quittait (`?lang=nl`), pas la dernière de cet appareil.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('lang')
    if (isLang(asked)) setLang(asked)
  }, [])

  useEffect(() => {
    if (!hasSession()) return
    // Déjà connecté, venu du site avec un forfait : la page Abonnement, ce forfait présélectionné.
    const intent = BILLING_V2 ? parsePlanIntent(window.location.search) : null
    router.replace(intent ? subscriptionPathFor(intent) : '/accueil')
  }, [router])

  // Venu du site : `?inscription=1` ouvre la création de compte (libre-service seulement), et le forfait
  // choisi (`plan`, `interval`, validés contre le manifeste) se garde jusqu'à la page Abonnement.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (!SELF_SERVICE || q.get('inscription') !== '1') return
    setMode('signup')
    const intent = parsePlanIntent(q)
    if (intent) savePlanIntent(intent)
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t.errors.email)
    if (mode !== 'forgot' && password.length < (mode === 'signup' ? 8 : 1)) {
      return setError(mode === 'signup' ? t.errors.passwordTooShort : t.errors.passwordMissing)
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        router.replace('/accueil')
      } else if (mode === 'signup') {
        await signup({ email, password, fullname: fullname || undefined, company: company || undefined })
        // L'entreprise qui se crée appartient à cette marque (une marque par entreprise).
        rememberSignup()
        router.replace('/bienvenue')
      } else {
        await requestPasswordReset(email)
        setSent(true)
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-10">
      <section className="hidden lg:block">
        <Logo subtitle={t.tagline} />
        <h1 className="mt-10 text-6xl leading-[0.95] font-black tracking-tighter text-slate-900 dark:text-white">
          {t.hero.film}
          <br />
          {t.hero.aiWrites}
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">{t.hero.floorFollows}</span>
        </h1>
        <p className="mt-6 max-w-md text-lg font-medium text-slate-600 dark:text-slate-300">
          {t.hero.pitch}
        </p>
        <ul className="mt-10 grid max-w-lg gap-3">
          {[
            { icon: <Video className="h-5 w-5" />, text: t.hero.inputs },
            { icon: <Sparkles className="h-5 w-5" />, text: t.hero.generated },
            { icon: <QrCode className="h-5 w-5" />, text: t.hero.qrAndTablet },
          ].map((f) => (
            <li key={f.text} className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold text-slate-700 dark:text-slate-200">
              <span className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-white">{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel animate-pop-in mx-auto w-full max-w-md rounded-[40px] p-7 sm:p-10">
        <div className="mb-8 lg:hidden">
          <Logo subtitle={t.tagline} />
        </div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{t.titles[mode]}</h2>
        {!(inApp && mode === 'signup') && (
          <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
            {t.intros[mode]}
          </p>
        )}

        {sent ? (
          <div className="mt-8 rounded-3xl bg-emerald-50 p-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Mail className="mb-2 h-6 w-6" />
            <p className="font-black">{t.sent.title}</p>
            <p className="text-sm font-medium">{t.sent.body(email)}</p>
            <Button className="mt-4" onClick={() => { setMode('login'); setSent(false) }}>
              {t.sent.back}
            </Button>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="fullname">{t.fullname}</Label>
                  <Input id="fullname" autoComplete="name" value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder={t.fullnamePlaceholder} />
                </div>
                <div>
                  <Label htmlFor="company" hint={t.optional}>{t.company}</Label>
                  <Input id="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.companyPlaceholder} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
            </div>
            {mode !== 'forgot' && (
              <div>
                <Label
                  htmlFor="password"
                  hint={
                    mode === 'login' ? (
                      <button type="button" className="font-bold text-[var(--primary)]" onClick={() => { setMode('forgot'); setError(null) }}>
                        {t.forgotLink}
                      </button>
                    ) : undefined
                  }
                >
                  {t.password}
                </Label>
                <Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            <FieldError>{error}</FieldError>
            <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight={<ArrowRight className="h-5 w-5" />}>
              {t.submit[mode]}
            </Button>
            {/* L'accord pour l'IA se donne ici, une fois, plutôt que par une fenêtre au premier usage. */}
            {aiAtSignIn && mode !== 'forgot' && (
              <p className="text-center text-xs leading-relaxed font-medium text-slate-500 dark:text-slate-400">
                {t.aiNotice[mode]}{' '}
                <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="font-black text-[var(--primary)] underline-offset-4 hover:underline">
                  {t.privacy}
                </a>
              </p>
            )}
          </form>
        )}

        <div className="mt-8 border-t border-slate-900/5 pt-6 text-center text-sm font-medium text-slate-500 dark:border-white/5 dark:text-slate-400">
          {mode === 'login' ? (
            SELF_SERVICE ? (
              <>
                {t.newHere}{' '}
                <button type="button" className="font-black text-[var(--primary)]" onClick={() => { setMode('signup'); setError(null) }}>
                  {inApp ? t.submit.signup : t.createFreeAccount}
                </button>
              </>
            ) : (
              <span className="flex items-start justify-center gap-2 text-left">
                <Factory className="mt-0.5 h-4 w-4 shrink-0" /> {t.askForInvitation}
              </span>
            )
          ) : (
            <button type="button" className="font-black text-[var(--primary)]" onClick={() => { setMode('login'); setError(null) }}>
              {t.haveAccount}
            </button>
          )}
        </div>

        {/* La langue, avant même d'avoir un compte : chaque langue s'écrit dans sa propre langue. */}
        <div className="mt-4 flex justify-center">
          <LanguageSelect compact value={lang} onChange={setLang} label={t.language} />
        </div>
      </section>
    </main>
  )
}
