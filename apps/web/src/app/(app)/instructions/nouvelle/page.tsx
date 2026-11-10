'use client'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { useSession } from '@/components/providers/Session'
import { PageHeader } from '@/components/ui/Surface'
import { qk } from '@/hooks/queries'

export default function NewInstructionPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { can } = useSession()
  if (!can('instructions', 'write')) {
    return <p className="font-bold text-slate-500">Votre rôle permet de consulter les instructions, pas d’en créer.</p>
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/instructions" className="mb-4 inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Instructions
      </Link>
      <CaptureBoard
        instructionId={null}
        initialSources={[]}
        heading={<PageHeader title="Nouvelle instruction" subtitle="Montrez et expliquez comme à un nouvel employé. L’IA s’occupe de la rédaction." />}
        onCreated={() => void qc.invalidateQueries({ queryKey: qk.instructions })}
        onGenerate={(id, kind) => router.push(`/instructions/${id}?generer=${kind}`)}
      />
    </div>
  )
}
