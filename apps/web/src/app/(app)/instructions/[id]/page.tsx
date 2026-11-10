'use client'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, SearchX } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { CaptureBoard, type ForceKind } from '@/components/capture/CaptureBoard'
import { GenerationProgress } from '@/components/capture/GenerationProgress'
import { Editor } from '@/components/editor/Editor'
import { useSession } from '@/components/providers/Session'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { qk, useInstruction, useStations } from '@/hooks/queries'
import { clearJob, jobOf, subscribeJobs } from '@/lib/ai/jobs'
import { startGeneration } from '@/lib/ai/runGeneration'
import { LinkButton } from '@/components/ui/Button'
import { T } from '@/lib/model/repo'
import type { Instruction } from '@/lib/model/types'

export default function InstructionPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const session = useSession()
  const instruction = useInstruction(id)
  const stations = useStations()
  const job = useSyncExternalStore(subscribeJobs, () => jobOf(id), () => undefined)
  const started = useRef(false)

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
      <EmptyState icon={<SearchX className="h-7 w-7" />} title="Instruction introuvable" description="Elle a peut-être été archivée, ou le lien est incomplet." action={<LinkButton href="/instructions" variant="primary">Voir les instructions</LinkButton>} />
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

  if (!doc.json_data.draft) {
    return (
      <div className="mx-auto max-w-4xl">
        <Link href="/instructions" className="mb-4 inline-flex items-center gap-1 text-sm font-black text-slate-500">
          <ArrowLeft className="h-4 w-4" /> Instructions
        </Link>
        <CaptureBoard
          instructionId={id}
          initialSources={doc.json_data.sources}
          initialIntent={doc.json_data.intent}
          heading={<PageHeader title="Compléter les médias" subtitle="Ajoutez ce qui manque, puis lancez la génération." />}
          onGenerate={(_, kind) => void generate(kind)}
        />
      </div>
    )
  }

  return <Editor key={`${doc._id}-${doc.json_data.generation?.at ?? ''}`} doc={doc} stations={stations.data ?? []} onRegenerate={() => void generate('auto')} />
}
