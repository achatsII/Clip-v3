/**
 * Les consignes données à l'IA. Le standard de rédaction de l'usine et ses apprentissages y
 * sont injectés : c'est ainsi qu'une usine « règle » son générateur sans toucher au code.
 */
import { CATEGORIES, ENERGY, PPE } from '../model/catalog'
import type { InstructionContent, OrgSettings, Step, WritingStandard } from '../model/types'

const TONE: Record<WritingStandard['tone'], string> = {
  infinitif: "à l'infinitif (« Retirer le garde »), sans tutoyer ni vouvoyer",
  tu: 'en tutoyant (« Retire le garde »)',
  vous: 'en vouvoyant (« Retirez le garde »)',
}

export function standardBlock(org: Pick<OrgSettings, 'standard' | 'learnings'>): string {
  const s = org.standard
  const lines: string[] = []
  // Une usine plus ancienne peut ne pas avoir de standard enregistré : l'IA suit alors ses règles de base.
  if (!s) return ''
  lines.push('STANDARD DE RÉDACTION DE L’USINE (prioritaire) :')
  s.rules.forEach((r) => lines.push(`- ${r}`))
  lines.push(`- Au plus ${s.maxWordsPerStep} mots par texte d’étape, ${TONE[s.tone]}.`)
  if (s.startWithSafety) lines.push('- La première étape est toujours une étape de sécurité : EPI à porter et risques à connaître, même brièvement.')
  if (s.glossary.length) {
    lines.push('VOCABULAIRE DE L’USINE (utilise ces termes) :')
    s.glossary.forEach((g) => lines.push(`- « ${g.term} » : ${g.meaning}`))
  }
  if (org.learnings?.length) {
    lines.push('CE QUE L’USINE A DEMANDÉ APRÈS DE PRÉCÉDENTES GÉNÉRATIONS (applique-le) :')
    org.learnings.slice(-12).forEach((l) => lines.push(`- ${l.text}`))
  }
  return lines.join('\n')
}

const LOCKOUT_RULES = `FICHE DE CADENASSAGE — si les sources décrivent l’isolement des énergies d’un équipement (cadenassage, LOTO, intervention de maintenance sur une machine à l’arrêt), produis kind = "lockout" et remplis "lockout", en respectant le RSST (Québec, art. 188.1 à 188.13) et la norme CSA Z460 :
- identifie l’équipement et sa localisation ;
- liste CHAQUE source d’énergie (${Object.keys(ENERGY).join(', ')}) avec un repère (E1, P1, H1…), sa description, sa magnitude si elle est connue, le dispositif d’isolement, son emplacement, la méthode de cadenassage et la méthode de vérification de l’absence d’énergie ;
- les étapes suivent l’ordre : aviser les personnes touchées, arrêter l’équipement normalement, isoler chaque source, poser cadenas et étiquettes, dissiper les énergies résiduelles (purger, bloquer, décharger), vérifier l’absence d’énergie (essai de démarrage), puis effectuer le travail ;
- "restartSteps" décrit le retrait des cadenas et la remise en marche, dans l’ordre ;
- une source probable mais non confirmée par les sources est quand même listée, avec « À confirmer » dans sa description, et fait l’objet d’une question.`

