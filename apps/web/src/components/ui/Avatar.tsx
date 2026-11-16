import { cn, initials } from '@/lib/util/cn'

/**
 * Le ton d'une personne : le pâle de la couleur du moment, ses initiales dans le foncé. Une personne
 * n'est ni une action (le dégradé de la primaire, celui du logo) ni l'IA ou un module (le dégradé
 * d'accent) : elle se distingue du logo et ne fait pas concurrence à l'action principale.
 */
export const AVATAR_TONE = 'bg-primary-soft font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]'

/** Les initiales d'une personne. Sans taille donnée : 40 px (`cn` ne fusionne pas les classes). */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span aria-hidden className={cn(AVATAR_TONE, 'flex shrink-0 items-center justify-center', className || 'h-10 w-10 rounded-2xl text-sm')}>
      {initials(name)}
    </span>
  )
}
