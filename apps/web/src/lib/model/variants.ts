/**
 * Les variantes d'une instruction et sa version courte.
 *
 * **Variantes** (toggle `variants`) : le démontage de la pompe A et celui de la pompe B sont presque les
 * mêmes. Une seule instruction les porte : elle nomme ses variantes (`InstructionContent.variants`,
 * deux au moins) et chaque étape dit où elle s'applique (`Step.variants` ; vide, partout). Au poste, la
 * personne touche sa variante au départ ; ne restent que ses étapes. On rédige, traduit, approuve et
 * publie une fois.
 *
 * **Version courte** (toggle `quickMode`), seulement si l'auteur le veut (`InstructionContent.quick`) :
 * au poste, « L'essentiel » pour les habitués ne garde que les étapes essentielles ; « Tout en détail »,
 * pour les nouveaux, toutes. Une étape avec un relevé ou une mise en garde (danger, attention) reste
 * toujours : la trace et la sécurité ne se raccourcissent pas.
 */
import { uid } from './repo'
import type { InstructionContent, Step, Variant } from './types'

/** Au-delà, ce sont deux instructions. */
export const MAX_VARIANTS = 6
export const MAX_VARIANT_NAME = 40

export const newVariant = (name: string): Variant => ({ id: uid('var_'), name: name.replace(/\s+/g, ' ').trim().slice(0, MAX_VARIANT_NAME) })

/** L'instruction a-t-elle des variantes ? Il en faut deux pour choisir. */
export const hasVariants = (c: Pick<InstructionContent, 'variants'>): boolean => (c.variants?.length ?? 0) >= 2

/** L'étape s'applique-t-elle à cette variante ? Sans variante choisie, oui. */
export const inVariant = (step: Pick<Step, 'variants'>, variant: string | null | undefined): boolean => !variant || !step.variants?.length || step.variants.includes(variant)

/** Une étape qui reste toujours dans la version courte : un relevé à faire, une mise en garde (danger, attention). */
export const alwaysEssential = (step: Pick<Step, 'checks' | 'warning'>): boolean => !!step.checks?.length || step.warning?.level === 'danger' || step.warning?.level === 'caution'

export const isEssential = (step: Pick<Step, 'checks' | 'warning' | 'essential'>): boolean => alwaysEssential(step) || !!step.essential

/** Ce qu'on coche d'office en offrant la version courte : les étapes qui ont des points clés ou une mise en garde. */
export const suggestedEssential = (step: Step): boolean => alwaysEssential(step) || !!step.keyPoints?.length || !!step.warning

/** Les étapes à suivre : celles de la variante choisie, et, en version courte, les essentielles. */
export function stepsFor(c: Pick<InstructionContent, 'steps' | 'variants' | 'quick'>, opts: { variant?: string | null; quick?: boolean }): Step[] {
  const variant = hasVariants(c) ? opts.variant : null
  const quick = !!opts.quick && !!c.quick
  return c.steps.filter((s) => inVariant(s, variant) && (!quick || isEssential(s)))
}

/** Offrir (ou retirer) la version courte : la première fois, les étapes qui comptent sont cochées d'office. */
export function withQuick(c: InstructionContent, on: boolean): InstructionContent {
  if (!on) return { ...c, quick: false }
  const first = !c.steps.some((s) => s.essential !== undefined)
  return { ...c, quick: true, steps: first ? c.steps.map((s) => ({ ...s, essential: suggestedEssential(s) })) : c.steps }
}

/**
 * Retirer une variante : les étapes ne la nomment plus (une étape qui n'était qu'à elle s'applique
 * partout). Sous deux variantes, on ne choisit plus rien au poste (`hasVariants`), mais ce qui reste
 * garde ses marques, pour quand on en ajoute une autre.
 */
export function removeVariant(c: InstructionContent, id: string): InstructionContent {
  const variants = (c.variants ?? []).filter((v) => v.id !== id)
  return {
    ...c,
    variants: variants.length ? variants : undefined,
    steps: c.steps.map((s) => {
      if (!s.variants?.includes(id)) return s
      const next = s.variants.filter((v) => v !== id)
      if (next.length) return { ...s, variants: next }
      const { variants: _v, ...rest } = s
      return rest
    }),
  }
}

/** Les variantes d'une étape, en noms (pour une pastille, le PDF). Vide : toutes. */
export function variantNames(c: Pick<InstructionContent, 'variants'>, step: Pick<Step, 'variants'>): string[] {
  if (!hasVariants(c) || !step.variants?.length) return []
  return (c.variants ?? []).filter((v) => step.variants!.includes(v.id)).map((v) => v.name)
}

/** Les variantes rendues par l'IA (des noms), en vraies variantes ; moins de deux noms : aucune. */
export function variantsOfAi(names: unknown): Variant[] | null {
  const list = Array.isArray(names) ? [...new Set(names.filter((n): n is string => typeof n === 'string' && !!n.trim()).map((n) => n.replace(/\s+/g, ' ').trim().slice(0, MAX_VARIANT_NAME)))].slice(0, MAX_VARIANTS) : []
  return list.length >= 2 ? list.map(newVariant) : null
}

/**
 * Les variantes d'une étape rendues par l'IA (des noms), en identifiants. Un nom inconnu ne compte
 * pas ; toutes les variantes, c'est partout (rien à noter).
 */
export function stepVariantsOfAi(raw: unknown, variants: Variant[] | null | undefined): string[] | undefined {
  if (!variants?.length || !Array.isArray(raw)) return undefined
  const byName = new Map(variants.map((v) => [v.name.toLowerCase(), v.id]))
  const ids = [...new Set(raw.flatMap((n) => (typeof n === 'string' && byName.has(n.replace(/\s+/g, ' ').trim().toLowerCase()) ? [byName.get(n.replace(/\s+/g, ' ').trim().toLowerCase())!] : [])))]
  return ids.length && ids.length < variants.length ? variants.map((v) => v.id).filter((id) => ids.includes(id)) : undefined
}
