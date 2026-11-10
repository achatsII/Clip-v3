import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/util/cn'

export function Panel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-panel rounded-[32px] p-5 sm:p-7', className)} {...rest}>
      {children}
    </div>
  )
}

export function Card({ className, children, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cn('glass-card rounded-[28px] p-5', interactive && 'lift cursor-pointer', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ title, action, hint }: { title: string; action?: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {hint && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-caps mb-1 text-slate-500 dark:text-slate-400">{eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl dark:text-white">{title}</h1>
        {subtitle && <div className="mt-1 text-sm font-medium text-slate-500 sm:text-base dark:text-slate-400">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Badge({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'bg-slate-900/[0.06] text-slate-700 dark:bg-white/10 dark:text-slate-200',
    primary: 'bg-primary-soft text-primary-strong dark:text-sky-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wide uppercase', tones[tone], className)}>{children}</span>
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-1.5 text-[10px] font-black tracking-widest text-white uppercase backdrop-blur-md', className)}>
      {children}
    </span>
  )
}
