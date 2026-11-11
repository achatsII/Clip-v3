'use client'

import { History, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { DictateButton } from '@/components/capture/DictateButton'
import { useSession } from '@/components/providers/Session'
import { Button, IconButton } from '@/components/ui/Button'
import { AutoTextarea, fieldLook, Input, Label, Segmented, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { suggestStandard } from '@/lib/ai/assist'
import { nowIso } from '@/lib/model/repo'
import type { WritingStandard } from '@/lib/model/types'
import { formatDate } from '@/lib/util/cn'

/** Le standard de rédaction : ce que l'IA respecte à chaque génération. Versionné. */
export function StandardTab() {
  const { org, ai, updateOrg, can, displayName } = useSession()
  const toast = useToast()
  const readOnly = !can('settings', 'write')
  const current = org.json_data.standard
  const [draft, setDraft] = useState<WritingStandard>(current)
  const [agentOpen, setAgentOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [proposal, setProposal] = useState<{ value: Omit<WritingStandard, 'version' | 'updatedAt'>; explanation: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify({ ...draft, updatedAt: 0, version: 0 }) !== JSON.stringify({ ...current, updatedAt: 0, version: 0 })

  async function save(next: WritingStandard) {
    setBusy(true)
    try {
      const versioned: WritingStandard = { ...next, rules: next.rules.map((r) => r.trim()).filter(Boolean), version: current.version + 1, updatedAt: nowIso(), updatedByName: displayName }
      await updateOrg({ standard: versioned, standardHistory: [current, ...org.json_data.standardHistory].slice(0, 20) })
      setDraft(versioned)
      toast.success(`Standard enregistré (version ${versioned.version})`, 'Les prochaines générations en tiendront compte.')
    } catch (e) {
      toast.error('Le standard n’a pas été enregistré', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Votre standard de rédaction</h2>
            <p className="text-sm font-medium text-slate-500">
              Version {current.version}
              {current.updatedByName ? ` · ${current.updatedByName}` : ''} · {formatDate(current.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)} disabled={!org.json_data.standardHistory.length}>
              Historique
            </Button>
            {!readOnly && (
              <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={() => setAgentOpen(true)}>
                Décrire à l’IA
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Switch checked={draft.startWithSafety} disabled={readOnly} onChange={(v) => setDraft({ ...draft, startWithSafety: v })} label="Toujours commencer par la sécurité" description="La première étape rappelle les EPI et les risques." />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="max-words">Mots au plus par étape</Label>
              <Input id="max-words" type="number" inputMode="numeric" min={10} max={60} readOnly={readOnly} value={draft.maxWordsPerStep} onChange={(e) => setDraft({ ...draft, maxWordsPerStep: Math.min(60, Math.max(10, Number(e.target.value) || 25)) })} />
            </div>
            <div>
              <Label>Ton</Label>
              <Segmented
                value={draft.tone}
                onChange={(tone) => !readOnly && setDraft({ ...draft, tone })}
                options={[
                  { value: 'infinitif', label: 'Infinitif' },
                  { value: 'tu', label: 'Tu' },
                  { value: 'vous', label: 'Vous' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label>Règles</Label>
            <div className="space-y-2">
              {draft.rules.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex h-12 w-8 shrink-0 items-center justify-center text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
                  {/* La règle se lit en entier : le champ passe à la ligne et grandit au lieu de couper. */}
                  <div className="min-w-0 flex-1">
                    <AutoTextarea singleLine aria-label={`Règle ${i + 1}`} value={r} readOnly={readOnly} className={fieldLook} onChange={(e) => setDraft({ ...draft, rules: draft.rules.map((x, j) => (j === i ? e.target.value : x)) })} />
                  </div>
                  {!readOnly && (
                    <IconButton label="Retirer la règle" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button type="button" onClick={() => setDraft({ ...draft, rules: [...draft.rules, ''] })} className="ml-10 inline-flex items-center gap-1 text-sm font-black text-[var(--primary)]">
                  <Plus className="h-4 w-4" /> Ajouter une règle
                </button>
              )}
            </div>
          </div>
          <div>
            <Label hint="Les mots de votre usine">Vocabulaire</Label>
            <div className="space-y-2">
              {draft.glossary.map((g, i) => (
                // Au téléphone, la définition passe sous le terme, sur toute la largeur.
                <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input value={g.term} readOnly={readOnly} placeholder="Terme" aria-label={`Terme ${i + 1}`} onChange={(e) => setDraft({ ...draft, glossary: draft.glossary.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)) })} />
                  <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                    <AutoTextarea singleLine value={g.meaning} readOnly={readOnly} placeholder="Ce que ça veut dire chez vous" aria-label={`Sens du terme ${i + 1}`} className={fieldLook} onChange={(e) => setDraft({ ...draft, glossary: draft.glossary.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)) })} />
                  </div>
                  {!readOnly && (
                    <IconButton label="Retirer" className="max-sm:col-start-2 max-sm:row-start-1" onClick={() => setDraft({ ...draft, glossary: draft.glossary.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button type="button" onClick={() => setDraft({ ...draft, glossary: [...draft.glossary, { term: '', meaning: '' }] })} className="inline-flex items-center gap-1 text-sm font-black text-[var(--primary)]">
                  <Plus className="h-4 w-4" /> Ajouter un terme
                </button>
              )}
            </div>
          </div>
        </div>
        {!readOnly && dirty && (
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setDraft(current)}>Annuler</Button>
            <Button variant="primary" loading={busy} onClick={() => save(draft)}>
              Enregistrer la version {current.version + 1}
            </Button>
          </div>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-black tracking-tight">Ce que l’IA a appris de vos avis</h2>
        <p className="mb-4 text-sm font-medium text-slate-500">Quand une génération ne convient pas, votre commentaire s’ajoute ici et guide les suivantes.</p>
        {org.json_data.learnings.length ? (
          <ul className="space-y-2">
            {org.json_data.learnings.map((l, i) => (
              <li key={`${l.at}-${i}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className="flex-1 text-sm font-bold">{l.text}</span>
                <span className="text-xs font-bold text-slate-400">{formatDate(l.at)}</span>
                {!readOnly && (
                  <IconButton label="Oublier" onClick={() => void updateOrg({ learnings: org.json_data.learnings.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-bold text-slate-400">Rien encore. Donnez votre avis sous une instruction générée.</p>
        )}
      </Panel>

      <Modal
        open={agentOpen}
        onClose={() => {
          setAgentOpen(false)
          setProposal(null)
        }}
        title="Décrivez votre façon d’écrire"
        size="lg"
        footer={
          proposal ? (
            <>
              <Button onClick={() => setProposal(null)}>Recommencer</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDraft({ ...draft, ...proposal.value })
                  setProposal(null)
                  setAgentOpen(false)
                  toast.info('Proposition appliquée au formulaire', 'Vérifiez, puis enregistrez la nouvelle version.')
                }}
              >
                Utiliser cette proposition
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              loading={busy}
              disabled={!description.trim()}
              onClick={async () => {
                setBusy(true)
                try {
                  const r = await suggestStandard(ai, description, current)
                  setProposal({ value: r.proposal, explanation: r.explanation })
                } catch (e) {
                  toast.error('L’IA n’a pas pu proposer de standard', errorText(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Proposer mon standard <AiCost operation="standard_agent" />
            </Button>
          )
        }
      >
        {proposal ? (
          <div className="space-y-3">
            {proposal.explanation && <p className="rounded-2xl bg-primary-soft p-4 text-sm font-bold">{proposal.explanation}</p>}
            <ol className="list-decimal space-y-1 pl-6 text-sm font-bold">
              {proposal.value.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <p className="text-sm font-bold text-slate-500">
              {proposal.value.startWithSafety ? 'Commence par la sécurité' : 'Ne commence pas forcément par la sécurité'} · {proposal.value.maxWordsPerStep} mots par étape · ton « {proposal.value.tone} »
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-slate-500">Parlez ou écrivez comme à un nouvel employé : vos habitudes, vos exigences de sécurité, vos mots. L’IA en fait un standard que vous validez.</p>
            <div className="flex items-start gap-2">
              <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex. : chez nous, on commence toujours par les EPI et le cadenassage. Phrases très courtes, on tutoie. On dit « la presse » pour la presse hydraulique 200 t…" />
            </div>
          </>
        )}
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Versions du standard">
        <ol className="space-y-2">
          {org.json_data.standardHistory.map((v) => (
            <li key={`${v.version}-${v.updatedAt}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <span className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white">v{v.version}</span>
              <span className="flex-1 text-sm font-bold">
                {v.rules.length} règles · {formatDate(v.updatedAt)}
                {v.updatedByName ? ` · ${v.updatedByName}` : ''}
              </span>
              {!readOnly && (
                <Button
                  size="sm"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => {
                    setDraft({ ...v })
                    setHistoryOpen(false)
                    toast.info(`Version ${v.version} remise dans le formulaire`, 'Enregistrez pour la rétablir.')
                  }}
                >
                  Revenir
                </Button>
              )}
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  )
}
