'use client'

import { ArrowDown, ArrowUp, Copy, ImagePlus, Pencil, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { DictateButton } from '@/components/capture/DictateButton'
import { MediaView } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { assistStep, illustrationPrompt } from '@/lib/ai/assist'
import { ApiError } from '@/lib/gateway/client'
import { STEP_ACTIONS } from '@/lib/ai/prompts'
import { WARNINGS } from '@/lib/model/catalog'
import type { InstructionContent, Source, Step, StepMedia, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { Annotator } from './Annotator'
import { MediaPicker } from './MediaPicker'

export function StepEditor({
  content,
  step,
  index,
  sources,
  readOnly,
  onChange,
  onMove,
  onDelete,
  onDuplicate,
  onInsertAfter,
  onSourceAdded,
  highlight,
}: {
  content: InstructionContent
  step: Step
  index: number
  sources: Source[]
  readOnly?: boolean
  onChange: (s: Step) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  onDuplicate: () => void
  onInsertAfter: () => void
  onSourceAdded: (s: Source) => void
  highlight?: string | null
}) {
  const { ai, org } = useSession()
  const toast = useToast()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [annotating, setAnnotating] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const [suggestion, setSuggestion] = useState<{ step: Step; explanation: string } | null>(null)
  const [mediaIndex, setMediaIndex] = useState(0)
  const media = step.media[Math.min(mediaIndex, step.media.length - 1)]

  async function runAssist(key: string, request: string) {
    setBusy(key)
    try {
      const r = await assistStep(ai, org.json_data, content, step, request)
      setSuggestion(r)
    } catch (e) {
      toast.error('L’IA n’a pas pu corriger l’étape', errorText(e))
    } finally {
      setBusy(null)
    }
  }

  async function illustrate(m: Extract<StepMedia, { kind: 'image' }>) {
    setBusy('illustrate')
    try {
      const prompt = await illustrationPrompt(ai, m.url, step)
      const url = await ai.generateImage(prompt, [m.url])
      onChange({ ...step, media: [...step.media, { kind: 'image', url, generated: true }] })
      setMediaIndex(step.media.length)
      toast.success('Illustration créée', 'Elle s’ajoute aux médias de l’étape. Gardez celle que vous préférez.')
    } catch (e) {
      // Le code aide à trouver la cause (droits, service d'images, image de référence).
      const code = e instanceof ApiError && e.status ? ` (code ${e.status}${e.code ? ` · ${e.code}` : ''})` : ''
      toast.error('L’illustration n’a pas pu être créée', `${errorText(e)}${code}`)
    } finally {
      setBusy(null)
    }
  }

  const set = (patch: Partial<Step>) => onChange({ ...step, ...patch })

  return (
    <div className={cn('glass-panel rounded-[32px] p-4 sm:p-6', highlight && 'ring-4 ring-amber-300/60')}>
      <div className="mb-4 flex items-center gap-3">
        <span className="bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white tabular-nums">{index + 1}</span>
        <p className="label-caps min-w-0 flex-1 truncate text-slate-500">Étape {index + 1} sur {content.steps.length}</p>
        {!readOnly && (
          <>
            <IconButton label="Monter" onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp className="h-5 w-5" />
            </IconButton>
            <IconButton label="Descendre" onClick={() => onMove(1)} disabled={index === content.steps.length - 1}>
              <ArrowDown className="h-5 w-5" />
            </IconButton>
            <Menu
              items={[
                { label: 'Ajouter une étape après', icon: <Plus className="h-4 w-4" />, onClick: onInsertAfter },
                { label: 'Dupliquer l’étape', icon: <Copy className="h-4 w-4" />, onClick: onDuplicate },
                { label: 'Supprimer l’étape', icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, danger: true },
              ]}
            />
          </>
        )}
      </div>

      {highlight && <p className="mb-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">Retour d’un opérateur : « {highlight} »</p>}

      {/* Média */}
      <div className="relative aspect-video overflow-hidden rounded-[24px] bg-slate-900">
        {media ? (
          <MediaView key={`${media.url}-${media.kind === 'video' ? media.start : ''}`} media={media} autoPlay={false} />
        ) : (
          <button type="button" disabled={readOnly} onClick={() => setPickerOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
            <ImagePlus className="h-10 w-10" />
            <span className="font-black">{readOnly ? 'Aucun média' : 'Ajouter une photo, un extrait vidéo ou un plan'}</span>
          </button>
        )}
      </div>
      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {step.media.map((m, i) => (
            <button key={`${m.url}-${i}`} type="button" onClick={() => setMediaIndex(i)} className={cn('btn-press flex h-11 items-center gap-1.5 rounded-2xl px-3 text-xs font-black', i === mediaIndex ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
              {m.kind === 'video' ? 'Extrait' : m.kind === 'document' ? `Page ${m.page ?? 1}` : (m as { generated?: boolean }).generated ? 'Illustration' : 'Photo'} {i + 1}
              <span
                role="button"
                tabIndex={0}
                aria-label="Retirer ce média"
                onClick={(e) => {
                  e.stopPropagation()
                  set({ media: step.media.filter((_, j) => j !== i) })
                  setMediaIndex(0)
                }}
                className="ml-1 rounded-lg p-0.5 hover:bg-rose-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
          <Button size="sm" onClick={() => setPickerOpen(true)} icon={<ImagePlus className="h-4 w-4" />}>
            {step.media.length ? 'Changer ou ajouter' : 'Choisir un média'}
          </Button>
          {media?.kind === 'image' && (
            <>
              <Button size="sm" onClick={() => setAnnotating(mediaIndex)} icon={<Pencil className="h-4 w-4" />}>
                Annoter
              </Button>
              <Button size="sm" onClick={() => illustrate(media)} loading={busy === 'illustrate'} icon={<Wand2 className="h-4 w-4" />}>
                Illustration IA <AiCost operation="illustrate" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Texte */}
      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor={`t-${step.id}`}>Action</Label>
          <Input id={`t-${step.id}`} value={step.title} readOnly={readOnly} onChange={(e) => set({ title: e.target.value })} className="h-14 text-lg font-black" placeholder="Retirer le garde de protection" />
        </div>
        <div>
          <Label htmlFor={`x-${step.id}`} hint={`${step.text.split(/\s+/).filter(Boolean).length} mots`}>
            Comment
          </Label>
          <div className="flex items-start gap-2">
            <Textarea id={`x-${step.id}`} rows={3} value={step.text} readOnly={readOnly} onChange={(e) => set({ text: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Points clés</Label>
          <div className="space-y-2">
            {(step.keyPoints ?? []).map((k, i) => (
              <div key={i} className="flex gap-2">
                <Input value={k} readOnly={readOnly} onChange={(e) => set({ keyPoints: (step.keyPoints ?? []).map((x, j) => (j === i ? e.target.value : x)) })} />
                {!readOnly && (
                  <IconButton label="Retirer le point clé" onClick={() => set({ keyPoints: (step.keyPoints ?? []).filter((_, j) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            ))}
            {!readOnly && (step.keyPoints ?? []).length < 4 && (
              <button type="button" onClick={() => set({ keyPoints: [...(step.keyPoints ?? []), ''] })} className="text-sm font-black text-[var(--primary)]">
                + Ajouter un point clé
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div>
            <Label htmlFor={`w-${step.id}`}>Mise en garde</Label>
            <Select
              id={`w-${step.id}`}
              disabled={readOnly}
              value={step.warning?.level ?? 'none'}
              onChange={(e) => {
                const level = e.target.value as WarningLevel | 'none'
                set({ warning: level === 'none' ? null : { level, text: step.warning?.text ?? '' } })
              }}
            >
              <option value="none">Aucune</option>
              {(Object.keys(WARNINGS) as WarningLevel[]).map((w) => (
                <option key={w} value={w}>
                  {WARNINGS[w].label}
                </option>
              ))}
            </Select>
          </div>
          {step.warning && (
            <div>
              <Label htmlFor={`wt-${step.id}`}>Texte de la mise en garde</Label>
              <Input id={`wt-${step.id}`} value={step.warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: step.warning!.level, text: e.target.value } })} />
            </div>
          )}
        </div>
      </div>

      {/* IA */}
      {!readOnly && (
        <div className="mt-6 rounded-[24px] bg-primary-soft p-4">
          <p className="label-caps mb-3 flex items-center gap-1.5 text-[var(--primary-strong)] dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> Améliorer avec l’IA <AiCost operation="step_assist" className="normal-case tracking-normal" />
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['simplify', 'Simplifier'],
                ['clarify', 'Plus clair'],
                ['keypoint', 'Point clé'],
                ['safety', 'Sécurité'],
              ] as const
            ).map(([k, label]) => (
              <Button key={k} size="sm" loading={busy === k} disabled={!!busy && busy !== k} onClick={() => runAssist(k, STEP_ACTIONS[k])}>
                {label}
              </Button>
            ))}
            <Button size="sm" onClick={() => setCustom(true)} disabled={!!busy}>
              Autre demande…
            </Button>
          </div>
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        sources={sources}
        current={media}
        onSourceAdded={onSourceAdded}
        onPick={(m) => {
          set({ media: [m, ...step.media.filter((x) => x.url !== m.url || x.kind === 'video')].slice(0, 3) })
          setMediaIndex(0)
        }}
      />
      {annotating !== null && step.media[annotating]?.kind === 'image' && (
        <Annotator
          open
          onClose={() => setAnnotating(null)}
          src={step.media[annotating].url}
          step={step}
          value={(step.media[annotating] as Extract<StepMedia, { kind: 'image' }>).annotations ?? []}
          onSave={(annotations) => set({ media: step.media.map((m, i) => (i === annotating && m.kind === 'image' ? { ...m, annotations } : m)) })}
        />
      )}
      <Modal
        open={custom}
        onClose={() => setCustom(false)}
        title="Que voulez-vous changer ?"
        footer={
          <>
            <Button onClick={() => setCustom(false)}>Annuler</Button>
            <Button
              variant="primary"
              disabled={!customText.trim()}
              loading={busy === 'custom'}
              onClick={async () => {
                await runAssist('custom', customText.trim())
                setCustom(false)
                setCustomText('')
              }}
            >
              Demander à l’IA <AiCost operation="step_assist" />
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2">
          <Textarea autoFocus value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Ex. : précise qu’il faut tourner dans le sens horaire" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Ajoute qu’il faut porter des gants', 'Mentionne la valeur de serrage', 'Coupe en deux étapes plus courtes'].map((ex) => (
            <button key={ex} type="button" onClick={() => setCustomText(ex)} className="glass-card btn-press rounded-xl px-3 py-2 text-xs font-bold">
              {ex}
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={!!suggestion}
        onClose={() => setSuggestion(null)}
        title="Proposition de l’IA"
        footer={
          <>
            <Button onClick={() => setSuggestion(null)}>Garder l’original</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (suggestion) onChange(suggestion.step)
                setSuggestion(null)
              }}
            >
              Appliquer
            </Button>
          </>
        }
      >
        {suggestion && (
          <div className="space-y-3">
            {suggestion.explanation && <p className="text-sm font-bold text-slate-500">{suggestion.explanation}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/5">
                <p className="label-caps mb-1 text-slate-400">Avant</p>
                <p className="font-black">{step.title}</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{step.text}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <p className="label-caps mb-1 text-emerald-600">Après</p>
                <p className="font-black">{suggestion.step.title}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{suggestion.step.text}</p>
                {!!suggestion.step.keyPoints?.length && <ul className="mt-2 list-disc pl-5 text-sm font-medium">{suggestion.step.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>}
                {suggestion.step.warning && <p className="mt-2 text-sm font-black text-rose-600">{WARNINGS[suggestion.step.warning.level].label} : {suggestion.step.warning.text}</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
