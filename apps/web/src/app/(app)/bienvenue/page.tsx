'use client'

import { ArrowLeft, ArrowRight, Check, Factory, Lock, Sparkles, Upload, UserCheck, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CategoryIcon } from '@/components/icons'
import { useSession } from '@/components/providers/Session'
import { Button, LinkButton } from '@/components/ui/Button'
import { ChoiceTile, Input } from '@/components/ui/Field'
import { ProgressBar } from '@/components/ui/States'
import { CATEGORIES } from '@/lib/model/catalog'
import { nowIso } from '@/lib/model/repo'
import type { CategoryKey } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const GOALS: CategoryKey[] = ['production', 'maintenance', 'sst', 'qualite', 'nettoyage', 'changement']

/** Première ouverture : trois questions, une par écran, puis la première instruction. */
export default function WelcomePage() {
  const router = useRouter()
  const { org, updateOrg, profile } = useSession()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(org.json_data.name)
  const [goals, setGoals] = useState<CategoryKey[]>(org.json_data.goals)
  const [approval, setApproval] = useState(org.json_data.approval.mode)
  const [busy, setBusy] = useState(false)
  const total = 3

  async function finish() {
    setBusy(true)
    try {
      await updateOrg({
        name: name.trim() || org.json_data.name,
        goals,
        approval: { ...org.json_data.approval, mode: approval },
        [`members.${profile.userId}`]: { ...(org.json_data.members[profile.userId] ?? { stationIds: [] }), role: 'admin', categories: goals, stationIds: org.json_data.members[profile.userId]?.stationIds ?? [] },
        onboardedAt: nowIso(),
      })
      setStep(3)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center py-6">
      {step < total && (
        <div className="mb-8">
          <ProgressBar value={((step + 1) / total) * 100} label={<><span>Configuration</span><span className="tabular-nums">{step + 1} sur {total}</span></>} />
        </div>
      )}

      {step === 0 && (
        <section className="animate-slide-up">
          <Factory className="mb-4 h-12 w-12 text-[var(--primary)]" />
          <h1 className="text-4xl font-black tracking-tighter">Comment s’appelle votre usine ?</h1>
          <p className="mt-2 font-medium text-slate-500">Il apparaîtra sur les tablettes de poste et les PDF.</p>
          <Input autoFocus className="mt-6 h-16 text-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Usine Bellechasse" onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)} />
        </section>
      )}

      {step === 1 && (
        <section className="animate-slide-up">
          <h1 className="text-4xl font-black tracking-tighter">Que voulez-vous documenter en premier ?</h1>
          <p className="mt-2 font-medium text-slate-500">Choisissez-en autant que vous voulez. Votre accueil s’organise autour.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GOALS.map((g) => {
              const on = goals.includes(g)
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} className={cn('btn-press relative flex min-h-28 flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br p-4 text-left text-white', CATEGORIES[g].tile, on ? 'ring-4 ring-slate-900 dark:ring-white' : 'opacity-80')}>
                  <span className="grid-pattern absolute inset-0 opacity-50" />
                  <span className="relative flex items-center justify-between">
                    <CategoryIcon category={g} className="h-7 w-7" />
                    {on && <Check className="h-6 w-6" />}
                  </span>
                  <span className="relative text-base leading-tight font-black">{g === 'sst' ? 'SST et cadenassage' : CATEGORIES[g].label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-slide-up">
          <h1 className="text-4xl font-black tracking-tighter">Qui approuve les instructions ?</h1>
          <p className="mt-2 font-medium text-slate-500">Vous pourrez changer d’idée dans les réglages.</p>
          <div className="mt-6 grid gap-3">
            <ChoiceTile selected={approval === 'none'} onClick={() => setApproval('none')} icon={<UserCheck className="h-5 w-5" />} title="Personne : on publie directement" description="La personne qui écrit en est responsable." />
            <ChoiceTile selected={approval === 'one'} onClick={() => setApproval('one')} icon={<Users className="h-5 w-5" />} title="Un approbateur valide avant" description="Superviseur, qualité ou SST : il voit ce qui a changé et publie." />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="animate-pop-in text-center">
          <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#2EE59D] to-[#18c480] text-white shadow-[0_20px_40px_rgba(24,196,128,0.35)]">
            <Check className="h-10 w-10" strokeWidth={3} />
          </span>
          <h1 className="text-4xl font-black tracking-tighter">C’est prêt, {name.trim() || org.json_data.name} !</h1>
          <p className="mt-2 font-medium text-slate-500">Votre première instruction prend quelques minutes : filmez quelqu’un qui fait la tâche en l’expliquant.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <LinkButton href="/instructions/nouvelle" variant="primary" size="lg" icon={<Sparkles className="h-5 w-5" />}>
              Créer ma première instruction
            </LinkButton>
            <LinkButton href="/import" size="lg" icon={<Upload className="h-5 w-5" />}>
              Importer mes anciens PDF
            </LinkButton>
          </div>
          <button type="button" onClick={() => router.push('/accueil')} className="mt-6 text-sm font-black text-slate-500">
            Plus tard
          </button>
        </section>
      )}

      {step < total && (
        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>
            Retour
          </Button>
          {step < total - 1 ? (
            <Button variant="primary" size="lg" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !name.trim()} iconRight={<ArrowRight className="h-5 w-5" />}>
              Continuer
            </Button>
          ) : (
            <Button variant="primary" size="lg" loading={busy} onClick={finish} iconRight={<Check className="h-5 w-5" />}>
              Terminer
            </Button>
          )}
        </div>
      )}
      {step < total && <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400"><Lock className="h-3 w-3" /> Rien n’est publié sans vous.</p>}
    </div>
  )
}
