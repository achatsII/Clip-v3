/**
 * Les briques du site public (composants serveur) : conteneur, sur-titre, titres, logo de Clip, liens
 * d'action et icônes. Aucun texte ici : tout vient des dictionnaires du site (`src/lib/site/content`).
 */
import {
  ArrowRight,
  BarChart3,
  Binary,
  BookOpen,
  Brain,
  Check,
  Clock,
  GraduationCap,
  Hand,
  Image as ImageIcon,
  Languages,
  Layers,
  Lock,
  PenLine,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Volume2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { LogoMark, Wordmark as ClipWordmark } from '@/components/Logo'
import type { SiteCta } from '@/lib/site/routes'

/** Joindre des classes (le site n'importe pas `cn` de l'app, lié aux langues de l'outil). */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

export function Container({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx('mx-auto w-full px-4 sm:px-6 lg:px-8', wide ? 'max-w-7xl' : 'max-w-6xl', className)}>{children}</div>
}

export function Eyebrow({ children, tone = 'primary', className }: { children: ReactNode; tone?: 'primary' | 'ai' | 'light'; className?: string }) {
  return (
    <p
      className={cx(
        'label-caps inline-flex items-center gap-2',
        tone === 'primary' && 'text-[var(--primary-strong)] dark:text-[var(--primary-light)]',
        tone === 'ai' && 'text-[#7a14d6] dark:text-violet-300',
        tone === 'light' && 'text-sky-200',
        className,
      )}
    >
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', tone === 'ai' ? 'bg-gradient-accent' : 'bg-gradient-primary')} />
      {children}
    </p>
  )
}

/** Le titre d'une section (h2) et son texte d'introduction. */
export function SectionHeading({ eyebrow, title, text, center, id }: { eyebrow?: ReactNode; title: ReactNode; text?: ReactNode; center?: boolean; id?: string }) {
  return (
    <div className={cx('site-reveal max-w-3xl', center && 'mx-auto text-center')}>
      {eyebrow && <Eyebrow className={center ? 'justify-center' : undefined}>{eyebrow}</Eyebrow>}
      <h2 id={id} className="mt-3 text-[2rem] leading-[1.05] font-black tracking-tighter text-balance text-slate-900 sm:text-5xl dark:text-white">
        {title}
      </h2>
      {text && <p className="mt-4 text-lg leading-relaxed font-medium text-pretty text-slate-600 sm:text-xl dark:text-slate-300">{text}</p>}
    </div>
  )
}

/** Le logo de la marque : le même que `LogoMark` de l'app (banque `src/lib/brand/marks.ts`). */
export function ClipMark({ className }: { className?: string }) {
  return <LogoMark className={className || 'h-9 w-9'} />
}

export function Wordmark({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <ClipMark />
      <ClipWordmark label={name} className="h-6 w-auto text-slate-900 dark:text-white" />
    </span>
  )
}

const BUTTON = {
  primary: 'bg-gradient-primary shadow-primary text-white hover:brightness-105',
  glass: 'glass-card text-slate-900 hover:bg-white/80 dark:text-white dark:hover:bg-slate-700/60',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
  light: 'bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:bg-slate-50',
} as const
const SIZE = {
  md: 'h-12 gap-2 px-5 text-sm',
  lg: 'h-14 gap-2.5 px-7 text-base',
  sm: 'h-11 gap-2 px-4 text-sm',
} as const

export type ButtonTone = keyof typeof BUTTON

/** Un lien en forme de bouton : navigation du site (`Link`) ou vers l'app (chargement complet). */
export function ButtonLink({
  href,
  app,
  tone = 'primary',
  size = 'md',
  children,
  className,
  arrow,
}: {
  href: string
  app?: boolean
  tone?: ButtonTone
  size?: keyof typeof SIZE
  children: ReactNode
  className?: string
  arrow?: boolean
}) {
  const cls = cx('btn-press inline-flex shrink-0 items-center justify-center rounded-full font-black whitespace-nowrap', BUTTON[tone], SIZE[size], className)
  const inner = (
    <>
      {children}
      {arrow && <ArrowRight className="h-4 w-4" aria-hidden />}
    </>
  )
  return app ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  )
}

/** Le bouton principal du site (essayer ou réserver), selon le libre-service. */
export function PrimaryCta({
  cta,
  labels,
  size = 'md',
  tone = 'primary',
  className,
  arrow = true,
}: {
  cta: SiteCta
  labels: { trial: string; book: string }
  size?: keyof typeof SIZE
  tone?: ButtonTone
  className?: string
  arrow?: boolean
}) {
  return (
    <ButtonLink href={cta.href} app={cta.app} size={size} tone={tone} className={className} arrow={arrow}>
      {cta.kind === 'trial' ? labels.trial : labels.book}
    </ButtonLink>
  )
}

export function CheckList({ items, className, tone = 'primary' }: { items: string[]; className?: string; tone?: 'primary' | 'light' }) {
  return (
    <ul className={cx('space-y-2.5', className)}>
      {items.map((item) => (
        <li key={item} className={cx('flex items-start gap-2.5 text-[15px] leading-snug font-bold', tone === 'light' ? 'text-white' : 'text-slate-700 dark:text-slate-200')}>
          <span
            className={cx(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              tone === 'light' ? 'bg-white/20' : 'bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-[var(--primary-light)]',
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Les icônes que nomment les dictionnaires du site. */
const ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  binder: BookOpen,
  clock: Clock,
  video: Video,
  sparkles: Sparkles,
  check: Check,
  shield: ShieldCheck,
  layers: Layers,
  volume: Volume2,
  graduation: GraduationCap,
  users: Users,
  lock: Lock,
  qr: QrCode,
  languages: Languages,
  image: ImageIcon,
  hand: Hand,
  refresh: RefreshCw,
  pen: PenLine,
  wrench: Wrench,
  chart: BarChart3,
}

export function SiteIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Binary
  return <Icon className={cx('h-5 w-5', className)} aria-hidden />
}

/** Une tuile d'icône en dégradé (cartes, étapes). */
export function IconTile({ name, tone = 'primary', className }: { name: string; tone?: 'primary' | 'ai' | 'danger' | 'success' | 'dark'; className?: string }) {
  const bg = {
    primary: 'bg-gradient-primary shadow-primary',
    ai: 'bg-gradient-accent shadow-accent',
    danger: 'bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] shadow-[0_10px_20px_rgba(255,43,94,0.3)]',
    success: 'bg-gradient-to-br from-[#2EE59D] to-[#18c480] shadow-[0_10px_20px_rgba(24,196,128,0.3)]',
    dark: 'bg-slate-900 dark:bg-slate-700',
  }[tone]
  return (
    <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white', bg, className)}>
      <SiteIcon name={name} className="h-6 w-6" />
    </span>
  )
}
