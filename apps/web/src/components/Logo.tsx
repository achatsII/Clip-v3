import { useId } from 'react'
import { brandMark, WORDMARK_VIEWBOX, wordmarkSvg } from '@/lib/brand/marks'

// Le site public (composants serveur) l'affiche aussi : rien ici qui tire les langues (`@/lib/util/cn` le fait).
const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

/**
 * Le symbole de CLIP (`BRAND_MARK`, banque de `src/lib/brand/marks.ts`), en blanc sur le dégradé de la
 * couleur du moment : le violet par défaut, le thème choisi dans Apparence, ou la couleur de l'usine.
 * Sans taille donnée, 40 px ; une taille donnée remplace celle-là (`cn` ne fusionne pas les classes).
 */
export function LogoMark({ className }: { className?: string }) {
  // Un id par instance : les masques du dessin ne se prêtent pas d'un logo à l'autre.
  const uid = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <span className={cn('bg-gradient-primary inline-flex shrink-0 overflow-hidden rounded-[22.5%] text-white', className || 'h-10 w-10')} aria-hidden>
      <svg viewBox="0 0 100 100" className="h-full w-full" dangerouslySetInnerHTML={{ __html: brandMark(uid) }} />
    </span>
  )
}

/** Le mot « clip », dessiné ; sa couleur est celle du texte. */
export function Wordmark({ className, label = 'CLIP' }: { className?: string; label?: string }) {
  return <svg viewBox={WORDMARK_VIEWBOX} role="img" aria-label={label} className={cn('block shrink-0', className || 'h-6 w-[39px]')} dangerouslySetInnerHTML={{ __html: wordmarkSvg() }} />
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      <span className="leading-none">
        <Wordmark className="h-6 w-[39px] text-slate-900 dark:text-white" />
        {subtitle && <span className="label-caps mt-1.5 block text-[9px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </span>
    </span>
  )
}
