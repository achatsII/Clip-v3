/**
 * Ce que les gens corrigent après l'IA (toggle `learnFromEdits`). La génération garde le texte de sa
 * version (`generation.original`, sans les médias) ; à la première publication, on le compare à ce
 * qui est publié et on en garde des mesures simples (`clip_edit`) : de quoi voir une habitude qui se
 * répète, sans relire les instructions.
 */
import type { InstructionContent } from '../model/types'

/** Le texte d'une instruction, sans les médias : ce qu'on compare. */
export interface TextSnapshot {
  title: string
  steps: Array<{ title: string; text: string; keyPoints: string[]; warning: string | null }>
}

export function snapshotOf(c: Pick<InstructionContent, 'title' | 'steps'>): TextSnapshot {
  // Les étapes d'un bloc commun ne viennent pas de l'IA : elles ne disent rien de ses habitudes.
  return { title: c.title, steps: c.steps.filter((s) => !s.fromBlock).map((s) => ({ title: s.title, text: s.text, keyPoints: s.keyPoints ?? [], warning: s.warning?.text ?? null })) }
}

/** Ce qu'une personne a changé à la version de l'IA, mesuré simplement. */
export interface EditSignals {
  /** Nombre d'étapes : de l'IA, publiées. */
  steps: [number, number]
  /** Mots par texte d'étape (médiane) : de l'IA, publiés. */
  words: [number, number]
  /** Mots par titre (médiane). */
  titleWords: [number, number]
  /** Points clés, au total. */
  keyPoints: [number, number]
  /** Mises en garde, au total. */
  warnings: [number, number]
  /** Étapes retrouvées d'une version à l'autre, et combien ont changé de texte. */
  matched: number
  changed: number
  /** Un mot remplacé par un autre (« visser » → « serrer »), et combien de fois. */
  swaps: Array<{ from: string; to: string; n: number }>
  /** Quelques étapes avant → après, pour que l'IA en tire des règles (« Analyser avec l'IA »). */
  examples: Array<{ before: string; after: string }>
}

const words = (s: string) => s.split(/\s+/).filter(Boolean)
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const v = [...xs].sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : Math.round(((v[m - 1] + v[m]) / 2) * 10) / 10
}
/** Les mots d'un texte, en minuscules, sans ponctuation : de quoi comparer. */
export function tokens(s: string): string[] {
  return (s.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).map((w) => w.replace(/[’]/g, "'"))
}
const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans', 'the', 'a', 'an', 'of', 'to', 'and', 'or', 'in', 'on', 'for', 'with', 'by', 'it', 'its', 'est', 'sont', 'is', 'are'])
const meaningful = (w: string) => w.length >= 3 && !STOP.has(w) && /\p{L}/u.test(w) && !/\d/.test(w)

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  if (!A.size && !B.size) return 1
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

/**
 * La ressemblance de deux étapes, sur leurs mots porteurs de sens : la part de la plus courte qu'on
 * retrouve dans l'autre. Un texte très raccourci reste ainsi la même étape.
 */
function overlap(a: string[], b: string[]): number {
  const A = new Set(a.filter(meaningful))
  const B = new Set(b.filter(meaningful))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / Math.min(A.size, B.size)
}

/** Les remplacements d'un mot par un seul autre mot, dans l'ordre du texte (plus longue sous-suite commune). */
export function wordSwaps(before: string, after: string): Array<{ from: string; to: string }> {
  const a = tokens(before).slice(0, 80)
  const b = tokens(after).slice(0, 80)
  // dp[i][j] : la plus longue sous-suite commune de a[i…] et b[j…].
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: Array<{ from: string; to: string }> = []
  let gone: string[] = []
  let came: string[] = []
  const close = () => {
    if (gone.length === 1 && came.length === 1 && meaningful(gone[0]) && meaningful(came[0])) out.push({ from: gone[0], to: came[0] })
    gone = []
    came = []
  }
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      close()
      i++
      j++
    } else if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) gone.push(a[i++])
    else came.push(b[j++])
  }
  close()
  return out
}

/** Compare la version de l'IA à la version publiée. */
export function editSignals(before: TextSnapshot, after: TextSnapshot): EditSignals {
  const bTok = before.steps.map((s) => tokens(`${s.title} ${s.text}`))
  const aTok = after.steps.map((s) => tokens(`${s.title} ${s.text}`))
  // Chaque étape publiée retrouve l'étape de l'IA qui lui ressemble le plus (la moitié des mots de sens
  // au moins) ; à ressemblance égale, la plus proche dans l'ordre.
  const used = new Set<number>()
  const pairs: Array<[number, number]> = []
  aTok.forEach((t, ai) => {
    let best = -1
    let score = 0.5
    bTok.forEach((u, bi) => {
      if (used.has(bi)) return
      const s = overlap(t, u) - Math.abs(ai - bi) * 0.001
      if (s >= score) {
        score = s
        best = bi
      }
    })
    if (best >= 0) {
      used.add(best)
      pairs.push([best, ai])
    }
  })
  const swapCount = new Map<string, { from: string; to: string; n: number }>()
  const examples: EditSignals['examples'] = []
  let changed = 0
  for (const [bi, ai] of pairs) {
    const b = before.steps[bi]
    const a = after.steps[ai]
    const bText = `${b.title} — ${b.text}`.trim()
    const aText = `${a.title} — ${a.text}`.trim()
    if (bText === aText) continue
    changed++
    for (const s of [...wordSwaps(b.title, a.title), ...wordSwaps(b.text, a.text)]) {
      const k = `${s.from}>${s.to}`
      const cur = swapCount.get(k) ?? { ...s, n: 0 }
      cur.n++
      swapCount.set(k, cur)
    }
    if (examples.length < 6 && jaccard(bTok[bi], aTok[ai]) < 0.95) examples.push({ before: bText.slice(0, 300), after: aText.slice(0, 300) })
  }
  return {
    steps: [before.steps.length, after.steps.length],
    words: [median(before.steps.map((s) => words(s.text).length)), median(after.steps.map((s) => words(s.text).length))],
    titleWords: [median(before.steps.map((s) => words(s.title).length)), median(after.steps.map((s) => words(s.title).length))],
    keyPoints: [before.steps.reduce((n, s) => n + s.keyPoints.length, 0), after.steps.reduce((n, s) => n + s.keyPoints.length, 0)],
    warnings: [before.steps.filter((s) => s.warning).length, after.steps.filter((s) => s.warning).length],
    matched: pairs.length,
    changed,
    swaps: [...swapCount.values()].sort((x, y) => y.n - x.n).slice(0, 8),
    examples,
  }
}
