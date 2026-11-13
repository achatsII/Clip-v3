'use client'

/**
 * La bibliothèque de l'espace Découvrir : un parcours en trois niveaux (commencer ici, les fonctions une à
 * une, aller plus loin), le lecteur dans la page, l'appel au conseiller. Une vidéo pas encore tournée
 * reste « Bientôt » : sa carte n'est pas un lien. Le premier rendu est celui du serveur ; la vidéo à
 * montrer (l'adresse, sinon la première du parcours pas encore vue) se choisit ensuite, dans le navigateur.
 */
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileStack,
  FileText,
  Film,
  Languages,
  Lightbulb,
  MessageCircle,
  MessageCircleQuestion,
  PenLine,
  Play,
  PlayCircle,
  QrCode,
  Sparkles,
  Tablet,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { Badge } from '@/components/ui/Surface'
import { useAccessSetup } from '@/lib/decouvrir/access'
import { ADVISOR_PATH, LEVELS, resolveVideoId, VIDEO_IDS, VIDEO_LEVEL, type VideoId, type VideoLevel } from '@/lib/decouvrir/catalog'
import { readLocalViews, useLocalViews, type LocalView } from '@/lib/decouvrir/progress'
import { track } from '@/lib/decouvrir/tracker'
import type { VideoMeta } from '@/lib/decouvrir/videos'
import { messagesIn, useMessages } from '@/lib/i18n'
import { cn, formatDuration } from '@/lib/util/cn'
import { VideoPlayer } from './VideoPlayer'

/** L'icône et la couleur de chaque vidéo (la tuile d'une vidéo pas encore tournée). */
const LOOK: Record<VideoId, { icon: LucideIcon; tile: string }> = {
  '00-film': { icon: Film, tile: 'from-sky-500 to-blue-600' },
  '01-survol': { icon: Compass, tile: 'from-sky-500 to-indigo-600' },
  '02-capturer': { icon: Video, tile: 'from-cyan-500 to-sky-600' },
  '03-generer': { icon: Sparkles, tile: 'from-violet-500 to-indigo-600' },
  '04-retoucher': { icon: PenLine, tile: 'from-fuchsia-500 to-violet-600' },
  '05-traduire': { icon: Languages, tile: 'from-teal-400 to-emerald-600' },
  '06-moderniser': { icon: FileStack, tile: 'from-amber-400 to-orange-500' },
  '07-approuver': { icon: BadgeCheck, tile: 'from-lime-500 to-green-600' },
  '08-au-poste': { icon: Tablet, tile: 'from-orange-500 to-rose-500' },
  '09-postes': { icon: QrCode, tile: 'from-blue-500 to-cyan-600' },
  '10-equipe': { icon: Users, tile: 'from-rose-500 to-pink-600' },
  '11-statistiques': { icon: BarChart3, tile: 'from-slate-500 to-slate-700' },
}

/** Les étapes du parcours franchies : chaque niveau dont toutes les vidéos tournées sont vues, puis le parcours entier (en français, pour Sandboxes). */
function stepsDone(ready: VideoId[], done: (id: string) => boolean): Set<string> {
  const fr = messagesIn('fr').decouvrir
  const steps = new Set<string>()
  for (const lv of LEVELS) {
    const list = ready.filter((id) => VIDEO_LEVEL[id] === lv)
    if (list.length && list.every(done)) steps.add(fr.tracking.levelDone(fr.levels[lv].title))
  }
  if (ready.length && ready.every(done)) steps.add(fr.tracking.complete)
  return steps
}

/** Espace relié : une étape du parcours franchie pendant la visite devient un événement « parcours ». */
function useParcoursSteps(enabled: boolean, ready: VideoId[], byId: Map<string, LocalView>) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!enabled || !ready.length) return
    // Le point de départ vient du stockage (pas de l'instantané du rendu serveur) : rien n'est signalé deux fois.
    if (!seen.current) {
      const stored = new Map(readLocalViews().map((v) => [v.id, v]))
      seen.current = stepsDone(ready, (id) => !!stored.get(id)?.completed)
    }
    const now = stepsDone(ready, (id) => !!byId.get(id)?.completed)
    for (const step of now) if (!seen.current.has(step)) track({ type: 'parcours', libelle: step })
    seen.current = new Set([...seen.current, ...now])
  }, [enabled, ready, byId])
}

