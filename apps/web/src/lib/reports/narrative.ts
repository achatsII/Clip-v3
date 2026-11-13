/**
 * L'IA autour d'un rapport (inspiré de K2 Cadence) : elle lit des chiffres déjà calculés, avec leurs
 * repères (`[k:done]`, `[t:instructions]`), et rend l'essentiel, ce qu'il faut surveiller et des
 * pistes. Elle ne recalcule rien, n'invente aucun chiffre et ne confond pas corrélation et cause.
 * Sans IA (pas d'accord, plus de crédits, pas de réponse), l'analyse automatique dit les plus grands
 * changements. Opérations `report_summary` et `report_question`.
 */
import type { AiApi } from '../gateway/ai'
import { messages } from '../i18n'
import type { Block, Kpi } from './catalog'

export interface Narrative {
  summary: string[]
  watch: string[]
  actions: string[]
  /** L'analyse automatique (sans IA). */
  auto: boolean
}

const MAX_ROWS = 15

/** Le rapport en texte, pour l'IA : chaque chiffre avec son repère, sa valeur d'avant et son changement. */
export function blocksText(title: string, period: string, blocks: Block[]): string {
  const lines = [`RAPPORT : ${title}`, `PÉRIODE : ${period}`]
  for (const b of blocks) {
    if (b.kind === 'kpis') for (const k of b.items) lines.push(`[k:${k.id}] ${k.label} : ${k.value}${k.previous ? ` (avant : ${k.previous}${k.delta ? `, ${k.delta.text}` : ''})` : ''}${k.hint ? ` — ${k.hint}` : ''}`)
    if (b.kind === 'bars') lines.push(`[b:${b.id}] ${b.title} : ${b.days.map((d) => `${d.date} ${d.value}`).join(', ')}`)
    if (b.kind === 'table') {
      lines.push(`[t:${b.id}] ${b.title}${b.rows.length > MAX_ROWS ? ` (${MAX_ROWS} premières lignes sur ${b.rows.length})` : ''}`)
      lines.push(`  ${b.columns.map((c) => c.label).join(' | ')}`)
      for (const r of b.rows.slice(0, MAX_ROWS)) lines.push(`  ${b.columns.map((c) => `${r.cells[c.key]?.text ?? ''}${r.cells[c.key]?.low ? ' (peu de données)' : ''}`).join(' | ')}`)
      if (!b.rows.length) lines.push('  (vide)')
    }
    if (b.kind === 'list') {
      lines.push(`[l:${b.id}] ${b.title}`)
      for (const i of b.items) lines.push(`  - ${i.text}`)
      if (!b.items.length) lines.push(`  (${b.empty})`)
    }
  }
  return lines.join('\n')
}

export const narrativeSchema = {
  type: 'object',
  properties: {
    summary: { type: 'array', items: { type: 'string' }, description: '2 ou 3 phrases : l’essentiel du rapport' },
    watch: { type: 'array', items: { type: 'string' }, description: '0 à 3 choses à surveiller, chacune avec son chiffre' },
    actions: { type: 'array', items: { type: 'string' }, description: '0 à 3 pistes concrètes pour l’usine' },
  },
  required: ['summary', 'watch', 'actions'],
}

const inLanguage = (lang: string) => (lang === 'en' ? 'in clear North American English' : 'en français québécois clair')

export function narrativeSystem(lang: string): string {
  return `Tu commentes un rapport d'usine pour un superviseur pressé. Les chiffres sont officiels et déjà calculés : ne recalcule rien, n'invente aucun chiffre, cite seulement des chiffres présents dans le rapport. Une corrélation n'est pas une cause : propose des pistes, pas des certitudes. Un chiffre marqué « peu de données » se dit avec prudence ou pas du tout.
- summary : 2 ou 3 phrases courtes, l'essentiel, avec les chiffres qui comptent.
- watch : 0 à 3 choses à surveiller (un écart, un temps qui s'allonge, un retour danger), chacune avec son chiffre.
- actions : 0 à 3 pistes concrètes et faisables au plancher (revoir une étape, former une personne, vérifier une limite).
- Des mots simples, ceux du plancher ; jamais de jargon ni de repère technique ([k:…]).
- Langue : ${inLanguage(lang)}.`
}

