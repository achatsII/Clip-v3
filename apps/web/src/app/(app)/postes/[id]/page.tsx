'use client'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, ExternalLink, Lock, Mic, QrCode, RefreshCw, Tablet, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { InstructionRow } from '@/components/InstructionCard'
import { QrCode as Qr } from '@/components/QrCode'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { ChoiceTile, Input, Label, Switch } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton, errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useInstructions, useStations } from '@/hooks/queries'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { nowIso, T } from '@/lib/model/repo'
import type { Station } from '@/lib/model/types'
import { copyText, createShareLink, linkUrl } from '@/lib/share'
import { useToggle } from '@/lib/toggles'
import { formatDate } from '@/lib/util/cn'

export default function StationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, can } = useSession()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const stations = useStations()
  const instructions = useInstructions()
  const voiceToggle = useToggle('voiceAssistant')
  const voice = useEntitlement('voice_assistant')
  const gate = useGate()
  const [busy, setBusy] = useState(false)
  const [assistant, setAssistant] = useState(false)
  const station = stations.data?.find((s) => s._id === id)
  const canWrite = can('stations', 'write')

  if (stations.isLoading) return <Skeleton className="h-96" />
  if (stations.error) return <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
  if (!station) return <EmptyState icon={<QrCode className="h-7 w-7" />} title="Poste introuvable" action={<Link href="/postes" className="font-black text-[var(--primary)]">Tous les postes</Link>} />

  const s = station.json_data
  const url = s.linkId ? linkUrl('station', s.linkId) : null
  const linked = (instructions.data ?? []).filter((d) => d.json_data.stationIds.includes(id))

  async function patch(p: Partial<Station>) {
    await data.patch(T.station, id, p as Record<string, unknown>)
    await qc.invalidateQueries({ queryKey: qk.stations })
  }

  async function makeLink(mode: 'focus' | 'only', withAssistant: boolean) {
    setBusy(true)
    try {
      const link = await createShareLink('station', id, { mode, assistant: withAssistant })
      await patch({ linkId: link.id, linkMode: mode, linkCreatedAt: nowIso() })
      toast.success(s.linkId ? 'Nouveau code QR créé' : 'Code QR créé', s.linkId ? 'L’ancien code ne fonctionne plus dans CLIP. Remplacez les étiquettes.' : 'Imprimez-le, ou ouvrez le mode tablette.')
    } catch (e) {
      toast.error('Le code QR n’a pas pu être créé', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/postes" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Postes
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps text-slate-500">{s.area || 'Poste'}</p>
          <input
            defaultValue={s.name}
            readOnly={!canWrite}
            onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && void patch({ name: e.target.value.trim() })}
            className="w-full bg-transparent text-4xl font-black tracking-tighter focus:outline-none"
            aria-label="Nom du poste"
          />
          {s.code && <p className="text-lg font-black text-slate-400">{s.code}</p>}
        </div>
        {canWrite && (
          <Button
            variant="ghost"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              if (!(await confirm({ title: `Supprimer « ${s.name} » ?`, description: 'Ses instructions restent, sans ce poste. Le code QR cesse de fonctionner.', confirmLabel: 'Supprimer le poste', danger: true }))) return
              await data.remove(T.station, id)
              await qc.invalidateQueries({ queryKey: qk.stations })
              router.push('/postes')
            }}
          >
            Supprimer
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <h2 className="mb-4 text-lg font-black tracking-tight">Code QR et tablette</h2>
          {url ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Qr value={url} size={200} />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm font-bold text-slate-500">
                  {s.linkMode === 'only' ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" /> Montre seulement les instructions de ce poste.
                    </span>
                  ) : (
                    'Montre d’abord les instructions de ce poste ; les autres restent à un geste.'
                  )}{' '}
                  Créé le {formatDate(s.linkCreatedAt)}.
                </p>
                <p className="glass-input truncate rounded-xl px-3 py-2 text-xs font-bold">{url}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={url} target="_blank" rel="noreferrer" className="btn-press bg-gradient-primary shadow-primary inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black text-white">
                    <Tablet className="h-4 w-4" /> Ouvrir le mode tablette
                  </a>
                  <Button
                    icon={<Copy className="h-4 w-4" />}
                    onClick={async () => {
                      if (await copyText(url)) toast.success('Lien copié')
                    }}
                  >
                    Copier
                  </Button>
                  <Link href={`/postes/etiquettes?poste=${id}`} className="btn-press glass-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black">
                    <ExternalLink className="h-4 w-4" /> Imprimer l’étiquette
                  </Link>
                </div>
                <p className="text-xs font-medium text-slate-400">Sur la tablette du poste : ouvrez ce lien, puis « Ajouter à l’écran d’accueil » et le mode d’accès guidé (iPad) ou l’épinglage d’écran (Android).</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-medium text-slate-600 dark:text-slate-300">Choisissez ce que verra l’opérateur qui scanne le code de ce poste.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceTile selected={false} onClick={() => makeLink('focus', assistant)} title="Ce poste d’abord" description="Les autres instructions restent à un geste (recommandé)" />
                <ChoiceTile selected={false} onClick={() => makeLink('only', assistant)} icon={<Lock className="h-5 w-5" />} title="Seulement ce poste" description="Rien d’autre n’est visible" />
              </div>
            </div>
          )}
          {canWrite && voiceToggle && (
            <div className="mt-5 border-t border-slate-900/5 pt-4 dark:border-white/5">
              <Switch
                checked={assistant}
                onChange={(v) => gate(voice, 'voice_assistant', () => setAssistant(v))}
                label={
                  <span className="inline-flex items-center gap-2">
                    <Mic className="h-4 w-4" /> Assistant vocal au poste {voice === 'locked' && <LockBadge />}
                  </span>
                }
                description="Les opérateurs naviguent et posent leurs questions à voix haute. S’applique au prochain code créé."
              />
            </div>
          )}
          {canWrite && url && (
            <Button
              className="mt-4"
              variant="ghost"
              loading={busy}
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={async () => {
                if (await confirm({ title: 'Remplacer le code QR ?', description: 'L’ancien code ne fonctionnera plus dans CLIP. Il faudra réimprimer l’étiquette.', confirmLabel: 'Créer un nouveau code' })) void makeLink(s.linkMode ?? 'focus', assistant)
              }}
            >
              Remplacer le code QR
            </Button>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-black tracking-tight">Détails</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input id="code" defaultValue={s.code} readOnly={!canWrite} onBlur={(e) => e.target.value !== (s.code ?? '') && void patch({ code: e.target.value.trim() || undefined })} />
            </div>
            <div>
              <Label htmlFor="area">Zone ou ligne</Label>
              <Input id="area" defaultValue={s.area} readOnly={!canWrite} onBlur={(e) => e.target.value !== (s.area ?? '') && void patch({ area: e.target.value.trim() || undefined })} />
            </div>
          </div>
        </Panel>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-black tracking-tight">Instructions de ce poste ({linked.length})</h2>
        {linked.length ? (
          <div className="space-y-2">
            {linked.map((d) => (
              <InstructionRow key={d._id} doc={d} stationNames={[s.name]} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<QrCode className="h-7 w-7" />} title="Aucune instruction pour ce poste" description="Dans une instruction, ajoutez ce poste dans sa fiche : elle apparaîtra ici et sur la tablette." action={can('instructions', 'write') ? <Link href="/instructions/nouvelle" className="font-black text-[var(--primary)]">Créer une instruction</Link> : undefined} />
        )}
      </section>
    </div>
  )
}