export function LibraryView({ metas }: { metas: Record<string, VideoMeta> }) {
  const t = useMessages().decouvrir
  const views = useLocalViews()
  const byId = useMemo(() => new Map(views.map((v) => [v.id, v])), [views])
  const ready = useMemo(() => VIDEO_IDS.filter((id) => metas[id]), [metas])
  const totalSec = ready.reduce((s, id) => s + (metas[id]?.durationSec ?? 0), 0)
  const seen = ready.filter((id) => byId.get(id)?.completed).length
  const linked = useAccessSetup().mode === 'sandboxes'
  useParcoursSteps(linked, ready, byId)

  const [currentId, setCurrentId] = useState<VideoId | null>(null)
  const [autoplay, setAutoplay] = useState(false)
  const playerRef = useRef<HTMLElement>(null)

  // Après le premier rendu (identique au serveur) : la vidéo demandée par l'adresse, sinon la première du
  // parcours pas encore vue, sinon la première.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const wanted = resolveVideoId(new URLSearchParams(location.search).get('v'))
      const done = new Set(readLocalViews().filter((v) => v.completed).map((v) => v.id))
      setCurrentId((wanted && metas[wanted] ? wanted : null) ?? ready.find((id) => !done.has(id)) ?? ready[0] ?? null)
    })
    return () => cancelAnimationFrame(raf)
  }, [metas, ready])

  const idx = currentId ? ready.indexOf(currentId) : -1
  const next = idx >= 0 ? (ready[idx + 1] ?? null) : null

  const choose = useCallback((id: VideoId) => {
    setCurrentId(id)
    setAutoplay(true)
    try {
      const u = new URL(location.href)
      u.searchParams.set('v', id)
      history.replaceState(history.state, '', u.toString())
    } catch {
      /* adresse inchangée */
    }
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="space-y-12 pt-2 sm:pt-6">
      <section className="max-w-3xl">
        <Badge tone="primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {t.library.badge}
        </Badge>
        <h1 className="mt-4 text-[38px] leading-[1.02] font-black tracking-tighter text-slate-900 sm:text-[52px] dark:text-white">
          {t.library.title}
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">{t.library.titleAccent}</span>
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{t.library.intro}</p>
        {ready.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-bold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4" aria-hidden /> {t.library.count(ready.length)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden /> {t.library.total(formatDuration(totalSec))}
            </span>
            {seen > 0 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> {t.library.seen(seen)}
              </span>
            )}
          </p>
        )}
      </section>

      <section ref={playerRef} className="scroll-mt-4" aria-label={t.library.player}>
        {currentId && metas[currentId] ? (
          <VideoPlayer id={currentId} meta={metas[currentId]} next={next} onNext={() => next && choose(next)} autoplay={autoplay} />
        ) : ready.length === 0 ? (
          <EmptyState
            icon={<PlayCircle className="h-8 w-8" />}
            title={t.library.emptyTitle}
            description={t.library.emptyText}
            action={
              <LinkButton href={ADVISOR_PATH} icon={<MessageCircle className="h-4 w-4" />}>
                {t.library.advisor.action}
              </LinkButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
            <Skeleton className="aspect-video w-full rounded-[28px]" />
            <Skeleton className="h-64 rounded-[28px] max-lg:hidden" />
          </div>
        )}
      </section>

      {LEVELS.map((lv) => (
        <LevelSection key={lv} level={lv} metas={metas} byId={byId} currentId={currentId} onPick={choose} />
      ))}

      <AdvisorCallout linked={linked} />
    </div>
  )
}