const clean = (raw: unknown, max: number): string[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.replace(/\[(?:k|t|b|l):[^\]]*\]\s*/g, '').trim())
    .filter(Boolean)
    .slice(0, max)

/** La réponse de l'IA, rendue sûre : au plus 3 phrases par partie, sans repère technique. */
export function cleanNarrative(raw: unknown): Narrative | null {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const summary = clean(x.summary, 3)
  if (!summary.length) return null
  return { summary, watch: clean(x.watch, 3), actions: clean(x.actions, 3), auto: false }
}

const kpisOf = (blocks: Block[]): Kpi[] => blocks.flatMap((b) => (b.kind === 'kpis' ? b.items : []))

/** L'analyse automatique : les chiffres clés, les plus grands changements d'abord, puis ce qui est à regarder. */
export function autoNarrative(blocks: Block[]): Narrative {
  const t = messages().reports.auto
  const kpis = kpisOf(blocks).filter((k) => k.raw !== null)
  if (!kpis.length) return { summary: [t.nothing], watch: [], actions: [], auto: true }
  const sorted = [...kpis].sort((a, b) => Number(!!b.delta) - Number(!!a.delta))
  const summary = sorted.slice(0, 3).map((k) => (k.delta ? (k.delta.tone === 'bad' ? t.down : t.up)(k.label, k.value, k.delta.text) : k.previous ? t.flat(k.label, k.value) : t.only(k.label, k.value)))
  const watch = [
    ...kpis.filter((k) => k.delta?.tone === 'bad').map((k) => t.up(k.label, k.value, k.delta!.text)),
    ...blocks.flatMap((b) => (b.kind === 'list' ? b.items.filter((i) => i.tone === 'bad').map((i) => i.text) : [])),
  ]
  return { summary, watch: [...new Set(watch)].slice(0, 3), actions: [], auto: true }
}

/** L'analyse par l'IA (`report_summary`) ; une réponse vide donne l'analyse automatique. */
export async function analyzeReport(ai: AiApi, title: string, period: string, blocks: Block[], lang: string): Promise<Narrative> {
  const res = await ai.ask<Record<string, unknown>>(
    'report_summary',
    { provider: 'google', level: 'mid', thinking: 'disabled', system_instruction: narrativeSystem(lang), prompt: blocksText(title, period, blocks), json_schema: narrativeSchema },
    { scope: 'report', timeoutMs: 90_000 },
  )
  return cleanNarrative(res.json) ?? autoNarrative(blocks)
}

export interface Turn {
  q: string
  a: string
}

export function questionSystem(lang: string): string {
  return `Tu réponds à une question sur un rapport d'usine. Réponds seulement à partir des chiffres du rapport, sans rien recalculer ni inventer ; si la réponse n'y est pas, dis-le en une phrase et dis quel rapport ou quel écran de CLIP la donnerait (Registre, Équipe, Retours, un autre rapport). 2 à 4 phrases, des mots simples, sans repère technique ([k:…]). Langue : ${inLanguage(lang)}.`
}

/** Une question sur le rapport (`report_question`), avec les derniers échanges. */
export async function askReport(ai: AiApi, title: string, period: string, blocks: Block[], question: string, history: Turn[], lang: string): Promise<string> {
  const past = history.slice(-4).map((h) => `QUESTION : ${h.q}\nRÉPONSE : ${h.a}`).join('\n\n')
  const res = await ai.ask('report_question', {
    provider: 'google',
    level: 'mid',
    thinking: 'disabled',
    system_instruction: questionSystem(lang),
    prompt: `${blocksText(title, period, blocks)}\n\n${past ? `${past}\n\n` : ''}QUESTION : ${question.trim()}`,
  }, { scope: 'report-question', timeoutMs: 60_000 })
  return (res.text ?? '').replace(/\[(?:k|t|b|l):[^\]]*\]\s*/g, '').trim()
}
