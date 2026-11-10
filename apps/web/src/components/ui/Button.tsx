'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/util/cn'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger' | 'success' | 'dark'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-primary text-white shadow-primary hover:brightness-105',
  glass: 'glass-card text-slate-900 dark:text-white hover:bg-white/70 dark:hover:bg-slate-700/60',
  ghost: 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5',
  danger: 'bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] text-white shadow-[0_10px_20px_rgba(255,43,94,0.3)]',
  success: 'bg-gradient-to-br from-[#2EE59D] to-[#18c480] text-white shadow-[0_10px_20px_rgba(24,196,128,0.3)]',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm gap-2 rounded-2xl',
  md: 'h-12 px-5 text-sm gap-2 rounded-full',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-full',
  xl: 'h-20 px-10 text-xl gap-3 rounded-full tracking-wide',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', loading, icon, iconRight, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'btn-press inline-flex select-none items-center justify-center font-black whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export function LinkButton({
  href,
  variant = 'glass',
  size = 'md',
  icon,
  iconRight,
  block,
  className,
  children,
}: {
  href: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn('btn-press inline-flex select-none items-center justify-center font-black whitespace-nowrap', variants[variant], sizes[size], block && 'w-full', className)}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  )
}

export function IconButton({
  label,
  className,
  children,
  variant = 'ghost',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('btn-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl disabled:opacity-50', variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
