'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PreviewEditing } from '@/components/editor/PreviewEditing'
import { Player } from '@/components/player/Player'
import { useSession } from '@/components/providers/Session'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useInstruction } from '@/hooks/queries'
import { T } from '@/lib/model/repo'
import type { Published } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { useEntitlement } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { BookOpen } from 'lucide-react'

export default function ReadInstructionPage() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const session = useSession()
  const t = useMessages()
  const instruction = useInstruction(id)
  const voiceToggle = useToggle('voiceAssistant')
  const voiceRight = useEntitlement('voice_assistant')
  // Toggle coupé : la fonction n'existe pas. Facturation : ouverte si incluse (ou facturation éteinte).
  const voice = voiceToggle && (voiceRight === 'off' || voiceRight === 'open')
  const preview = params.get('apercu') === '1'
  // L'aperçu d'un brouillon qu'on peut modifier : l'assistant d'édition, dans une bulle.
  const previewAgent = useToggle('previewAgent')
  const editable = preview && previewAgent && session.can('instructions', 'write')
  // L'aperçu part du brouillon : déjà lu plus tôt, il attend sa relecture (il a pu changer ailleurs).
  const [freshId, setFreshId] = useState<string | null>(null)
  useEffect(() => {
    if (instruction.data && !instruction.isFetching) setFreshId(id)
  }, [instruction.data, instruction.isFetching, id])
  const publishedId = instruction.data?.json_data.publishedId
  const published = useQuery({
    queryKey: ['published', id, publishedId],
    queryFn: () => session.data.get<Published>(T.published, publishedId!),
    enabled: !!publishedId && !preview,
  })

  const back = () => (window.history.length > 1 ? router.back() : router.push(`/instructions/${id}`))

  if (instruction.isLoading || (published.isLoading && !preview && publishedId) || (preview && freshId !== id && instruction.isFetching)) return <Skeleton className="h-[70dvh] w-full" />
  if (instruction.error) return <ErrorState error={instruction.error} onRetry={() => instruction.refetch()} />
  const doc = instruction.data!
  const content = preview ? doc.json_data.draft : published.data?.json_data.content ?? null
  if (!content) {
    return (
      <EmptyState
        icon={<BookOpen className="h-7 w-7" />}
        title={t.instructions.read.notPublishedTitle}
        description={t.instructions.read.notPublishedText}
        action={<LinkButton href={`/instructions/${id}/lire?apercu=1`} variant="primary">{t.instructions.read.previewDraft}</LinkButton>}
      />
    )
  }
  const player = {
    instructionId: id,
    publishedId: publishedId ?? undefined,
    version: preview ? null : published.data?.json_data.version,
    branding: published.data?.json_data.branding ?? { orgName: session.org.json_data.name, logoUrl: session.org.json_data.logoUrl, color: session.org.json_data.color },
    source: 'app' as const,
    deps: { data: session.data, ai: session.ai, files: session.files },
    preview,
    onExit: back,
    exitLabel: preview ? t.instructions.read.backToEditor : t.common.close,
    allowVoice: voice,
    allowQuestions: true,
  }
  if (editable) return <PreviewEditing key={id} doc={doc} player={player} />
  return <Player content={content} {...player} />
}
