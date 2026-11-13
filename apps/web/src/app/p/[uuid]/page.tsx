'use client'

import { useQuery } from '@tanstack/react-query'
import { Lock, Maximize, Search, UserRound, X } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CategoryIcon } from '@/components/icons'
import { mediaThumb } from '@/components/media/MediaView'
import { Player } from '@/components/player/Player'
import { PublicFrame, PublicLoading, PublicMessage } from '@/components/public/PublicShell'
import { WhoAreYou } from '@/components/public/WhoAreYou'
import { IDLE_MS, loadStationSession, saveStationSession, type StationSession } from '@/lib/model/operators'
import { usePublicConfig } from '@/lib/toggles'
import { FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { MicButton } from '@/components/ui/MicButton'
import { ToastProvider } from '@/components/ui/Toast'
import { aiApi } from '@/lib/gateway/ai'
import { dataApi } from '@/lib/gateway/data'
import { filesApi } from '@/lib/gateway/files'
import { canReadAloud, exchangeLink, guestClient, scopedId, type GuestLink } from '@/lib/gateway/guest'
import { useMessages } from '@/lib/i18n'
import { CATEGORIES } from '@/lib/model/catalog'
import { listAllPublished, listPublishedForStation, logUsage, T } from '@/lib/model/repo'
import type { Published, Station } from '@/lib/model/types'
import { cn, normalizeText } from '@/lib/util/cn'
import type { Doc } from '@/lib/gateway/data'

export default function StationKioskPage() {
  return (
    <PublicFrame>
      <ToastProvider>
        <Kiosk />
      </ToastProvider>
    </PublicFrame>
  )
}

function Kiosk() {
  const t = useMessages().publicLinks
  const { uuid } = useParams<{ uuid: string }>()
  const [dead, setDead] = useState(false)
  const link = useQuery({ queryKey: ['link', uuid], queryFn: () => exchangeLink(uuid), retry: 1, staleTime: Infinity })

  if (link.isLoading) return <PublicLoading />
  if (link.error || dead || !link.data) return <PublicMessage title={t.deadLink} description={t.kiosk.deadLinkHint} />
  return <KioskInner uuid={uuid} link={link.data} onDead={() => setDead(true)} />
}

function KioskInner({ uuid, link, onDead }: { uuid: string; link: GuestLink; onDead: () => void }) {
  const { publicLinks } = useMessages()
  const t = publicLinks.kiosk
  const client = useMemo(() => guestClient(uuid, link, onDead), [uuid, link, onDead])
  const data = useMemo(() => dataApi(client), [client])
  const files = useMemo(() => (link.permissions.some((p) => p.startsWith('files')) ? filesApi(client) : null), [client, link.permissions])
  const ai = useMemo(() => aiApi(client), [client])
  const stationId = scopedId(link, T.station)
  const onlyMine = !!link.scope?.resources.find((r) => r.data_type === T.published && r.filter && 'json_data.stationIds' in r.filter)
  // L'assistant vocal n'est ouvert que sur un poste qui l'a demandé (la voix en direct sert aussi à la lecture).
  const voiceAllowed = link.permissions.includes('assistant:ask')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<Doc<Published> | null>(null)
  // Qui travaille au poste (toggle `operators`, réglage « Demander qui travaille » du poste).
  const config = usePublicConfig()
  const operatorsOn = config.data?.toggles.operators ?? FALLBACK_TOGGLES.operators
  const canIdentify = !!link.scope?.resources.some((r) => r.data_type === T.operator && r.actions.includes('read'))
  // Un lien d'avant la version 2 ne peut pas écrire le travail fait : on relève quand même, sans trace.
  const canRecord = !!link.scope?.resources.some((r) => r.data_type === T.execution && r.actions.includes('insert'))
  const [who, setWho] = useState<StationSession | null>(() => loadStationSession(uuid))
  const [skipped, setSkipped] = useState(false)
  // Personne n'y touche pendant 30 minutes : la tablette redemande qui travaille.
  useEffect(() => {
    if (!who) return
    let last = Date.now()
    const touch = () => {
      last = Date.now()
    }
    const check = setInterval(() => {
      if (Date.now() - last > IDLE_MS || Date.now() > who.exp) {
        saveStationSession(uuid, null)
        setWho(null)
        setOpen(null)
      } else saveStationSession(uuid, { ...who, lastActive: last })
    }, 60_000)
    window.addEventListener('pointerdown', touch)
    window.addEventListener('keydown', touch)
    return () => {
      clearInterval(check)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [who, uuid])

  const station = useQuery({ queryKey: ['k-station', stationId], queryFn: () => (stationId ? data.get<Station>(T.station, stationId) : Promise.resolve(null)), enabled: !!stationId })
  const mine = useQuery({ queryKey: ['k-mine', stationId], queryFn: () => listPublishedForStation(data, stationId!), enabled: !!stationId, refetchInterval: 5 * 60_000 })
  const all = useQuery({ queryKey: ['k-all'], queryFn: () => listAllPublished(data), enabled: !onlyMine && (showAll || query.length > 1) })

  useEffect(() => {
    if (stationId) logUsage(data, { type: 'scan', stationId, source: 'kiosk' })
  }, [data, stationId])

  // Un lien régénéré invalide l'ancien : la page vérifie qu'elle porte le lien courant du poste.
  // Un lien mis à jour (pas révoqué) suit le nouveau : un code QR imprimé reste bon.
  const current = station.data?.json_data.linkId
  const revoked = station.data && current && current !== uuid
  const follows = revoked && station.data!.json_data.linkFollow?.includes(uuid)
  useEffect(() => {
    if (follows && current) window.location.replace(`/p/${current}`)
  }, [follows, current])
  // Un poste qui demande qui travaille attend les toggles : « Qui êtes-vous ? » ne remplace jamais
  // une instruction déjà ouverte.
  const waitToggles = !!station.data?.json_data.askOperator && config.isLoading
  if (station.isLoading || mine.isLoading || follows || waitToggles) return <PublicLoading />
  if (!stationId || !station.data || revoked) return <PublicMessage title={publicLinks.deadLink} description={t.replacedHint} />

  if (operatorsOn && station.data.json_data.askOperator && !who && !skipped) {
    return <WhoAreYou link={uuid} data={data} stationId={stationId} canIdentify={canIdentify} onDone={setWho} onSkip={() => setSkipped(true)} />
  }

  if (open) {
    return (
      <Player
        content={open.json_data.content}
        instructionId={open.json_data.instructionId}
        publishedId={open._id}
        version={open.json_data.version}
        branding={open.json_data.branding}
        stationId={stationId}
        source="kiosk"
        deps={{ data, ai: canReadAloud(link.permissions) || voiceAllowed ? ai : null, files }}
        onExit={() => setOpen(null)}
        exitLabel={(words) => words.backToList}
        allowVoice={voiceAllowed}
        allowQuestions={link.permissions.includes('assistant:ask')}
        operator={who?.operator ?? null}
        canRecord={canRecord}
      />
    )
  }

  const branding = mine.data?.[0]?.json_data.branding ?? all.data?.[0]?.json_data.branding
  const q = normalizeText(query.trim())
  const match = (p: Doc<Published>) => {
    if (!q) return true
    const c = p.json_data.content
    return normalizeText([c.title, c.summary, ...(c.tags ?? []), c.equipment ?? ''].join(' ')).includes(q)
  }
  const mineFiltered = (mine.data ?? []).filter(match)
  const mineIds = new Set((mine.data ?? []).map((p) => p._id))
  const others = (all.data ?? []).filter((p) => !mineIds.has(p._id)).filter(match)

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 pt-6 pb-16 sm:px-8">
      <header className="mb-6 flex items-center gap-4">
        {branding?.logoUrl ? <img src={branding.logoUrl} alt={branding.orgName} className="h-12 max-w-36 object-contain" /> : null}
        <div className="min-w-0 flex-1">
          <p className="label-caps text-slate-500">{branding?.orgName ?? t.station}</p>
          <h1 className="truncate text-4xl font-black tracking-tighter sm:text-5xl">{station.data.json_data.name}</h1>
          {station.data.json_data.code && <p className="text-lg font-black text-slate-400">{station.data.json_data.code}</p>}
        </div>
        {who && (
          // Qui travaille au poste ; le toucher passe à une autre personne.
          <button
            type="button"
            onClick={() => {
              saveStationSession(uuid, null)
              setWho(null)
            }}
            title={t.who.change}
            aria-label={`${who.operator.name} · ${t.who.change}`}
            className="btn-press glass-card flex h-14 max-w-56 items-center gap-2 rounded-2xl px-4 font-black"
          >
            <UserRound className="h-5 w-5 shrink-0 text-[var(--primary)]" /> <span className="truncate">{who.operator.name}</span>
          </button>
        )}
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} className="btn-press glass-card hidden h-14 w-14 items-center justify-center rounded-2xl sm:flex" aria-label={t.fullscreen}>
          <Maximize className="h-6 w-6" />
        </button>
      </header>

      <div className="glass-panel mb-6 flex items-center gap-3 rounded-[28px] px-5">
        <Search className="h-6 w-6 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="h-16 min-w-0 flex-1 bg-transparent text-lg font-bold focus:outline-none" aria-label={t.search} />
        <MicButton label={t.searchByVoice} onText={(text) => setQuery((q) => (q ? `${q} ${text}` : text))} />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl" aria-label={t.clear}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {mineFiltered.length ? (
        <Grid items={mineFiltered} onOpen={setOpen} big />
      ) : (
        <PublicMessage title={query ? t.noMatch : t.empty} description={query ? t.noMatchHint : t.emptyHint} />
      )}

      {!onlyMine ? (
        <section className="mt-10">
          {!showAll && !query ? (
            <button type="button" onClick={() => setShowAll(true)} className="btn-press glass-card mx-auto flex h-14 items-center gap-2 rounded-full px-6 font-black">
              {t.showOtherStations}
            </button>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-black tracking-tight">{t.otherStations}</h2>
              {all.isLoading ? <p className="font-bold text-slate-400">{publicLinks.loading}</p> : others.length ? <Grid items={others} onOpen={setOpen} /> : <p className="font-bold text-slate-400">{t.nothingElse}</p>}
            </>
          )}
        </section>
      ) : (
        <p className="mt-10 flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <Lock className="h-4 w-4" /> {t.onlyThisStation}
        </p>
      )}
    </main>
  )
}

