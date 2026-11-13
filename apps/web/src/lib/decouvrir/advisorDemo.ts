/**
 * La réponse de démonstration du conseiller, sans IA (interrupteur éteint : aucune session, rien ne part),
 * tirée de la base de connaissance sans rien inventer, avec la même conduite que le vrai conseiller
 * (INTEGRATION.md de Sandboxes, §4) :
 *  - ce qui existe : la section la plus proche des mots de la question, et la vidéo où le voir ;
 *  - ce qui n'existe pas encore : « Pas encore dans Clip aujourd'hui. », ce qui s'en approche, « C'est dans ce
 *    qu'on prévoit ensuite. » si la base le marque prévu, l'invitation, trois questions une à la fois, puis le
 *    besoin reformulé en trois lignes et son bloc ```besoin (l'écran le retire du message et le retient).
 * Une personne qui décline n'est pas relancée. Les mots fixes viennent du dictionnaire (`decouvrir.advisor.demo`) ;
 * les extraits, de la base (en français).
 */
import { messages, messagesIn } from '@/lib/i18n/core'
import type { AdvisorMessage, Extract, GuideVideo } from './advisor'
import { clock, VIDEO_IDS } from './catalog'
import { KNOWLEDGE } from './knowledge'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
// Des mots trop courants pour situer une question.
const STOP = new Set(
  'les des une est que qui pour pas avec dans sur aux par mon mes nos vos est-ce comment quoi quel quelle quels faire fait peut peux on nous vous ca cela ce cette ces son ses leur leurs plus tres bien aussi clip logiciel avez avoir etre sont chez tout tous toute votre notre aujourd hui voici the and does can how what with our your this that are there'.split(' '),
)

/**
 * La base est en français : une question en anglais emprunte les mots français de ses termes du métier (un
 * pont, pas une traduction), pour trouver la bonne section quand l'outil parle anglais.
 */
const BRIDGE: Array<[RegExp, string]> = [
  [/\btranslat\w*|\blanguages?\b|\bspanish\b|\barabic\b/i, 'traduire langues espagnol arabe'],
  [/\bapprov\w*|\bsign(ature)?s?\b/i, 'approuver approbation signatures'],
  [/\bstations?\b|\bqr\b|\btablets?\b|\bkiosk\b/i, 'poste postes tablette code'],
  [/\blockout\b|\block-out\b|\btag-?out\b/i, 'cadenassage'],
  [/\bimport\w*|\bold\b|\bpdf\b|\bword\b|\bdocuments?\b/i, 'importer anciennes procedures pdf word'],
  [/\bvideos?\b|\bfilm\w*|\bphotos?\b|\bvoice notes?\b|\bcaptur\w*/i, 'capturer video photos note vocale'],
  [/\bgenerat\w*|\bwrites?\b|\bai\b/i, 'generer instruction'],
  [/\bedit\w*|\bannotat\w*|\barrows?\b|\bdiagrams?\b/i, 'retoucher annoter schema'],
  [/\boperators?\b|\bread aloud\b|\breport(ing)? a problem\b/i, 'operateur poste lecteur ecouter'],
  [/\bteam\b|\broles?\b|\btraining\b|\bskills?\b/i, 'equipe roles formation competences'],
  [/\breports?\b|\bstatistics\b|\bdashboards?\b/i, 'rapports statistiques'],
  [/\brecords?\b|\bmeasure\w*|\blog\b/i, 'releves registre mesure'],
  [/\balerts?\b|\bnotif\w*|\breminders?\b|\bdue dates?\b|\bexpir\w*/i, 'alerte echeance notification'],
  [/\boffline\b/i, 'hors ligne'],
  [/\btv\b|\bscreens?\b/i, 'ecran tv'],
  [/\bexport\w*/i, 'exporter pdf json'],
  [/\bfirst instruction\b|\bhow long\b/i, 'combien temps premiere instruction'],
  [/\bcameras?\b/i, 'cameras api'],
  [/\berp\b|\bmes\b|\bapi\b|\bintegrat\w*/i, 'erp mes api connecteurs'],
]
const bridged = (q: string) => [q, ...BRIDGE.filter(([re]) => re.test(q)).map(([, fr]) => fr)].join(' ')
const wordsOf = (q: string) => norm(bridged(q)).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w))

