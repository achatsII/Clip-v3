'use client'

import { RefreshCw, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '@/lib/gateway/client'
import { cn } from '@/lib/util/cn'
import { Button } from './Button'
import { messages, useMessages } from '@/lib/i18n'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} aria-hidden />
}

export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3', className)} aria-busy="true" aria-label={useMessages().common.loading}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card overflow-hidden rounded-[28px]">
          <Skeleton className="h-40 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={useMessages().common.loading}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card flex items-center gap-4 rounded-[24px] p-4">
          <Skeleton className="h-12 w-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, className }: { icon: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card flex flex-col items-center rounded-[32px] px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[rgba(var(--primary-rgb),0.2)] bg-primary-soft text-[var(--primary)] shadow-inner">{icon}</div>
      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[15px] font-medium text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function errorText(error: unknown): string {
  const t = messages().common.errors
  if (error instanceof ApiError) {
    if (error.code === 'network') return t.network
    if (error.code === 'timeout') return t.timeout
    if (error.status === 403) return t.forbidden
    if (error.status === 402) return t.noCredits
    if (error.status >= 500) return t.server
    return error.message
  }
  return t.unexpected
}

export function ErrorState({ error, onRetry, title, className }: { error?: unknown; onRetry?: () => void; title?: string; className?: string }) {
  const t = useMessages()
  return (
    <div className={cn('glass-card flex flex-col items-center rounded-[32px] px-6 py-10 text-center', className)} role="alert">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <WifiOff className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white">{title ?? t.common.loadFailed}</h3>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">{errorText(error)}</p>
      {onRetry && (
        <Button className="mt-5" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  )
}

export function ProgressBar({ value, label, indeterminate }: { value?: number; label?: ReactNode; indeterminate?: boolean }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div>
      {label && <div className="mb-1.5 flex justify-between text-xs font-black text-slate-500 dark:text-slate-400">{label}</div>}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/[0.07] dark:bg-white/10">
        <div className={cn('relative h-full rounded-full bg-gradient-primary transition-[width] duration-500', indeterminate && 'w-full')} style={indeterminate ? undefined : { width: `${pct}%` }}>
          <div className="shimmer-bar absolute inset-0" />
        </div>
      </div>
    </div>
  )
}