function LevelSection({ level, metas, byId, currentId, onPick }: { level: VideoLevel; metas: Record<string, VideoMeta>; byId: Map<string, LocalView>; currentId: VideoId | null; onPick: (id: VideoId) => void }) {
  const t = useMessages().decouvrir
  const ids = VIDEO_IDS.filter((id) => VIDEO_LEVEL[id] === level)
  return (
    <section aria-labelledby={`niveau-${level}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="bg-gradient-primary shadow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white">{level}</span>
        <div className="min-w-0">
          <h2 id={`niveau-${level}`} className="text-[22px] font-black tracking-tight text-slate-900 dark:text-white">
            {t.levels[level].title}
          </h2>
          <p className="text-[13.5px] font-semibold text-slate-500 dark:text-slate-400">{t.levels[level].subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id) => (
          <VideoCard key={id} id={id} meta={metas[id]} view={byId.get(id)} active={currentId === id} onPick={() => onPick(id)} />
        ))}
      </div>
    </section>
  )
}

function VideoCard({ id, meta, view, active, onPick }: { id: VideoId; meta?: VideoMeta; view?: LocalView; active: boolean; onPick: () => void }) {
  return meta ? <ReadyCard id={id} meta={meta} view={view} active={active} onPick={onPick} /> : <SoonCard id={id} />
}

/** Une vidéo tournée : l'affiche, la durée, la progression ; un toucher la fait jouer dans le lecteur. */
function ReadyCard({ id, meta, view, active, onPick }: { id: VideoId; meta: VideoMeta; view?: LocalView; active: boolean; onPick: () => void }) {
  const t = useMessages().decouvrir
  const words = t.videos[id]
  const done = !!view?.completed
  const pct = view?.maxPct ?? 0
  return (
    <button type="button" onClick={onPick} aria-current={active ? 'true' : undefined} className={cn('glass-card group btn-press lift block w-full rounded-[28px] p-2.5 text-left', active && 'ring-2 ring-[rgba(var(--primary-rgb),0.4)]')}>
      <span className="relative block aspect-video overflow-hidden rounded-[22px] bg-slate-900/10">
        {meta.poster ? (
          <img src={meta.poster} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <span className={cn('grid-pattern absolute inset-0 bg-gradient-to-br', LOOK[id].tile)} />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--primary)] shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
          </span>
        </span>
        {done && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase shadow-lg">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t.library.seenBadge}
          </span>
        )}
        {meta.durationSec ? <span className="absolute right-3 bottom-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[12px] font-black text-white tabular-nums">{formatDuration(meta.durationSec)}</span> : null}
        {pct > 0 && !done && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <span className="block h-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <span className="block px-1.5 pt-3 pb-1.5">
        <span className="block text-[16px] leading-snug font-black tracking-tight text-slate-900 dark:text-white">{words.title}</span>
        <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug font-medium text-slate-600 dark:text-slate-300">{words.summary}</span>
        <span className="mt-2.5 flex min-h-6 items-center justify-between gap-2 text-[12.5px] font-bold">
          <span className="truncate text-slate-500 dark:text-slate-400">{meta.chapters.length ? t.library.chapters(meta.chapters.length) : words.forWho}</span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[var(--primary)]">
            {active ? t.library.playing : t.library.watch} <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </span>
      </span>
    </button>
  )
}

/**
 * Une vidéo pas encore tournée : « Bientôt », jamais un lien. Une tuile colorée au grand écran ; au
 * téléphone, une ligne compacte, pour que la page ne s'allonge pas de ce qu'on ne peut pas encore voir.
 */
function SoonCard({ id }: { id: VideoId }) {
  const t = useMessages().decouvrir
  const words = t.videos[id]
  const look = LOOK[id]
  const Icon = look.icon
  return (
    <div className="glass-card flex items-center gap-3 rounded-[24px] p-2.5 sm:block sm:rounded-[28px]" aria-disabled="true">
      <span className={cn('relative block h-20 w-24 shrink-0 overflow-hidden rounded-[18px] bg-gradient-to-br saturate-[.85] sm:aspect-video sm:h-auto sm:w-full sm:rounded-[22px]', look.tile)}>
        <span className="grid-pattern absolute inset-0" />
        <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <Icon className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/90 sm:h-14 sm:w-14" aria-hidden />
        <span className="absolute top-3 right-3 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase backdrop-blur-md max-sm:hidden">{t.library.soon}</span>
      </span>
      <span className="block min-w-0 flex-1 sm:px-1.5 sm:pt-3 sm:pb-1.5">
        <span className="block text-[15px] leading-snug font-black tracking-tight text-slate-900 sm:text-[16px] dark:text-white">{words.title}</span>
        <span className="mt-1 line-clamp-2 block text-[13px] leading-snug font-medium text-slate-600 sm:text-[13.5px] dark:text-slate-300">{words.summary}</span>
        <span className="mt-2 flex min-h-6 items-center justify-between gap-2 text-[12.5px] font-bold">
          <span className="min-w-0 leading-snug text-slate-500 dark:text-slate-400">{words.forWho}</span>
          <span className="shrink-0 rounded-lg bg-slate-900/[0.06] px-2 py-0.5 text-[10px] font-black tracking-widest text-slate-500 uppercase sm:hidden dark:bg-white/10 dark:text-slate-300">{t.library.soon}</span>
        </span>
      </span>
    </div>
  )
}

function AdvisorCallout({ linked }: { linked: boolean }) {
  const t = useMessages().decouvrir.library.advisor
  const promises = linked ? t.linked : t.open
  const icons = [MessageCircleQuestion, linked ? FileText : CheckCircle2, Lightbulb]
  return (
    <section className="glass-panel rounded-[32px] p-6 sm:p-9">
      <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <Badge tone="primary">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {t.badge}
          </Badge>
          <h2 className="mt-3 text-[26px] leading-tight font-black tracking-tight text-slate-900 dark:text-white">{t.title}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{t.text}</p>
          <ul className="mt-5 grid gap-2.5 text-[14px] font-bold text-slate-700 sm:grid-cols-2 dark:text-slate-200">
            {promises.map((p, i) => {
              const Icon = icons[i] ?? Lightbulb
              return (
                <li key={p} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden /> {p}
                </li>
              )
            })}
          </ul>
        </div>
        <LinkButton href={ADVISOR_PATH} variant="primary" size="lg" icon={<MessageCircle className="h-5 w-5" />} className="shrink-0">
          {t.action}
        </LinkButton>
      </div>
    </section>
  )
}
