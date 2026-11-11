/**
 * L'assistant du poste (Gemini Live, `/api/v1/ai/live/session`, et les questions écrites) : ce
 * qui part au modèle — sa consigne, ses fonctions, leurs réponses, le nom de la langue de ses
 * réponses. Tout reste en français : rien de tout cela ne s'affiche. Ce que l'opérateur lit à
 * l'écran est dans components/player/i18n.ts.
 */
import { LANGUAGES } from '../model/catalog'
import type { InstructionContent } from '../model/types'
import type { LiveTool } from './useLiveVoice'

const LANG_HINT: Record<string, string> = { fr: 'français québécois', en: 'English', es: 'español' }

/** La langue que parle l'assistant vocal ; une autre langue du poste se nomme par le catalogue. */
const spokenLanguage = (lang: string) => LANG_HINT[lang] ?? LANGUAGES[lang]?.label ?? lang

/** La langue des réponses écrites aux questions d'un opérateur, nommée au modèle. */
export const answerLanguage = (lang: string): string => LANGUAGES[lang]?.label ?? 'français'

export function voiceSystemPrompt(content: InstructionContent, lang: string) {
  const steps = content.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.text}${s.warning ? ` (${s.warning.level} : ${s.warning.text})` : ''}`).join('\n')
  return `Tu es l'assistant vocal d'un opérateur d'usine qui suit l'instruction « ${content.title} ». Il a les mains occupées. Parle en ${spokenLanguage(lang)}, phrases très courtes, ton calme et clair.
- Pour changer d'étape, appelle VRAIMENT la fonction (aller_etape_suivante, aller_etape_precedente, aller_a_etape) ; ne dis jamais que tu as changé d'étape sans l'avoir fait.
- Avant de répondre à « où j'en suis », appelle etat_instruction.
- Pour lire une étape, appelle etat_instruction puis lis son titre et son texte mot pour mot.
- Réponds aux questions UNIQUEMENT à partir de l'instruction ci-dessous ; si la réponse n'y est pas, dis-le et conseille de demander au superviseur. Ne devine jamais une valeur.
- Pour un danger ou une question de sécurité incertaine : dis d'arrêter et d'appeler le superviseur.
- Si l'opérateur veut signaler un problème, appelle signaler_probleme : le formulaire s'ouvre à l'écran.

INSTRUCTION :
${steps}`
}

/** Ce qu'on demande au modèle de dire en premier. */
export const voiceGreeting = (lang: string) => (lang === 'fr' ? 'Bonjour, présente-toi en une phrase et demande comment aider.' : 'Hello, introduce yourself in one sentence.')

export const VOICE_TOOLS: LiveTool[] = [
  { name: 'aller_etape_suivante', description: "Passe à l'étape suivante à l'écran. Appelle-la vraiment.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'aller_etape_precedente', description: "Revient à l'étape précédente à l'écran. Appelle-la vraiment.", parameters: { type: 'OBJECT', properties: {} } },
  {
    name: 'aller_a_etape',
    description: "Affiche l'étape demandée (1 = première). Appelle-la vraiment.",
    parameters: { type: 'OBJECT', properties: { numero: { type: 'NUMBER', description: "Numéro de l'étape, 1 = première" } }, required: ['numero'] },
  },
  { name: 'etat_instruction', description: "Rend l'étape affichée en ce moment et son contenu. À appeler avant de dire où en est l'opérateur.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'signaler_probleme', description: "Ouvre à l'écran le formulaire pour signaler qu'une étape n'est pas claire, fausse ou dangereuse.", parameters: { type: 'OBJECT', properties: {} } },
]

export interface VoiceToolContext {
  content: InstructionContent
  /** L'étape à l'écran : -1 avant de commencer, le nombre d'étapes une fois terminé. */
  index: number
  onGo: (i: number) => void
  onReport: () => void
}

/** Exécute une fonction appelée par le modèle ; sa réponse ne revient qu'au modèle. */
export function runVoiceTool(name: string, args: Record<string, unknown>, { content, index: i, onGo, onReport }: VoiceToolContext): Record<string, unknown> {
  const n = content.steps.length
  if (name === 'aller_etape_suivante') {
    if (i >= n - 1) {
      onGo(n)
      return { ok: true, message: 'Instruction terminée.' }
    }
    onGo(i + 1)
    return { ok: true, etape: i + 2, titre: content.steps[i + 1]?.title }
  }
  if (name === 'aller_etape_precedente') {
    if (i <= 0) return { ok: false, motif: 'Déjà à la première étape.' }
    onGo(i - 1)
    return { ok: true, etape: i, titre: content.steps[i - 1]?.title }
  }
  if (name === 'aller_a_etape') {
    const k = Math.round(Number(args.numero))
    if (!Number.isFinite(k) || k < 1 || k > n) return { ok: false, motif: `Il y a ${n} étapes.` }
    onGo(k - 1)
    return { ok: true, etape: k, titre: content.steps[k - 1].title }
  }
  if (name === 'etat_instruction') {
    const s = content.steps[i]
    return i < 0 ? { ecran: 'avant de commencer', etapes: n } : i >= n ? { ecran: 'terminé', etapes: n } : { etape: i + 1, sur: n, titre: s.title, texte: s.text, mise_en_garde: s.warning?.text ?? null, points_cles: s.keyPoints ?? [] }
  }
  if (name === 'signaler_probleme') {
    onReport()
    return { ok: true, message: 'Le formulaire est ouvert à l’écran.' }
  }
  return { ok: false, motif: 'Fonction inconnue' }
}
