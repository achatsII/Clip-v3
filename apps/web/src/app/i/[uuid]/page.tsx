'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Player } from '@/components/player/Player'
import { PublicFrame, PublicLoading, PublicMessage } from '@/components/public/PublicShell'
import { ToastProvider } from '@/components/ui/Toast'
import { aiApi } from '@/lib/gateway/ai'
import { dataApi } from '@/lib/gateway/data'
import { filesApi } from '@/lib/gateway/files'
import { canReadAloud, exchangeLink, guestClient, scopedId, type GuestLink } from '@/lib/gateway/guest'
import { findPublished, T } from '@/lib/model/repo'

export default function SharedInstructionPage() {
  return (
    <PublicFrame>
      <ToastProvider>
        <Shared />
      </ToastProvider>
    </PublicFrame>
  )
}

function Shared() {
  const { uuid } = useParams<{ uuid: string }>()
  const [dead, setDead] = useState(false)
  const link = useQuery({ queryKey: ['link', uuid], queryFn: () => exchangeLink(uuid), retry: 1, staleTime: Infinity })
  if (link.isLoading) return <PublicLoading />
  if (link.error || dead || !link.data) return <PublicMessage title="Ce lien ne fonctionne plus" description="Demandez un nouveau lien à la personne qui vous l’a envoyé." />
  return <SharedInner uuid={uuid} link={link.data} onDead={() => setDead(true)} />
}

function SharedInner({ uuid, link, onDead }: { uuid: string; link: GuestLink; onDead: () => void }) {
  const client = useMemo(() => guestClient(uuid, link, onDead), [uuid, link, onDead])
  const data = useMemo(() => dataApi(client), [client])
  const instructionId = scopedId(link, T.published, 'json_data.instructionId')
  const published = useQuery({ queryKey: ['shared', instructionId], queryFn: () => findPublished(data, instructionId!), enabled: !!instructionId })
  const [closed, setClosed] = useState(false)

  if (published.isLoading) return <PublicLoading />
  if (!instructionId || !published.data) return <PublicMessage title="Instruction indisponible" description="Elle a peut-être été retirée ou archivée." />
  if (closed) return <PublicMessage title={published.data.json_data.content.title} description="Merci ! Vous pouvez fermer cette page." />
  const p = published.data
  return (
    <Player
      content={p.json_data.content}
      instructionId={p.json_data.instructionId}
      publishedId={p._id}
      version={p.json_data.version}
      branding={p.json_data.branding}
      source="link"
      deps={{ data, ai: canReadAloud(link.permissions) ? aiApi(client) : null, files: filesApi(client) }}
      onExit={() => setClosed(true)}
      exitLabel="Fermer"
    />
  )
}