export function generationSystem(org: Pick<OrgSettings, 'standard' | 'learnings'>, opts: { language: string; forceKind?: 'procedure' | 'lockout' }): string {
  return `Tu es un expert en méthodes industrielles et en instructions de travail pour le plancher de production (méthode TWI « Job Instruction », travail standardisé, SST). Tu transformes des notes de terrain — vidéos, photos, notes vocales, notes écrites, anciens documents — en une instruction de travail exacte, claire et visuelle, pour des opérateurs qui lisent peu, debout, parfois avec des gants.

RÈGLES D’ÉCRITURE :
- Une étape = une seule action observable. Titre : verbe d’action à l’infinitif + objet, 2 à 8 mots.
- Le texte d’une étape est court et concret ; aucune phrase inutile ; pas de jargon sans explication.
- Points clés : ce qui fait réussir l’étape (sécurité, qualité, efficacité), avec la raison quand elle aide. 0 à 3 par étape.
- Mise en garde (warningLevel) seulement si un risque réel existe à cette étape : "danger" = blessure grave possible ; "caution" = blessure légère ou dommage ; "info" = astuce importante ; sinon "none".
- N’invente JAMAIS une valeur (couple, pression, température, quantité, numéro de pièce, réglage) : si elle n’est ni dite ni visible, ne l’écris pas et pose une question.
- Respecte l’ordre réel des gestes, tel qu’on le voit et l’entend dans les sources.
- Langue de sortie : ${opts.language === 'fr' ? 'français québécois clair, avec les termes du métier en usage au Québec (EPI, cadenassage, quart de travail…)' : opts.language === 'en' ? 'anglais nord-américain clair (English), avec les termes du métier en usage dans les usines (PPE, lockout/tagout, shift…)' : `la langue « ${opts.language} »`}.

MÉDIAS :
- Chaque étape porte le média qui montre le mieux l’action :
  · un extrait vidéo (start et end en secondes, 3 à 20 s, centré sur le geste) quand le mouvement compte : manipuler, tourner, insérer, enchaîner des gestes ;
  · une image fixe tirée de la vidéo (at = l’instant en secondes, sans start ni end) quand un coup d’œil suffit : un bouton à appuyer, un réglage, une étiquette, une position, un état à vérifier. Choisis l’instant où ce qu’il faut voir est net et bien visible. Ajoute focus = [ymin, xmin, ymax, xmax] (0 à 1000) et focusLabel (1 à 3 mots) autour de ce qu’il faut regarder, seulement si c’est clairement visible à cet instant ;
  · une photo, ou la page d’un document (plan, dessin, schéma).
- Référence uniquement les identifiants de sources fournis (S1, S2…). Pour une vidéo, start < end, et start, end et at restent dans la durée indiquée.
- Le plus souvent, l’extrait vidéo ; l’image fixe seulement quand le mouvement n’apporte rien (un « appuyer sur le bouton » n’a pas besoin de trois secondes de vidéo).
- Une étape sans média pertinent garde une liste vide plutôt qu’un média hors sujet.

CLASSEMENT :
- category parmi : ${Object.entries(CATEGORIES).map(([k, v]) => `${k} (${v.label})`).join(', ')}.
- station : le poste, la machine ou l’équipement nommé (« Machine 1234 », « Presse P-12 ») ; vide si rien ne le dit. Utilise de préférence le nom d’un poste existant de l’usine s’il correspond.
- frequency : seulement si elle est dite.
- tags : 2 à 6 mots-clés utiles à la recherche, en minuscules.
- ppe : uniquement parmi ${Object.keys(PPE).join(', ')}, ce qui est requis, dit ou visible.

${opts.forceKind === 'lockout' ? 'La personne a choisi le format « fiche de cadenassage » : kind = "lockout".\n' : opts.forceKind === 'procedure' ? 'La personne a choisi le format « instruction de travail » : kind = "procedure".\n' : ''}${LOCKOUT_RULES}

${standardBlock(org)}

QUESTIONS : liste au plus 4 points que les sources ne permettent pas de trancher et qu’une personne doit vérifier avant de publier. Aucune question si tout est clair.`
}

export interface SourceLine {
  id: string
  line: string
}

export function generationPrompt(input: { intent?: string; stations: string[]; sources: SourceLine[]; title?: string }): string {
  const parts: string[] = []
  if (input.intent?.trim()) parts.push(`CE QUE LA PERSONNE A DIT DE CETTE INSTRUCTION : « ${input.intent.trim()} »`)
  if (input.title?.trim() && input.title !== 'Nouvelle instruction') parts.push(`TITRE DE TRAVAIL : « ${input.title.trim()} »`)
  if (input.stations.length) parts.push(`POSTES ET ÉQUIPEMENTS EXISTANTS DE L’USINE : ${input.stations.slice(0, 200).join(' ; ')}`)
  parts.push(`SOURCES (${input.sources.length}) :`)
  input.sources.forEach((s) => parts.push(s.line))
  parts.push('Rédige l’instruction de travail à partir de ces sources.')
  return parts.join('\n')
}

