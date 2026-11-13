/**
 * Une instruction dans la langue de l'opérateur : ses traductions (`content.translations`)
 * appliquées au contenu, médias compris. Fonctions pures, partagées par le lecteur et l'assistant.
 */
import { hashText } from '../util/hash'
import type { Check, EnergyPoint, InstructionContent, LockoutData, MediaTranslation, StepMedia, TranslatedContent } from './types'

/**
 * Ce qui nomme un média : son adresse (et l'extrait ou la page), ou l'empreinte d'un schéma. Une
 * traduction de média ne s'applique qu'au média qu'elle a traduit.
 */
export function mediaKey(m: StepMedia): string {
  if (m.kind === 'html') return `html:${hashText(m.html)}`
  if (m.kind === 'video') return `video:${m.url}#${m.start}-${m.end}`
  if (m.kind === 'document') return `document:${m.url}#${m.page ?? ''}`
  return `image:${m.url}`
}

/** Un média dans une autre langue ; tel quel si sa traduction manque ou ne le vise plus. */
export function localizeMedia(m: StepMedia, t: MediaTranslation | null | undefined): StepMedia {
  if (!t || t.of !== mediaKey(m)) return m
  const caption = t.caption || m.caption
  if (m.kind === 'image') {
    const labels = t.labels ?? {}
    return {
      ...m,
      caption,
      url: t.url || m.url,
      alt: t.alt || m.alt,
      annotations: m.annotations?.map((a) => (labels[a.id] ? { ...a, text: labels[a.id] } : a)),
    }
  }
  if (m.kind === 'html') return { ...m, caption, html: t.html || m.html, title: t.title || m.title }
  return { ...m, caption }
}

function localizeLockout(lockout: LockoutData, t: TranslatedContent['lockout']): LockoutData {
  if (!t) return lockout
  const points = new Map((t.energyPoints ?? []).map((p) => [p.id, p]))
  const pick = <K extends keyof EnergyPoint>(e: EnergyPoint, k: K): EnergyPoint[K] => ((points.get(e.id) as Partial<EnergyPoint> | undefined)?.[k] || e[k]) as EnergyPoint[K]
  return {
    ...lockout,
    equipment: t.equipment || lockout.equipment,
    location: t.location || lockout.location,
    material: t.material?.length === lockout.material?.length ? t.material : lockout.material,
    restartSteps: t.restartSteps?.length === lockout.restartSteps?.length ? t.restartSteps : lockout.restartSteps,
    energyPoints: lockout.energyPoints.map((e) => ({
      ...e,
      description: pick(e, 'description'),
      magnitude: pick(e, 'magnitude'),
      isolationDevice: pick(e, 'isolationDevice'),
      location: pick(e, 'location'),
      lockingMethod: pick(e, 'lockingMethod'),
      verification: pick(e, 'verification'),
    })),
  }
}

/**
 * Le contenu dans la langue choisie : textes, outils, fiche de cadenassage et médias (légendes,
 * annotations, schémas, images refaites). Ce qui manque à la traduction reste dans la langue
 * d'origine.
 */
export function localized(content: InstructionContent, lang: string): InstructionContent {
  const t = lang !== content.language ? content.translations?.[lang] : undefined
  if (!t) return content
  const byId = new Map(t.steps.map((s) => [s.id, s]))
  return {
    ...content,
    title: t.title || content.title,
    summary: t.summary || content.summary,
    safety: t.safety?.length ? t.safety : content.safety,
    tools: t.tools?.length === content.tools.length ? t.tools : content.tools,
    equipment: t.equipment || content.equipment,
    lockout: content.lockout ? localizeLockout(content.lockout, t.lockout) : content.lockout,
    steps: content.steps.map((s) => {
      const x = byId.get(s.id)
      if (!x) return s
      return {
        ...s,
        title: x.title || s.title,
        text: x.text || s.text,
        keyPoints: x.keyPoints?.length ? x.keyPoints : s.keyPoints,
        warning: s.warning ? { ...s.warning, text: x.warning || s.warning.text } : null,
        ...(s.section ? { section: x.section || s.section } : {}),
        media: s.media.map((m, i) => localizeMedia(m, x.media?.[i])),
        ...(s.checks ? { checks: localizeChecks(s.checks, x.checks) } : {}),
      }
    }),
  }
}

/** Les relevés dans la langue choisie : libellés et choix ; les ids, limites et unités ne changent pas. */
function localizeChecks(checks: Check[], t: TranslatedContent['steps'][number]['checks']): Check[] {
  if (!t?.length) return checks
  const byId = new Map(t.map((c) => [c.id, c]))
  return checks.map((c) => {
    const x = byId.get(c.id)
    if (!x) return c
    return { ...c, label: x.label || c.label, ...(c.options ? { options: c.options.map((o) => ({ ...o, label: x.options?.[o.id] || o.label })) } : {}) }
  })
}

/**
 * Range la traduction d'un média dans une langue déjà traduite (l'assistant, un seul média). La
 * traduction de l'étape se crée au besoin ; ce qui était déjà traduit pour ce média reste, sauf
 * ce que `t` remplace.
 */
export function withMediaTranslation(content: InstructionContent, lang: string, stepId: string, index: number, t: MediaTranslation): InstructionContent {
  const tr = content.translations?.[lang]
  if (!tr) return content
  const step = content.steps.find((s) => s.id === stepId)
  if (!step) return content
  const existing = tr.steps.find((s) => s.id === stepId)
  const media = Array.from({ length: step.media.length }, (_, i) => (existing?.media?.[i] ?? null) as MediaTranslation | null)
  const prev = media[index]
  media[index] = prev && prev.of === t.of ? { ...prev, ...t } : t
  const entry = existing ? { ...existing, media } : { id: stepId, title: '', text: '', media }
  const steps = existing ? tr.steps.map((s) => (s.id === stepId ? entry : s)) : [...tr.steps, entry]
  return { ...content, translations: { ...content.translations, [lang]: { ...tr, steps } } }
}
