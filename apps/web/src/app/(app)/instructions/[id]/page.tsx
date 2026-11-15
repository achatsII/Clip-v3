'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Loader2, PauseCircle, SearchX, Sparkles } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CaptureBoard, type ForceKind } from '@/components/capture/CaptureBoard'
import { GenerationProgress, launchedFrom } from '@/components/capture/GenerationProgress'
import { Editor } from '@/components/editor/Editor'
import { useSession } from '@/components/providers/Session'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { qk, useInstruction, useStations } from '@/hooks/queries'
import { useCreations } from '@/hooks/useCreations'
import { useLaunchGeneration } from '@/hooks/useLaunchGeneration'
import { creationOf } from '@/lib/ai/creation'
import { clearJob, jobOf, ranHere, subscribeJobs } from '@/lib/ai/jobs'
import { Button, LinkButton } from '@/components/ui/Button'
import { useMessages } from '@/lib/i18n'
import { T } from '@/lib/model/repo'
import type { GeneratingInfo } from '@/lib/model/types'

export default function InstructionPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const session = useSession()
  const t = useMessages()
  const instruction = useInstruction(id)
  // Déjà lue plus tôt : l'éditeur attend la relecture, car il part de ce brouillon (il a pu changer
  // ailleurs depuis). Une fois ouvert, il suit lui-même les changements.
  const [freshId, setFreshId] = useState<string | null>(null)
  useEffect(() => {
    if (instruction.data && !instruction.isFetching) setFreshId(id)
  }, [instruction.data, instruction.isFetching, id])
  const stations = useStations()
  const job = useSyncExternalStore(subscribeJobs, () => jobOf(id), () => undefined)
  const started = useRef(false)
  // Une création lancée sur un autre appareil : on la suit, et la page se met à jour à la fin.
  const creations = useCreations()
  const [showMedia, setShowMedia] = useState(false)
  const listed = creations.data?.find((d) => d._id === id)
  const docRunning = creationOf(instruction.data?.json_data).kind === 'running'
  // L'état le plus frais l'emporte : la petite lecture des créations, ou l'instruction si elle est plus récente.
  const creation = creationOf(creations.isFetched && creations.dataUpdatedAt >= instruction.dataUpdatedAt ? (listed?.json_data ?? null) : instruction.data?.json_data)
  useEffect(() => {
    if (!docRunning || !creations.isFetched || listed) return
    void qc.invalidateQueries({ queryKey: qk.creations })
    void qc.invalidateQueries({ queryKey: qk.instruction(id) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRunning, creations.isFetched, !!listed])

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.instruction(id) })
    void qc.invalidateQueries({ queryKey: qk.instructions })
  }, [qc, id])

  const launch = useLaunchGeneration()
  const generate = useCallback(
    /** `device` : sur cet appareil même si l'usine génère au serveur (relance après un échec au serveur). */
    (kind: ForceKind, opts: { device?: boolean } = {}) => launch(id, kind, { device: opts.device, onDone: refresh }),
    [launch, id, refresh],
  )
  // Après un échec au serveur, la relance se fait sur cet appareil (le chemin d'avant).
  const relaunch = useCallback(() => void generate('auto', { device: !!instruction.data?.json_data.generationError?.server }), [generate, instruction.data])

  // Lancement demandé par l'écran de capture (?generer=auto|procedure|lockout).
  useEffect(() => {
    const kind = params.get('generer') as ForceKind | null
    if (!kind || started.current || !instruction.data || stations.isLoading) return
    started.current = true
    router.replace(`/instructions/${id}`)
    if (jobOf(id)?.status !== 'running') void generate(kind)
  }, [params, instruction.data, stations.isLoading, id, router, generate])

  useEffect(() => {
    if (job?.status === 'done') {
      refresh()
      const t = setTimeout(() => clearJob(id), 500)
      return () => clearTimeout(t)
    }
  }, [job?.status, id, refresh])

  if (instruction.isLoading || (freshId !== id && instruction.isFetching)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }
  if (instruction.error) {
    const notFound = (instruction.error as { notFound?: boolean }).notFound
    return notFound ? (
      <EmptyState icon={<SearchX className="h-7 w-7" />} title={t.instructions.detail.notFoundTitle} description={t.instructions.detail.notFoundText} action={<LinkButton href="/instructions" variant="primary">{t.instructions.detail.seeAll}</LinkButton>} />
    ) : (
      <ErrorState error={instruction.error} onRetry={() => instruction.refetch()} />
    )
  }
  const doc = instruction.data!

  if (job?.status === 'running' || (job?.status === 'error' && !doc.json_data.draft)) {
    return (
      <div className="py-6">
        <GenerationProgress
          job={job}
          onRetry={() => {
            clearJob(id)
            void generate('auto')
          }}
          onCancel={() => clearJob(id)}
        />
      </div>
    )
  }

  const instr = doc.json_data
  const canWrite = session.can('instructions', 'write')

  if (creation.kind === 'running' && !instr.draft) {
    return (
      <div className="py-6">
        <GenerationProgress
          job={{ status: 'running', stage: creation.info.stage, detail: creation.info.detail ?? undefined, startedAt: Date.parse(creation.info.startedAt) }}
          // Au serveur, l'appareil qui l'a lancée la suit aussi « à distance » : il peut se fermer.
          remote={creation.info.mode === 'server' && ranHere(id) ? undefined : { device: creation.info.device, byName: creation.info.byName }}
          server={creation.info.mode === 'server'}
          onRetry={() => undefined}
        />
      </div>
    )
  }

  if (creation.kind === 'stale' && !instr.draft && !showMedia) {
    return (
      <div className="py-6">
        <Interrupted
          info={creation.info}
          canWrite={canWrite}
          onRelaunch={() => void generate('auto', { device: creation.info.mode === 'server' })}
          onMedia={() => {
            // La création est abandonnée : elle ne s'affiche plus comme interrompue ailleurs.
            void session.data.patch(T.instruction, id, { generating: null }).then(refresh, () => undefined)
            setShowMedia(true)
          }}
        />
      </div>
    )
  }

  if (instr.generationError && !instr.draft && !showMedia) {
    return (
      <div className="py-6">
        <GenerationProgress
          job={{ status: 'error', message: instr.generationError.message }}
          onRetry={relaunch}
          onCancel={() => {
            void session.data.patch(T.instruction, id, { generationError: null }).then(refresh, () => undefined)
            setShowMedia(true)
          }}
        />
      </div>
    )
  }

  if (!doc.json_data.draft) {
    return (
      <div className="mx-auto max-w-4xl">
        <CaptureBoard
          instructionId={id}
          initialSources={doc.json_data.sources}
          initialIntent={doc.json_data.intent}
          title={t.instructions.detail.completeTitle}
          subtitle={t.instructions.detail.completeSubtitle}
          back={{ href: '/instructions', label: t.instructions.detail.back }}
          onGenerate={(_, kind) => void generate(kind)}
        />
      </div>
    )
  }

  return (
    <>
      {creation.kind === 'running' && (
        <p className="mb-4 flex items-center gap-3 rounded-[20px] bg-violet-50 p-4 text-sm font-bold text-violet-900 dark:bg-violet-500/10 dark:text-violet-100" role="status">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          {t.instructions.detail.newVersion(launchedFrom(creation.info.device, creation.info.byName, true))}
        </p>
      )}
      <Editor key={`${doc._id}-${doc.json_data.generation?.at ?? ''}`} doc={doc} stations={stations.data ?? []} onRegenerate={() => void generate('auto')} />
    </>
  )
}

/** Une création dont l'appareil ne donne plus signe de vie : on le dit, et on peut la relancer ici. */
function Interrupted({ info, canWrite, onRelaunch, onMedia }: { info: GeneratingInfo; canWrite: boolean; onRelaunch: () => void; onMedia: () => void }) {
  const t = useMessages().instructions.interrupted
  return (
    <div className="glass-panel animate-pop-in mx-auto max-w-xl rounded-[40px] p-8 text-center" role="status">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
        <PauseCircle className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-black tracking-tight">{t.title}</h2>
      <p className="mt-2 font-medium text-slate-500">{t.text(launchedFrom(info.device, info.byName))}</p>
      <p className="mt-1 text-sm font-medium text-slate-400">{t.kept}</p>
      {canWrite && (
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={onMedia}>{t.reviewMedia}</Button>
          <Button variant="primary" onClick={onRelaunch} icon={<Sparkles className="h-5 w-5" />}>
            {t.relaunch}
          </Button>
        </div>
      )}
    </div>
  )
}
