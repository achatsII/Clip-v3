'use client'

import { ArrowRight, Factory, Mail, QrCode, Sparkles, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { login, requestPasswordReset, signup } from '@/lib/gateway/auth'
import { hasSession } from '@/lib/gateway/client'
import { SELF_SERVICE } from '@/lib/config'

type Mode = 'login' | 'signup' | 'forgot'

export default function ConnexionPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullname, setFullname] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (hasSession()) router.replace('/accueil')
  }, [router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Entrez un courriel valide.')
    if (mode !== 'forgot' && password.length < (mode === 'signup' ? 8 : 1)) {
      return setError(mode === 'signup' ? 'Le mot de passe doit avoir au moins 8 caractères.' : 'Entrez votre mot de passe.')
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        router.replace('/accueil')
      } else if (mode === 'signup') {
        await signup({ email, password, fullname: fullname || undefined, company: company || undefined })
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

  const titles: Record<Mode, string> = {
    login: 'Bon retour',
    signup: 'Créez votre compte',
    forgot: 'Mot de passe oublié',
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-10">
      <section className="hidden lg:block">
        <Logo subtitle="Instructions de travail" />
        <h1 className="mt-10 text-6xl leading-[0.95] font-black tracking-tighter text-slate-900 dark:text-white">
          Filmez.
          <br />
          L’IA rédige.
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">Le plancher suit.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg font-medium text-slate-600 dark:text-slate-300">
          Une instruction de travail claire et visuelle en quelques minutes, trouvée au bon poste par chaque opérateur, sans compte.
        </p>
        <ul className="mt-10 grid max-w-lg gap-3">
          {[
            { icon: <Video className="h-5 w-5" />, text: 'Vidéos, photos, notes vocales ou vieux PDF' },
            { icon: <Sparkles className="h-5 w-5" />, text: 'Étapes, extraits vidéo et mises en garde générés' },
            { icon: <QrCode className="h-5 w-5" />, text: 'Code QR et tablette de poste, sans compte' },
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
          <Logo subtitle="Instructions de travail" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{titles[mode]}</h2>
        <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
          {mode === 'login' && 'Connectez-vous pour créer et gérer vos instructions.'}
          {mode === 'signup' && 'Gratuit pour commencer. Aucune carte requise.'}
          {mode === 'forgot' && 'Nous vous envoyons un lien pour choisir un nouveau mot de passe.'}
        </p>

        {sent ? (
          <div className="mt-8 rounded-3xl bg-emerald-50 p-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Mail className="mb-2 h-6 w-6" />
            <p className="font-black">Courriel envoyé</p>
            <p className="text-sm font-medium">Si un compte existe pour {email}, vous recevrez un lien dans quelques minutes.</p>
            <Button className="mt-4" onClick={() => { setMode('login'); setSent(false) }}>
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="fullname">Votre nom</Label>
                  <Input id="fullname" autoComplete="name" value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="Mélanie Tremblay" />
                </div>
                <div>
                  <Label htmlFor="company" hint="facultatif">Usine ou entreprise</Label>
                  <Input id="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Usine Bellechasse" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Courriel</Label>
              <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@usine.com" />
            </div>
            {mode !== 'forgot' && (
              <div>
                <Label
                  htmlFor="password"
                  hint={
                    mode === 'login' ? (
                      <button type="button" className="font-bold text-[var(--primary)]" onClick={() => { setMode('forgot'); setError(null) }}>
                        Oublié ?
                      </button>
                    ) : undefined
                  }
                >
                  Mot de passe
                </Label>
                <Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            <FieldError>{error}</FieldError>
            <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight={<ArrowRight className="h-5 w-5" />}>
              {mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
            </Button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-900/5 pt-6 text-center text-sm font-medium text-slate-500 dark:border-white/5 dark:text-slate-400">
          {mode === 'login' ? (
            SELF_SERVICE ? (
              <>
                Nouveau ?{' '}
                <button type="button" className="font-black text-[var(--primary)]" onClick={() => { setMode('signup'); setError(null) }}>
                  Créer un compte gratuit
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Factory className="h-4 w-4" /> Pas encore de compte ? Demandez une invitation à votre administrateur.
              </span>
            )
          ) : (
            <button type="button" className="font-black text-[var(--primary)]" onClick={() => { setMode('login'); setError(null) }}>
              J’ai déjà un compte
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
