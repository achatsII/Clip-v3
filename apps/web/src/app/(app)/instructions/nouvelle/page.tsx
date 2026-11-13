'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { useSession } from '@/components/providers/Session'
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
      <CaptureBoard
        instructionId={null}
        initialSources={[]}
        title={t.instructions.create.title}
        subtitle={t.instructions.create.subtitle}
        back={{ href: '/instructions', label: t.instructions.detail.back }}
        onCreated={() => void qc.invalidateQueries({ queryKey: qk.instructions })}
        onGenerate={(id, kind) => router.push(`/instructions/${id}?generer=${kind}`)}
      />
    </div>
  )
}