export function importSystem(org: Pick<OrgSettings, 'standard' | 'learnings'>, language = 'fr'): string {
  return `${generationSystem(org, { language })}

CONTEXTE PARTICULIER : la source est une ANCIENNE instruction (PDF). Restructure-la fidèlement selon les règles ci-dessus, sans rien perdre d’important et sans rien inventer : chaque consigne, valeur, mise en garde et EPI du document doit se retrouver dans le résultat. Quand une figure, un plan ou une photo d’une page illustre une étape, mets en média {source: "S1", page: n}.`
}

function contentForPrompt(content: InstructionContent, focusStepId?: string): string {
  const lines: string[] = [`TITRE : ${content.title}`, `RÉSUMÉ : ${content.summary}`]
  if (content.ppe.length) lines.push(`EPI : ${content.ppe.map((p) => PPE[p] ?? p).join(', ')}`)
  if (content.safety.length) lines.push(`MISES EN GARDE : ${content.safety.join(' | ')}`)
  content.steps.forEach((s, i) => {
    const mark = s.id === focusStepId ? '  ← ÉTAPE À MODIFIER' : ''
    lines.push(`${i + 1}. [${s.id}] ${s.title} — ${s.text}${s.keyPoints?.length ? ` (points clés : ${s.keyPoints.join(' ; ')})` : ''}${s.warning ? ` (${s.warning.level} : ${s.warning.text})` : ''}${mark}`)
  })
  return lines.join('\n')
}

export const STEP_ACTIONS = {
  simplify: 'Simplifie cette étape : mots plus courts et plus simples, même sens, aucune information perdue.',
  clarify: 'Rends cette étape plus claire pour un opérateur qui la fait pour la première fois.',
  keypoint: 'Ajoute le point clé qui manque le plus (sécurité, qualité ou efficacité), avec sa raison.',
  safety: 'Vérifie la sécurité de cette étape : ajoute ou corrige la mise en garde si un risque existe ; sinon laisse-la vide.',
} as const

export function stepAssistSystem(org: Pick<OrgSettings, 'standard' | 'learnings'>): string {
  return `Tu corriges UNE étape d’une instruction de travail d’usine, selon la demande. Tu gardes le sens et les valeurs exactes ; tu n’inventes aucune valeur. Titre : verbe à l’infinitif + objet, 2 à 8 mots. Français québécois clair.

${standardBlock(org)}`
}

export function stepAssistPrompt(content: InstructionContent, step: Step, request: string): string {
  return `${contentForPrompt(content, step.id)}

DEMANDE : ${request}

Rends l’étape [${step.id}] corrigée.`
}

export function translateSystem(language: string): string {
  return `Tu traduis une instruction de travail d’usine vers la langue « ${language} », pour des opérateurs dont c’est la langue maternelle. Phrases courtes et simples, termes du métier exacts, valeurs et unités inchangées, mêmes identifiants d’étapes. Tu ne résumes rien et tu n’ajoutes rien.`
}

export function translatePrompt(content: InstructionContent): string {
  return JSON.stringify({
    title: content.title,
    summary: content.summary,
    safety: content.safety,
    steps: content.steps.map((s) => ({ id: s.id, title: s.title, text: s.text, keyPoints: s.keyPoints ?? [], warning: s.warning?.text ?? '' })),
  })
}

export function annotateSystem(): string {
  return 'Tu repères sur une photo d’atelier ce que le geste d’une étape de travail touche (poignée, vis, bouton, sectionneur, pièce…). Tu rends 1 à 3 marques avec leur boîte [ymin, xmin, ymax, xmax] normalisée de 0 à 1000, serrée sur l’objet. "circle" pour un petit élément, "rect" pour une zone, "arrow" pour montrer un sens ou un point précis. Libellés en français, 1 à 4 mots.'
}

