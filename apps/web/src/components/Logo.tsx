import { useId } from 'react'
import { cn } from '@/lib/util/cn'

export function LogoMark({ className }: { className?: string }) {
  // Un id par instance : la barre latérale masquée (display:none) ne peut pas prêter son dégradé.
  const id = `clip-g-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C6FF" />
          <stop offset="1" stopColor="#0078FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id})`} />
      <path d="M41.5 22.5a13 13 0 1 0 0 19" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="44" cy="32" r="4" fill="#fff" />
    </svg>
  )
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block text-xl font-black tracking-tighter text-slate-900 dark:text-white">CLIP</span>
        {subtitle && <span className="label-caps mt-1 block text-[9px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </span>
    </span>
  )
}
