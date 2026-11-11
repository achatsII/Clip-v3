'use client'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, PauseCircle, SearchX, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CaptureBoard, type ForceKind } from '@/components/capture/CaptureBoard'
import { GenerationProgress, launchedFrom } from '@/components/capture/GenerationProgress'
import { Editor } from '@/components/editor/Editor'
import { useSession } from '@/components/providers/Session'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { qk, useInstruction, useStations } from '@/hooks/queries'
import { useCreations } from '@/hooks/useCreations'
import { creationOf } from '@/lib/ai/creation'
import { clearJob, jobOf, subscribeJobs } from '@/lib/ai/jobs'
import { startGeneration } from '@/lib/ai/runGeneration'
import { Button, LinkButton } from '@/components/ui/Button'
import { useMessages } from '@/lib/i18n'
import { T } from '@/lib/model/repo'
import type { GeneratingInfo, Instruction } from '@/lib/model/types'

export default function InstructionPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const session = useSession()
  const t = useMessages()
  const instruction = useInstruction(id)
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

  const generate = useCallback(
    async (kind: ForceKind) => {
      const fresh = await session.data.get<Instruction>(T.instruction, id)
      if (!fresh) return
      qc.setQueryData(qk.instruction(id), fresh)
      void startGeneration({
        doc: fresh,
        data: session.data,
        files: session.files,
        ai: session.ai,
        org: session.org.json_data,
        stations: stations.data ?? [],
        actor: { id: session.profile.userId, name: session.displayName },
        forceKind: kind === 'auto' ? undefined : kind,
        onDone: refresh,
      })
    },
    [qc, id, session, stations.data, refresh],
  )

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

  if (instruction.isLoading) {
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
          remote={{ device: creation.info.device, byName: creation.info.byName }}
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
          onRelaunch={() => void generate('auto')}
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
          onRetry={() => void generate('auto')}
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
        <Link href="/instructions" className="mb-4 inline-flex items-center gap-1 text-sm font-black text-slate-500">
          <ArrowLeft className="h-4 w-4" /> {t.instructions.detail.back}
        </Link>
        <CaptureBoard
          instructionId={id}
          initialSources={doc.json_data.sources}
          initialIntent={doc.json_data.intent}
          heading={<PageHeader title={t.instructions.detail.completeTitle} subtitle={t.instructions.detail.completeSubtitle} />}
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
