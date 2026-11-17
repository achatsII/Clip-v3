import { useId } from 'react'
import { brandMark, WORDMARK_VIEWBOX, wordmarkSvg } from '@/lib/brand/marks'
import { PRODUCT } from '@/lib/brand/product'

// Le site public (composants serveur) l'affiche aussi : rien ici qui tire les langues (`@/lib/util/cn` le fait).
const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

/**
 * Le symbole de la marque (`PRODUCT.mark`, banque de `src/lib/brand/marks.ts`), en blanc sur le dégradé de la
 * couleur du moment : l'indigo par défaut, le thème choisi dans Apparence, ou la couleur de l'usine.
 * Sans taille donnée, 40 px ; une taille donnée remplace celle-là (`cn` ne fusionne pas les classes).
 */
export function LogoMark({ className }: { className?: string }) {
  // Un id par instance : les masques du dessin ne se prêtent pas d'un logo à l'autre.
  const uid = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <span className={cn('bg-gradient-primary inline-flex shrink-0 overflow-hidden rounded-[22.5%] text-white', className || 'h-10 w-10')} aria-hidden>
      <svg viewBox="0 0 100 100" className="h-full w-full" dangerouslySetInnerHTML={{ __html: brandMark(uid, PRODUCT.mark) }} />
    </span>
  )
}

/** Le mot « gesto », écrit en Inter Black serré, sur une largeur fixe (`textLength`) : la mise en page ne dépend pas de la police. */
const TEXT_VIEWBOX = '0 0 230 92'
const textWordmark = (word: string) =>
  `<text x="2" y="68" font-size="88" font-weight="900" textLength="226" lengthAdjust="spacing" font-family="Inter, ui-sans-serif, system-ui, sans-serif" fill="currentColor">${word}</text>`

/**
 * Le mot de la marque à côté du symbole ; sa couleur est celle du texte. Sa largeur suit sa hauteur
 * (`w-auto` : les proportions du dessin) : « clip » dessiné pour CLIP, « gesto » écrit pour Gesto.
 */
export function Wordmark({ className, label = PRODUCT.name }: { className?: string; label?: string }) {
  const drawn = PRODUCT.wordmark === 'drawn'
  return (
    <svg
      viewBox={drawn ? WORDMARK_VIEWBOX : TEXT_VIEWBOX}
      role="img"
      aria-label={label}
      className={cn('block shrink-0', className || 'h-6 w-auto')}
      dangerouslySetInnerHTML={{ __html: drawn ? wordmarkSvg(PRODUCT.mark) : textWordmark(PRODUCT.name.toLowerCase()) }}
    />
  )
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      <span className="leading-none">
        <Wordmark className="h-6 w-auto text-slate-900 dark:text-white" />
        {subtitle && <span className="label-caps mt-1.5 block text-[9px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </span>
    </span>
  )
}
