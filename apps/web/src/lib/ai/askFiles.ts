/**
 * Les fichiers qu'une génération joint à l'IA, comptés avant de rien envoyer : la même règle que
 * `prepareForAi` (`generate.ts`), qui s'en sert. Un module à part, sans réseau : on sait d'avance si
 * la demande dépasse la limite de la route directe (`MAX_ASK_FILES`) et doit passer par le serveur.
 */
import type { Source } from '../model/types'

/**
 * Les photos prises en parlant, par note de série : seulement celles dont la note fait partie des
 * sources données (une revue de quelques sources peut ne pas l'avoir).
 */
export function narratedPhotos(sources: Source[]): Map<string, Source[]> {
  const audio = new Set(sources.filter((s) => s.kind === 'audio').map((s) => s.id))
  const out = new Map<string, Source[]>()
  for (const s of sources) {
    if (s.kind !== 'photo' || !s.voice || !audio.has(s.voice.sourceId)) continue
    out.set(s.voice.sourceId, [...(out.get(s.voice.sourceId) ?? []), s])
  }
  return out
}

/**
 * Au plus 6 images nettes d'un enregistrement d'écran partent en fichier à l'IA. Une image nette coûte
 * autant qu'une dizaine de secondes de la vidéo (≈ 790 jetons, contre ≈ 90 par seconde de vidéo : mesuré
 * en prod le 2026-11-17, 25 images valaient 4 fois la vidéo d'une minute). L'IA voit déjà l'écran dans
 * la vidéo, une image par seconde : les autres images restent nommées par leur instant, et elle peut
 * toujours en choisir une comme média d'une étape (le titre se lit à l'écran, l'image vient du stockage).
 */
export const MAX_SHOTS_FOR_AI = 6

/**
 * Les images nettes à joindre : au plus `max`, réparties sur l'enregistrement (la première et la
 * dernière comprises), dans l'ordre des sources. Rend leurs identifiants.
 */
export function shotsToAttach(sources: Source[], max = MAX_SHOTS_FOR_AI): Set<string> {
  // Seulement celles dont la vidéo part aussi : sans elle, l'IA ne verrait pas cet écran autrement.
  const present = new Set(sources.map((s) => s.id))
  const shots = sources.filter((s) => s.kind === 'photo' && s.shot && s.url && present.has(s.shot.sourceId))
  if (shots.length <= max) return new Set(shots.map((s) => s.id))
  if (max <= 0) return new Set()
  if (max === 1) return new Set([shots[0].id])
  const picked = new Set<string>()
  for (let i = 0; i < max; i++) picked.add(shots[Math.round((i * (shots.length - 1)) / (max - 1))].id)
  return picked
}

/**
 * Combien de fichiers `prepareForAi` joindra pour ces sources : les vidéos, les notes vocales sans
 * transcription (ou dites pendant une série de photos), les photos (les images nettes d'un
 * enregistrement d'écran au plus `MAX_SHOTS_FOR_AI`), les documents.
 */
export function plannedAskFiles(sources: Source[]): number {
  const narrated = narratedPhotos(sources)
  const attachedShots = shotsToAttach(sources)
  const present = new Set(sources.map((s) => s.id))
  let n = 0
  for (const s of sources) {
    if (s.kind === 'video' && s.url) n++
    else if (s.kind === 'audio' && s.url && (!s.text || narrated.has(s.id))) n++
    else if (s.kind === 'photo' && s.url) {
      if (s.shot && present.has(s.shot.sourceId) && !attachedShots.has(s.id)) continue
      n++
    } else if (s.kind === 'document' && s.url) n++
  }
  return n
}
