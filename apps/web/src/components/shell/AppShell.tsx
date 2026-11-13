'use client'

import { useToggle } from '@/lib/toggles'
import { AiConsentHost, DeleteAccountDialog } from '@/components/settings/Account'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Home,
  LogOut,
  MapPin,
  MessageSquareWarning,
  Moon,
  Plus,
  ScanLine,
  Settings,
  Upload,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useCallback, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { ScanSheet } from '@/components/ScanSheet'
import { Logo } from '@/components/Logo'
import { AppearanceControls } from '@/components/settings/Appearance'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { BILLING_V2 } from '@/lib/config'
import { logout } from '@/lib/gateway/client'
import { useLangVersion, useMessages } from '@/lib/i18n'
import { canScan, clipPathFromScan, scanNative } from '@/lib/media/scan'
import { T } from '@/lib/model/repo'
import { ROLES } from '@/lib/model/catalog'
import { cn, initials } from '@/lib/util/cn'
import { CreationWatcher } from '@/hooks/useCreations'
import { RealtimeBridge } from '@/hooks/useRealtime'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  badge?: number
  show: boolean
}

/** Se déconnecter : le magasin de l'app oublie aussi l'organisation (le compte suivant ne verra pas ses achats). */
function signOut() {
  if (hasCapability('store.connect')) void callNative('store.connect', { orgId: null }).catch(() => undefined)
  logout()
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const toast = useToast()
  const t = useMessages()
  const langVersion = useLangVersion()
  const { profile, can, displayName, role, data, org } = useSession()
  const [moreOpen, setMoreOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteToggle = useToggle('deleteAccount')
  const operatorsOn = useToggle('operators')
  const recordsOn = useToggle('records')

  const feedbackCount = useQuery({
    queryKey: ['feedback-count'],
    queryFn: () => data.count(T.feedback, { 'json_data.status': { $eq: 'new' } }),
    enabled: can('feedback', 'write'),
    refetchInterval: 120_000,
  })

  const nav: NavItem[] = [
    { href: '/accueil', label: t.shell.nav.home, icon: <Home className="h-5 w-5" />, show: true },
    { href: '/instructions', label: t.shell.nav.instructions, icon: <BookOpen className="h-5 w-5" />, show: true },
    { href: '/postes', label: t.shell.nav.stations, icon: <MapPin className="h-5 w-5" />, show: can('stations') },
    { href: '/equipe', label: t.shell.nav.team, icon: <Users className="h-5 w-5" />, show: operatorsOn && can('stations', 'write') },
    { href: '/retours', label: t.shell.nav.feedback, icon: <MessageSquareWarning className="h-5 w-5" />, badge: feedbackCount.data || undefined, show: can('feedback', 'write') },
    { href: '/registre', label: t.shell.nav.records, icon: <ClipboardCheck className="h-5 w-5" />, show: recordsOn && can('feedback') },
    { href: '/statistiques', label: t.shell.nav.stats, icon: <BarChart3 className="h-5 w-5" />, show: can('stats') },
  ].filter((n) => n.show)

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const handleScanValue = useCallback(
    (value: string) => {
      setScanOpen(false)
      const path = clipPathFromScan(value)
      if (path) router.push(path)
      else router.push(`/instructions?q=${encodeURIComponent(value)}`)
    },
    [router],
  )

  async function startScan() {
    if (hasCapability('scan')) {
      try {
        const v = await scanNative(t.shell.scan.prompt)
        if (v) handleScanValue(v)
      } catch {
        toast.error(t.shell.scan.failed)
      }
    } else setScanOpen(true)
  }

  const canCreate = can('instructions', 'write')

  return (
    <div className="min-h-dvh lg:pl-72">
      {/* Barre latérale (grand écran) */}
      <aside className="glass-nav fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r px-5 py-6 lg:flex">
        <Link href="/accueil" className="px-2">
          <Logo subtitle={org.json_data.name} />
        </Link>
        {canCreate && (
          <Link href="/instructions/nouvelle" className="btn-press bg-gradient-primary shadow-primary mt-8 flex h-14 items-center justify-center gap-2 rounded-full font-black text-white">
            <Plus className="h-5 w-5" /> {t.shell.newInstruction}
          </Link>
        )}
        <nav className="mt-8 flex flex-col gap-1" aria-label={t.shell.mainNav}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'btn-press flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-black',
                isActive(n.href) ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300' : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5',
              )}
              aria-current={isActive(n.href) ? 'page' : undefined}
            >
              {n.icon}
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-black text-white tabular-nums">{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          {canScan() && (
            <button type="button" onClick={startScan} className="btn-press flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5">
              <ScanLine className="h-4 w-4" /> {t.shell.scan.title}
            </button>
          )}
          {canCreate && (
            <Link href="/import" className={cn('btn-press flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-bold', isActive('/import') ? 'bg-primary-soft text-[var(--primary-strong)]' : 'text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5')}>
              <Upload className="h-4 w-4" /> {t.shell.nav.import}
            </Link>
          )}
          <Link href="/reglages" className={cn('btn-press flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-bold', isActive('/reglages') ? 'bg-primary-soft text-[var(--primary-strong)]' : 'text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5')}>
            <Settings className="h-4 w-4" /> {t.shell.nav.settings}
          </Link>
          <div className="glass-card mt-3 flex items-center gap-3 rounded-[22px] p-3">
            <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white">{initials(displayName)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{displayName}</span>
              <span className="block truncate text-xs font-bold text-slate-500">{ROLES[role].label}</span>
            </span>
            <button type="button" onClick={signOut} className="btn-press flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label={t.shell.signOut} title={t.shell.signOut}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* En-tête (téléphone et tablette) */}
      <header className="glass-nav pt-safe shell-chrome sticky top-0 z-30 border-b lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/accueil">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {canScan() && (
              <button type="button" onClick={startScan} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200" aria-label={t.shell.scan.title}>
                <ScanLine className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={() => setMoreOpen(true)} className="bg-gradient-accent btn-press ml-1 flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white" aria-label={t.shell.account}>
              {initials(displayName)}
            </button>
          </div>
        </div>
      </header>

      {/* Un changement de langue redessine la page en entier : tout suit, même ce qui lit le catalogue. */}
      {/* `shell-main`, `shell-chrome` : l'éditeur prend tout l'écran (`useImmersive`). */}
      <main className="shell-main mx-auto w-full max-w-7xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <Fragment key={langVersion}>{children}</Fragment>
      </main>
      {/* Les créations en cours sur les autres appareils : seulement pour qui crée des instructions. */}
      {canCreate && <CreationWatcher />}
      {/* Le temps réel de l'usine (Ably), s'il est configuré : ce qui se crée ailleurs apparaît aussitôt. */}
      <RealtimeBridge />

      {/* Navigation du bas (téléphone) */}
      <nav className="glass-nav pb-safe kb-hide shell-chrome fixed inset-x-0 bottom-0 z-40 border-t lg:hidden" aria-label={t.shell.mainNav}>
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-2">
          {[nav[0], nav[1]].filter(Boolean).map((n) => (
            <BottomLink key={n.href} item={n} active={isActive(n.href)} />
          ))}
          <div className="flex justify-center">
            {canCreate ? (
              <Link href="/instructions/nouvelle" aria-label={t.shell.newInstruction} className="btn-press bg-gradient-primary shadow-primary -mt-6 flex h-16 w-16 items-center justify-center rounded-[24px] text-white">
                <Plus className="h-8 w-8" />
              </Link>
            ) : (
              <span />
            )}
          </div>
          {nav[2] ? <BottomLink item={nav[2]} active={isActive(nav[2].href)} /> : <span />}
          <button type="button" onClick={() => setMoreOpen(true)} className="btn-press flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black text-slate-500 dark:text-slate-400">
            <span className="relative">
              <Settings className="h-5 w-5" />
              {!!feedbackCount.data && <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />}
            </span>
            {t.shell.nav.more}
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={displayName}>
        <p className="-mt-1 mb-4 text-sm font-bold text-slate-500">
          {profile.email} · {ROLES[role].label}
        </p>
        <div className="grid gap-2">
          {([...nav.slice(3), { href: '/import', label: t.shell.nav.import, icon: <Upload className="h-5 w-5" />, show: canCreate }, { href: '/reglages/abonnement', label: t.shell.nav.billing, icon: <CreditCard className="h-5 w-5" />, show: BILLING_V2 }, { href: '/reglages', label: t.shell.nav.settings, icon: <Settings className="h-5 w-5" />, show: true }] as NavItem[])
            .filter((n) => n.show)
            .map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMoreOpen(false)} className="glass-card btn-press flex h-14 items-center gap-3 rounded-2xl px-4 font-black text-slate-800 dark:text-slate-100">
                {n.icon}
                <span className="flex-1">{n.label}</span>
                {!!n.badge && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white tabular-nums">{n.badge}</span>}
              </Link>
            ))}
          <button type="button" onClick={() => { setMoreOpen(false); setAppearanceOpen(true) }} className="glass-card btn-press flex h-14 items-center gap-3 rounded-2xl px-4 text-left font-black text-slate-800 dark:text-slate-100">
            <Moon className="h-5 w-5" /> {t.shell.appearance}
          </button>
          <button type="button" onClick={signOut} className="btn-press flex h-14 items-center gap-3 rounded-2xl px-4 text-left font-black text-rose-600">
            <LogOut className="h-5 w-5" /> {t.shell.signOut}
          </button>
          {/* Exigence d'Apple : supprimer son compte depuis l'app. */}
          {deleteToggle && (
            <button type="button" onClick={() => { setMoreOpen(false); setDeleteOpen(true) }} className="btn-press flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold text-slate-400 hover:text-rose-600">
              {t.settings.account.delete}
            </button>
          )}
        </div>
      </Modal>
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      {/* L'accord avant le premier envoi à l'IA. */}
      <AiConsentHost />

      <AppearanceDialog open={appearanceOpen} onClose={() => setAppearanceOpen(false)} brandColor={org.json_data.color} />
      <ScanSheet open={scanOpen} onClose={() => setScanOpen(false)} onResult={handleScanValue} />
    </div>
  )
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('btn-press flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black', active ? 'text-[var(--primary)]' : 'text-slate-500 dark:text-slate-400')}>
      <span className="relative">
        {item.icon}
        {!!item.badge && <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />}
      </span>
      {item.label}
    </Link>
  )
}

function AppearanceDialog({ open, onClose, brandColor }: { open: boolean; onClose: () => void; brandColor?: string | null }) {
  const t = useMessages()
  return (
    <Modal open={open} onClose={onClose} title={t.settings.appearance.title} size="sm">
      <AppearanceControls brandColor={brandColor} compact />
    </Modal>
  )
}
