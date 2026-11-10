'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/util/cn'

const base =
  'glass-input w-full rounded-2xl px-4 text-[15px] font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 transition focus:bg-white/70 focus:outline-none focus:ring-4 focus:ring-[rgba(var(--primary-rgb),0.18)] dark:text-white dark:focus:bg-slate-900/70'

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="label-caps text-slate-600 dark:text-slate-300">{children}</span>
      {hint && <span className="text-xs font-medium text-slate-400">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn(base, 'h-12', invalid && 'ring-2 ring-rose-400/60', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-24 py-3 leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(base, 'h-12 appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  )
})

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <p className="mt-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">{children}</p>
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="btn-press flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-2 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-black text-slate-900 dark:text-white">{label}</span>
        {description && <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <span className={cn('relative h-8 w-14 shrink-0 rounded-full transition-colors', checked ? 'bg-gradient-primary shadow-primary' : 'bg-slate-300 dark:bg-slate-600')}>
        <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" className={cn('glass-input inline-flex gap-1 rounded-2xl p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'btn-press inline-flex items-center justify-center gap-1.5 rounded-xl px-3 font-black',
            size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm',
            value === o.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ChoiceTile({ selected, onClick, icon, title, description, className }: { selected: boolean; onClick: () => void; icon?: ReactNode; title: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'btn-press flex min-h-20 w-full items-center gap-4 rounded-[24px] border-2 p-4 text-left transition',
        selected ? 'border-[var(--primary)] bg-primary-soft shadow-primary/30' : 'glass-card border-transparent hover:border-slate-200 dark:hover:border-slate-700',
        className,
      )}
    >
      {icon && <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', selected ? 'bg-gradient-primary text-white' : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>{icon}</span>}
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-900 dark:text-white">{title}</span>
        {description && <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
    </button>
  )
}