export function annotatePrompt(step: Step, request?: string): string {
  if (request?.trim()) return `ÉTAPE : ${step.title} — ${step.text}\nDEMANDE PRÉCISE : ${request.trim()}\nMarque exactement ce qui est demandé, rien d’autre. Si un texte est demandé, mets-le tel quel dans label. Si une couleur est demandée, donne-la dans color.`
  return `ÉTAPE : ${step.title} — ${step.text}\nMarque sur la photo ce que l’opérateur doit regarder ou toucher pour cette étape.`
}

export function illustrateSystem(): string {
  return 'You write prompts for an image model that produces clean industrial work-instruction illustrations: flat technical illustration, isometric or front view, plain light background, high contrast, no text, no logos, safety colors where relevant (red for danger, yellow for caution). The illustration must show exactly the action of the step, based on the reference photo.'
}

export function illustratePrompt(step: Step): string {
  return `Step: ${step.title} — ${step.text}. Write one prompt (max 70 words) describing the illustration to generate from the reference photo.`
}

export function questionSystem(language: string): string {
  return `Tu es l’assistant d’un opérateur d’usine qui suit une instruction de travail. Tu réponds à sa question en t’appuyant UNIQUEMENT sur l’instruction fournie. Réponse courte (40 mots au plus), concrète, dans la langue « ${language} ». Si l’instruction ne contient pas la réponse, dis-le simplement et conseille de demander à son superviseur ; ne devine jamais une valeur. Pour toute question de sécurité incertaine : arrêter et demander.`
}

export function questionPrompt(content: InstructionContent, currentStep: number, question: string): string {
  return `${contentForPrompt(content)}\n\nL’opérateur est à l’étape ${currentStep + 1}.\nQUESTION : ${question}`
}

export function standardAgentSystem(): string {
  return `Tu aides une usine à définir son standard de rédaction d’instructions de travail. À partir de ce que la personne décrit (règles, habitudes, exigences de sécurité, vocabulaire), tu produis un standard clair : 5 à 10 règles courtes en mots simples, si la première étape doit toujours porter sur la sécurité, le nombre maximal de mots par étape (10 à 60), le ton (infinitif, tu ou vous) et le vocabulaire propre à l’usine. Garde les bonnes pratiques reconnues (une action par étape, mises en garde à l’étape du risque, valeurs exactes avec unités) sauf si la personne demande autre chose.`
}

/** Un schéma pour une étape : une page HTML autonome, lisible sur une tablette d'atelier. */
export function visualSystem(language: string): string {
  return `Tu crées des schémas pour des instructions de travail en usine. Tu rends UNE page HTML complète et autonome (<!doctype html>…), qui remplit tout son cadre (100 % de la largeur et de la hauteur, sans défilement) :
- Un schéma 2D en SVG (viewBox, mis à l’échelle) par défaut : vue de face, de dessus ou en coupe, traits nets, formes simples, fond blanc, fort contraste.
- Une vue 3D seulement si la demande l’exige : Three.js chargé uniquement depuis https://cdn.jsdelivr.net/npm/three@0.160.0/ (module), une scène simple qui tourne doucement et qu’on peut faire pivoter au doigt.
- Libellés courts dans la langue « ${language} », gros (16 px ou plus), flèches et numéros pour l’ordre des gestes. Couleurs de sécurité : rouge danger, jaune prudence, vert correct, bleu information.
- CSS et JS dans la page ; aucune image, police, formulaire, alerte, stockage ou appel réseau hors de la bibliothèque 3D.
- Moins de 40 000 caractères. N’invente aucune valeur (couple, pression, cote) : seulement celles de l’étape.`
}

export function visualPrompt(content: InstructionContent, step: Step, request: string): string {
  const kp = step.keyPoints?.length ? `\nPoints clés : ${step.keyPoints.join(' ; ')}` : ''
  const w = step.warning ? `\nMise en garde (${step.warning.level}) : ${step.warning.text}` : ''
  return `INSTRUCTION : ${content.title}${content.equipment ? ` (${content.equipment})` : ''}\nÉTAPE : ${step.title} — ${step.text}${kp}${w}\nSCHÉMA DEMANDÉ : ${request.trim() || 'le schéma qui rend ce geste évident'}`
}