function Grid({ items, onOpen, big }: { items: Doc<Published>[]; onOpen: (p: Doc<Published>) => void; big?: boolean }) {
  const t = useMessages().publicLinks.kiosk
  return (
    <div className={cn('grid gap-4', big ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4')}>
      {items.map((p) => {
        const c = p.json_data.content
        const thumb = mediaThumb(c.steps.find((s) => s.media[0])?.media[0])
        return (
          <button key={p._id} type="button" onClick={() => onOpen(p)} className="btn-press lift group relative flex flex-col overflow-hidden rounded-[28px] text-left text-white shadow-[0_15px_35px_rgba(15,23,42,0.15)]">
            <span className={cn('relative block bg-gradient-to-br', CATEGORIES[c.category]?.tile ?? CATEGORIES.autre.tile, big ? 'h-48' : 'h-32')}>
              {thumb ? <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="grid-pattern absolute inset-0" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1.5 text-[10px] font-black tracking-widest uppercase backdrop-blur-md">
                <CategoryIcon category={c.category} className="h-3.5 w-3.5" /> {CATEGORIES[c.category]?.short}
              </span>
              <span className="absolute inset-x-4 bottom-3">
                <span className={cn('block leading-tight font-black tracking-tight', big ? 'text-2xl' : 'text-lg')}>{c.title}</span>
                <span className="text-sm font-bold text-white/80">{t.cardMeta(c.steps.length, c.durationMin)}</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