/** Une question sur les prix : la réponse dit les forfaits, jamais un montant. */
const PRICE = /\bprix\b|\btarifs?\b|co[uû]te|\bcombien\b.*\b(payer|abonnement|forfait)|\bprices?\b|\bpricing\b|\bcosts?\b|\bhow much\b/i
const hits = (hay: string, ws: string[]) => ws.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0)
const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)
const tidy = (s: string) => s.trim().replace(/[.;\s]+$/, '')
const short = (s: string, n = 300) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

/** Le sujet d'une section, sans son numéro ni ses parenthèses : « Capturer », « Traduire ». */
const topicOf = (title: string) => title.replace(/^\d+\.\s*/, '').replace(/\s*\([^)]*\)/g, '').trim()

const SECTIONS = KNOWLEDGE.split('\n## ')
  .slice(1)
  .map((s) => ({ title: s.split('\n')[0].trim(), body: s.split('\n').slice(1).join('\n').trim() }))
const isMissingSection = (title: string) => /n'existe pas encore|prévoit ensuite/i.test(title)
const REGULAR = SECTIONS.filter((s) => !isMissingSection(s.title))

/** Une fonction que la base dit absente : « Nom : pas encore / non / prévu ; aujourd'hui, ce qui s'en approche ». */
interface Missing {
  name: string
  closest?: string
  planned: boolean
  hay: string
}

const MARKER = /^(pas encore|non\b|prévue?\b|à venir)/i
const MISSING: Missing[] = SECTIONS.filter((s) => /n'existe pas encore/i.test(s.title)).flatMap((sec) =>
  sec.body
    .split(/\n(?=- )/)
    .map((b) => b.replace(/^- /, '').replace(/\s*\n\s*/g, ' ').trim())
    .flatMap((bullet): Missing[] => {
      const at = bullet.indexOf(' : ')
      if (at < 0) return []
      const status = bullet.slice(at + 3).trim()
      if (!MARKER.test(status)) return []
      const name = bullet.slice(0, at).replace(/\s*\([^)]*\)/g, '').trim()
      const today = /aujourd'hui\s*[:,]\s*(.+)$/i.exec(status)?.[1] ?? ''
      const closest = tidy(today)
      return [{ name, closest: closest ? upperFirst(closest) : undefined, planned: /^prévue?\b|à venir/i.test(status), hay: norm(bullet) }]
    }),
)

/** Un mot rare dans la base pèse plus qu'un mot courant : un poids tf-idf, sans dépendance. */
const DOCS = [...REGULAR.map((s) => norm(`${s.title} ${s.body}`)), ...MISSING.map((m) => m.hay)]
const weight = (w: string) => Math.log(1 + DOCS.length / (1 + DOCS.filter((d) => d.includes(w)).length))

function scored(hay: string, head: string, ws: string[]) {
  let score = 0
  let distinct = 0
  for (const w of ws) {
    if (!hay.includes(w)) continue
    distinct++
    score += weight(w) * (head.includes(w) ? 2 : 1)
  }
  return { score, distinct }
}

function bestSection(ws: string[]) {
  return REGULAR.map((s) => ({ s, ...scored(norm(`${s.title} ${s.body}`), norm(s.title), ws) })).sort((a, b) => b.score - a.score)[0]
}

function bestMissing(ws: string[]) {
  return MISSING.map((m) => ({ m, ...scored(m.hay, norm(m.name), ws) })).sort((a, b) => b.score - a.score)[0]
}

/**
 * Où le voir : le chapitre d'une vidéo publiée qui nomme le sujet de la section (« Retoucher, annoter,
 * traduire » pour « Traduire »), sinon la vidéo la plus proche. Les titres sont ceux du catalogue ; une
 * vidéo « Bientôt » n'est jamais recommandée.
 */
