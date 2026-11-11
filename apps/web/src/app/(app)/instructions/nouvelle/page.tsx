'use client'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { useSession } from '@/components/providers/Session'
import { PageHeader } from '@/components/ui/Surface'
import { qk } from '@/hooks/queries'
import { useMessages } from '@/lib/i18n'

export default function NewInstructionPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { can } = useSession()
  const t = useMessages()
  if (!can('instructions', 'write')) {
    return <p className="font-bold text-slate-500">{t.instructions.create.readOnly}</p>
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/instructions" className="mb-4 inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> {t.instructions.detail.back}
      </Link>
      <CaptureBoard
        instructionId={null}
        initialSources={[]}
        heading={<PageHeader title={t.instructions.create.title} subtitle={t.instructions.create.subtitle} />}
        onCreated={() => void qc.invalidateQueries({ queryKey: qk.instructions })}
        onGenerate={(id, kind) => router.push(`/instructions/${id}?generer=${kind}`)}
      />
    </div>
  )
}
