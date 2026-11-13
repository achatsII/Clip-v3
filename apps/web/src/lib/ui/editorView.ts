'use client'

/**
 * La façon de modifier une instruction, retenue sur l'appareil (toggle `editorViews`) :
 * - `stage` : « Comme au poste », l'étape telle que l'opérateur la verra, modifiée sur place ;
 * - `form` : « Fiche », la liste des étapes et tous les outils de l'étape choisie, à découvert.
 * L'Aperçu n'est pas une façon de modifier : c'est le lecteur du poste, ouvert d'un geste.
 *
 * Sans choix, l'ordinateur ouvre la fiche (on y voit tout ce qu'on peut faire) et le téléphone,
 * l'étape comme au poste. La clé est celle de l'ancien choix de vue : un appareil qui l'avait fait
 * le retrouve.
 */
import { readPref, usePref, writePref } from '@/lib/prefs'
import { useWide } from './screen'

export type EditorView = 'stage' | 'form'

export const EDITOR_VIEW_KEY = 'clip_pref_editor_view'
/** Le choix de vue a été ouvert au moins une fois sur ce téléphone : son point bleu s'éteint. */
export const EDITOR_VIEWS_SEEN = 'clip_seen_editor_views'

export function parseEditorView(raw: string | null): EditorView | null {
  return raw === 'stage' || raw === 'form' ? raw : null
}

/** La vue de départ : celle choisie sur l'appareil, sinon la fiche au bureau et le poste au téléphone. */
export function editorViewOf(raw: string | null, wide: boolean, enabled: boolean): EditorView {
  if (!enabled) return 'stage'
  return parseEditorView(raw) ?? (wide ? 'form' : 'stage')
}

export function useEditorView(enabled: boolean): [EditorView, (v: EditorView) => void] {
  const wide = useWide()
  const raw = usePref(EDITOR_VIEW_KEY)
  return [editorViewOf(raw, wide, enabled), (v) => writePref(EDITOR_VIEW_KEY, v)]
}

export function useEditorViewsSeen(): [boolean, () => void] {
  const seen = usePref(EDITOR_VIEWS_SEEN) === '1'
  return [seen, () => readPref(EDITOR_VIEWS_SEEN) !== '1' && writePref(EDITOR_VIEWS_SEEN, '1')]
}