function whereToSee(sec: { title: string; body: string }, published: GuideVideo[]): string | null {
  const d = messages().decouvrir.advisor.demo
  const words = messagesIn('fr').decouvrir.videos
  const stems = (q: string) => [...new Set(wordsOf(q).map((w) => w.slice(0, 5)))]
  const topic = stems(topicOf(sec.title))
  const body = stems(sec.body.slice(0, 800))
  let best: { score: number; text: string } | null = null
  for (const v of published) {
    for (const c of v.chapters) {
      const hay = norm(c.title)
      const named = topic.filter((w) => hay.includes(w)).length
      if (!named) continue
      const score = named * 3 + body.filter((w) => hay.includes(w)).length
      if (!best || score > best.score) best = { score, text: d.seeChapter(c.title, words[v.id].title, clock(c.t)) }
    }
  }
  if (best) return best.text
  const ws = wordsOf(`${sec.title} ${sec.body.slice(0, 600)}`)
  const video = VIDEO_IDS.filter((id) => published.some((v) => v.id === id))
    .map((id) => ({ title: words[id].title, score: hits(norm(`${words[id].title} ${words[id].summary}`), ws) }))
    .sort((a, b) => b.score - a.score)[0]
  return video && video.score >= 2 ? d.see(video.title) : null
}

/** Les fonctions de Clip touchées par un besoin, en un ou deux mots. */
const MODULES: [RegExp, string][] = [
  [/vid[ée]o|photo|note vocale|captur|filmer/i, 'capture'],
  [/g[ée]n[ée]r|r[ée]dig/i, 'génération'],
  [/tradu|langue/i, 'traduction'],
  [/\bpdf\b|\bword\b|import|ancienne/i, 'import'],
  [/approb|signature|publi/i, 'approbation'],
  [/poste|tablette|\bqr\b|code-barre/i, 'au poste'],
  [/[ée]quipe|op[ée]rateur|formation|comp[ée]tence/i, 'équipe et formation'],
  [/relev[ée]|mesure|registre|[ée]cart/i, 'relevés'],
  [/rapport|statistique/i, 'rapports'],
  [/alerte|avertiss|notification|courriel|[ée]ch[ée]ance|relecture|r[ée]vision/i, 'échéances et avertissements'],
  [/\berp\b|\bmes\b|\bapi\b|webhook|gmao|cam[ée]ra/i, 'intégrations'],
]
const modulesFor = (q: string) => MODULES.filter(([re]) => re.test(q)).map(([, m]) => m)

/** Où en est un échange sur un besoin : 0 = aucun ; 1 à 3 = la question posée en dernier. */
function stageOf(history: AdvisorMessage[], questions: readonly string[]): number {
  const last = [...history].reverse().find((m) => m.role === 'assistant')?.text.trim() ?? ''
  return questions.findIndex((q) => last.endsWith(q)) + 1
}

/** La question d'origine et les réponses déjà données, depuis l'invitation à décrire le besoin. */
function needThread(history: AdvisorMessage[], first: string) {
  let start = -1
  history.forEach((m, i) => {
    if (m.role === 'assistant' && m.text.trim().endsWith(first)) start = i
  })
  const origin = start > 0 ? ([...history.slice(0, start)].reverse().find((m) => m.role === 'user')?.text ?? '') : ''
  return { origin, answers: start >= 0 ? history.slice(start + 1).filter((m) => m.role === 'user').map((m) => m.text) : [] }
}

function finalNeed(lastAnswer: string, prev: Extract, history: AdvisorMessage[]): { reponse: string; extraction: Extract } {
  const d = messages().decouvrir.advisor.demo
  const { origin, answers } = needThread(history, d.questions[0])
  const [today = '', freq = '', ideal = ''] = [...answers, lastAnswer].map((a) => short(a))
  const found = bestMissing(wordsOf(origin))
  const item = found && found.distinct > 0 ? found.m : null
  const titre = short(item?.name ?? upperFirst(tidy(origin.replace(/\?+\s*$/, ''))), 120) || d.untitled
  const contexte = [prev.entreprise, prev.role].filter(Boolean).join(', ')
  const need = {
    titre,
    probleme: today || titre,
    ...(contexte ? { contexte } : {}),
    ...(freq ? { frequence: short(freq, 400) } : {}),
    ...(ideal ? { impact: ideal } : {}),
    verbatims: [origin, today].map((v) => short(v, 200)).filter(Boolean),
    modulesLies: modulesFor(`${item?.name ?? ''} ${origin}`),
    ...(item?.closest ? { existant: item.closest } : {}),
  }
  const third = [freq && d.frequencyLine(lowerFirst(tidy(freq))), ideal && d.idealLine(lowerFirst(tidy(ideal)))].filter(Boolean).join(' ')
  const lines = [`**${titre}**`, d.todayLine(today ? `${lowerFirst(tidy(today))}.` : d.toSpecify), third || d.rest]
  const reponse = `${d.needIntro}\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n\`\`\`besoin\n${JSON.stringify(need)}\n\`\`\``
  return { reponse, extraction: { ...prev, besoins: prev.besoins.includes(titre) ? prev.besoins : [...prev.besoins, titre] } }
}

