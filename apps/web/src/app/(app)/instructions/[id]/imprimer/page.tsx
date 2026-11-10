'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useInstruction, useStations, useVersions } from '@/hooks/queries'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { BILLING_V2 } from '@/lib/config'
import { buildPrintHtml } from '@/lib/pdf/printHtml'
import { T } from '@/lib/model/repo'
import type { Published } from '@/lib/model/types'
import { linkUrl } from '@/lib/share'
import { useEntitlement } from '@/lib/billing/state'

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const session = useSession()
  const instruction = useInstruction(id)
  const stations = useStations()
  const versions = useVersions(id)
  const brandKit = useEntitlement('brand_kit')
  const frame = useRef<HTMLIFrameElement>(null)
  const [qr, setQr] = useState<string | null>(null)
  const doc = instruction.data
  const published = useQuery({
    queryKey: ['published', id, doc?.json_data.publishedId],
    queryFn: () => session.data.get<Published>(T.published, doc!.json_data.publishedId!),
    enabled: !!doc?.json_data.publishedId,
  })
  const live = doc?.json_data.shareLinkId ? linkUrl('instruction', doc.json_data.shareLinkId) : null

  useEffect(() => {
    if (!live) return
    void QRCode.toString(live, { type: 'svg', margin: 0 }).then(setQr).catch(() => setQr(null))
  }, [live])

  const html = useMemo(() => {
    if (!doc) return ''
    // La version publiée si elle existe et que le brouillon ne diffère pas ; sinon le brouillon, marqué comme tel.
    const usePublished = !!published.data && !doc.json_data.dirty
    const content = usePublished ? published.data!.json_data.content : doc.json_data.draft
    if (!content) return ''
    const latest = versions.data?.[0]?.json_data
    return buildPrintHtml(content, {
      branding: { orgName: session.org.json_data.name, logoUrl: session.org.json_data.logoUrl, color: session.org.json_data.color },
      version: usePublished ? published.data!.json_data.version : null,
      publishedAt: usePublished ? published.data!.json_data.publishedAt : null,
      approvedByName: usePublished ? latest?.approvedByName ?? null : null,
      stationNames: (stations.data ?? []).filter((s) => doc.json_data.stationIds.includes(s._id)).map((s) => s.json_data.name),
      liveUrl: live,
      qrSvg: qr,
      showClipMention: BILLING_V2 && brandKit === 'locked',
      draft: !usePublished,
    })
  }, [doc, published.data, versions.data, stations.data, session.org.json_data, live, qr, brandKit])

  async function print() {
    if (hasCapability('print')) {
      await callNative('print', { html }).catch(() => undefined)
      return
    }
    frame.current?.contentWindow?.focus()
    frame.current?.contentWindow?.print()
  }

  if (instruction.isLoading) return <Skeleton className="h-[80dvh] w-full" />
  if (instruction.error || !doc) return <ErrorState error={instruction.error} onRetry={() => instruction.refetch()} />

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="glass-nav pt-safe flex items-center gap-3 border-b px-4 py-3">
        <Link href={`/instructions/${id}`} className="btn-press flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-black">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <p className="flex-1 truncate text-sm font-bold text-slate-500">Aperçu du PDF — choisissez « Enregistrer en PDF » dans la fenêtre d’impression.</p>
        <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={print} disabled={!html}>
          Imprimer ou enregistrer en PDF
        </Button>
      </div>
      <iframe ref={frame} title="Aperçu du PDF" srcDoc={html} className="min-h-0 w-full flex-1 bg-white" />
    </div>
  )
}
