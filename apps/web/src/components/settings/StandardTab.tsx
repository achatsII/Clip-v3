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
import { getLang, useMessages } from '@/lib/i18n'
import { nowIso } from '@/lib/model/repo'
import type { WritingStandard } from '@/lib/model/types'
import { formatDate } from '@/lib/util/cn'

/** Le standard de rédaction : ce que l'IA respecte à chaque génération. Versionné. */
export function StandardTab() {
  const { org, ai, updateOrg, can, displayName } = useSession()
  const words = useMessages()
  const t = words.settings.standard
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
      toast.success(t.saved(versioned.version), t.savedHint)
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">{t.title}</h2>
            <p className="text-sm font-medium text-slate-500">
              {t.version(current.version)}
              {current.updatedByName ? ` · ${current.updatedByName}` : ''} · {formatDate(current.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)} disabled={!org.json_data.standardHistory.length}>
              {t.history}
            </Button>
            {!readOnly && (
              <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={() => setAgentOpen(true)}>
                {t.describeToAi}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Switch checked={draft.startWithSafety} disabled={readOnly} onChange={(v) => setDraft({ ...draft, startWithSafety: v })} label={t.startWithSafety} description={t.startWithSafetyHint} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="max-words">{t.maxWords}</Label>
              <Input id="max-words" type="number" inputMode="numeric" min={10} max={60} readOnly={readOnly} value={draft.maxWordsPerStep} onChange={(e) => setDraft({ ...draft, maxWordsPerStep: Math.min(60, Math.max(10, Number(e.target.value) || 25)) })} />
            </div>
            <div>
              <Label>{t.tone}</Label>
              <Segmented
                value={draft.tone}
                onChange={(tone) => !readOnly && setDraft({ ...draft, tone })}
                options={[
                  { value: 'infinitif', label: t.tones.infinitif },
                  { value: 'tu', label: t.tones.tu },
                  { value: 'vous', label: t.tones.vous },
                ]}
              />
            </div>
          </div>
          <div>
            <Label>{t.rules}</Label>
            <div className="space-y-2">
              {draft.rules.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex h-12 w-8 shrink-0 items-center justify-center text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
                  {/* La règle se lit en entier : le champ passe à la ligne et grandit au lieu de couper. */}
                  <div className="min-w-0 flex-1">
                    <AutoTextarea singleLine aria-label={t.rule(i + 1)} value={r} readOnly={readOnly} className={fieldLook} onChange={(e) => setDraft({ ...draft, rules: draft.rules.map((x, j) => (j === i ? e.target.value : x)) })} />
                  </div>
                  {!readOnly && (
                    <IconButton label={t.removeRule} onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button type="button" onClick={() => setDraft({ ...draft, rules: [...draft.rules, ''] })} className="ml-10 inline-flex items-center gap-1 text-sm font-black text-[var(--primary)]">
                  <Plus className="h-4 w-4" /> {t.addRule}
                </button>
              )}
            </div>
          </div>
          <div>
            <Label hint={t.glossaryHint}>{t.glossary}</Label>
            <div className="space-y-2">
              {draft.glossary.map((g, i) => (
                // Au téléphone, la définition passe sous le terme, sur toute la largeur.
                <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input value={g.term} readOnly={readOnly} placeholder={t.term} aria-label={t.termLabel(i + 1)} onChange={(e) => setDraft({ ...draft, glossary: draft.glossary.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)) })} />
                  <div className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                    <AutoTextarea singleLine value={g.meaning} readOnly={readOnly} placeholder={t.meaning} aria-label={t.meaningLabel(i + 1)} className={fieldLook} onChange={(e) => setDraft({ ...draft, glossary: draft.glossary.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)) })} />
                  </div>
                  {!readOnly && (
                    <IconButton label={words.common.remove} className="max-sm:col-start-2 max-sm:row-start-1" onClick={() => setDraft({ ...draft, glossary: draft.glossary.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button type="button" onClick={() => setDraft({ ...draft, glossary: [...draft.glossary, { term: '', meaning: '' }] })} className="inline-flex items-center gap-1 text-sm font-black text-[var(--primary)]">
                  <Plus className="h-4 w-4" /> {t.addTerm}
                </button>
              )}
            </div>
          </div>
        </div>
        {!readOnly && dirty && (
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setDraft(current)}>{words.common.cancel}</Button>
            <Button variant="primary" loading={busy} onClick={() => save(draft)}>
              {t.saveVersion(current.version + 1)}
            </Button>
          </div>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-black tracking-tight">{t.learningsTitle}</h2>
        <p className="mb-4 text-sm font-medium text-slate-500">{t.learningsIntro}</p>
        {org.json_data.learnings.length ? (
          <ul className="space-y-2">
            {org.json_data.learnings.map((l, i) => (
              <li key={`${l.at}-${i}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className="flex-1 text-sm font-bold">{l.text}</span>
                <span className="text-xs font-bold text-slate-400">{formatDate(l.at)}</span>
                {!readOnly && (
                  <IconButton label={t.forget} onClick={() => void updateOrg({ learnings: org.json_data.learnings.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-bold text-slate-400">{t.noLearnings}</p>
        )}
      </Panel>

      <Modal
        open={agentOpen}
        onClose={() => {
          setAgentOpen(false)
          setProposal(null)
        }}
        title={t.agentTitle}
        size="lg"
        footer={
          proposal ? (
            <>
              <Button onClick={() => setProposal(null)}>{t.startOver}</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDraft({ ...draft, ...proposal.value })
                  setProposal(null)
                  setAgentOpen(false)
                  toast.info(t.proposalApplied, t.proposalAppliedHint)
                }}
              >
                {t.useProposal}
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
                  // Le standard proposé s'écrit dans la langue de l'outil de la personne.
                  const r = await suggestStandard(ai, description, current, getLang())
                  setProposal({ value: r.proposal, explanation: r.explanation })
                } catch (e) {
                  toast.error(t.proposeFailed, errorText(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t.propose} <AiCost operation="standard_agent" />
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
              {proposal.value.startWithSafety ? t.startsWithSafety : t.notAlwaysSafety} · {t.wordsPerStep(proposal.value.maxWordsPerStep)} · {t.toneIs((t.tones[proposal.value.tone] ?? proposal.value.tone ?? '').toLowerCase())}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-slate-500">{t.agentIntro}</p>
            <div className="flex items-start gap-2">
              <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.agentPlaceholder} />
            </div>
          </>
        )}
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t.historyTitle}>
        <ol className="space-y-2">
          {org.json_data.standardHistory.map((v) => (
            <li key={`${v.version}-${v.updatedAt}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <span className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white">v{v.version}</span>
              <span className="flex-1 text-sm font-bold">
                {t.ruleCount(v.rules.length)} · {formatDate(v.updatedAt)}
                {v.updatedByName ? ` · ${v.updatedByName}` : ''}
              </span>
              {!readOnly && (
                <Button
                  size="sm"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => {
                    setDraft({ ...v })
                    setHistoryOpen(false)
                    toast.info(t.restored(v.version), t.restoredHint)
                  }}
                >
                  {t.restore}
                </Button>
              )}
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  )
}