/**
 * La réponse de démonstration à une question. `published` : les vidéos tournées et leurs chapitres, seules à recommander.
 * L'extraction suit la même forme que celle du vrai conseiller.
 */
export function demoAnswer(q: string, prev: Extract, history: AdvisorMessage[] = [], published: GuideVideo[] = [], hint?: string): { reponse: string; extraction: Extract } {
  const d = messages().decouvrir.advisor.demo
  const ws = wordsOf(hint ? `${q} ${hint}` : q)
  const best = bestSection(ws)
  const stage = stageOf(history, d.questions)
  if (stage > 0) {
    if (d.no.test(q.trim())) return { reponse: d.declined, extraction: prev }
    // Une vraie question sur Clip en plein milieu : on y répond (plus bas) ; sinon, c'est la réponse à la question posée.
    const newQuestion = q.includes('?') && !!best && best.distinct >= 2
    if (!newQuestion) {
      if (stage < d.questions.length) return { reponse: `${stage === 1 ? d.thanks : d.ok}\n\n${d.questions[stage]}`, extraction: prev }
      return finalNeed(q, prev, history)
    }
  }

  // Les prix : les forfaits, sans montant ; un conseiller d'Intelligence Industrielle les donne.
  if (PRICE.test(q)) {
    const plans = SECTIONS.find((sec) => /^Forfaits/.test(sec.title))
    const lines = (plans?.body ?? '')
      .split(/\n(?=- )/)
      .map((b) => b.replace(/\s*\n\s*/g, ' ').trim())
      .filter((b) => b && !/^- Les prix/.test(b))
      .join('\n')
    return { reponse: [d.prices, lines, d.note, d.discovery].join('\n\n'), extraction: prev }
  }

  const missing = bestMissing(ws)
  const known = !!missing && missing.distinct > 0 && missing.score > (best?.score ?? 0)
  // Une question qui ne touche presque rien de la base (un seul mot, et courant) : ce n'est pas dans Clip.
  const unknown = (!best || best.distinct <= 1) && ws.length >= 2
  if (known || unknown) {
    const item = known ? missing.m : null
    const parts = [`**${d.notYet}**`]
    if (item?.closest) parts.push(d.closest(lowerFirst(item.closest)))
    if (item?.planned) parts.push(d.planned)
    parts.push(d.invite, d.note, d.questions[0])
    return { reponse: parts.join('\n\n'), extraction: prev }
  }

  const sec = best && best.score > 0 ? best.s : SECTIONS[0]
  // Les premiers points de la section, chacun sur une ligne (la base est coupée à la largeur du code).
  const lines = sec.body
    .split(/\n(?=- )/)
    .map((b) => b.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 4)
    .join('\n')
  const topic = topicOf(sec.title)
  const see = whereToSee(sec, published)
  const reponse = [d.today(topic), lines, ...(see ? [see] : []), d.note, d.discovery].join('\n\n')
  return { reponse, extraction: { ...prev, modules: prev.modules.includes(topic) ? prev.modules : [...prev.modules, topic] } }
}

/**
 * Les exemples de l'écran du conseiller (dictionnaire `decouvrir.advisor.starters`, dans le même ordre) : les
 * mots de la base qu'ils visent, pour que la démonstration trouve la bonne section dans toutes les langues.
 */
export const STARTER_HINTS = [
  'importer anciennes procédures pdf word',
  'opérateur trouve instruction poste code tablette',
  'traduire langues espagnol arabe',
  'approbation approuver publier',
  'fiche cadenassage énergies isolement',
  'combien temps première instruction',
]

/** Pour les tests : les fonctions absentes que la base déclare (nom, prévue ou non). */
export const missingFeatures = () => MISSING.map(({ name, planned, closest }) => ({ name, planned, closest }))
