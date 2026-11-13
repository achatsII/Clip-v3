'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { useMessages } from '@/lib/i18n'
import { latestQualifications, listQualifications, QUALIFICATIONS_KEY } from '@/lib/model/academy'
import { T } from '@/lib/model/repo'
import type { Operator } from '@/lib/model/types'
import { buildAttestationHtml, type AttestationRow } from '@/lib/pdf/attestationHtml'
import { formatDate } from '@/lib/util/cn'

/** L'attestation de qualification d'une personne (Académie), prête à imprimer. */
export default function AttestationPage() {
  const { id } = useParams<{ id: string }>()
  const { data, org } = useSession()
  const t = useMessages()
  const a = t.academy
  const op = useQuery({ queryKey: ['operator', id], queryFn: () => data.get<Operator>(T.operator, id) })
  const quals = useQuery({ queryKey: QUALIFICATIONS_KEY, queryFn: () => listQualifications(data) })
  const frame = useRef<HTMLIFrameElement>(null)
  const [now] = useState(() => Date.now())

  const html = useMemo(() => {
    if (!op.data || !quals.data) return ''
    // La plus récente signature de chaque poste, si elle qualifie encore aujourd'hui.
    const rows: AttestationRow[] = [...latestQualifications(quals.data.filter((q) => q.json_data.operatorId === id)).values()]
      .filter((q): q is typeof q & { level: AttestationRow['level'] } => q.level !== 'none' && (!q.validUntil || Date.parse(q.validUntil) > now))
      .sort((x, y) => x.stationName.localeCompare(y.stationName))
      .map((q) => ({ stationName: q.stationName, level: q.level, byName: q.byName, at: q.at, validUntil: q.validUntil }))
    const o = org.json_data
    return buildAttestationHtml({
      orgName: o.name,
      logoUrl: o.logoUrl,
      color: o.color,
      person: op.data.json_data.name,
      rows,
      texts: { title: a.attestationTitle, intro: a.attestationIntro(o.name, op.data.json_data.name), head: [...a.attestationHead], none: a.attestationNone, printedOn: a.printedOn(formatDate(new Date(now).toISOString())), noExpiry: a.noExpiry, signature: a.signature, levels: { qualified: a.signatures.qualified, trainer: a.signatures.trainer } },
      date: (iso) => formatDate(iso),
    })
  }, [op.data, quals.data, id, org.json_data, a, now])

  async function print() {
    if (hasCapability('print')) {
      await callNative('print', { html }).catch(() => undefined)
      return
    }
    frame.current?.contentWindow?.focus()
    frame.current?.contentWindow?.print()
  }

  if (op.isLoading || quals.isLoading) return <Skeleton className="h-[80dvh] w-full" />
  const failed = op.error ?? quals.error
  if (failed || !op.data) return <ErrorState error={failed} onRetry={() => void Promise.all([op.refetch(), quals.refetch()])} />

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="glass-nav pt-safe flex items-center gap-3 border-b px-4 py-3">
        <Link href="/equipe?vue=competences" className="btn-press flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-black">
          <ArrowLeft className="h-4 w-4" /> {t.common.back}
        </Link>
        <p className="flex-1 truncate text-sm font-bold text-slate-500">{a.attestationTitle}</p>
        <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={print} disabled={!html}>
          {a.print}
        </Button>
      </div>
      <iframe ref={frame} title={a.attestationTitle} srcDoc={html} className="min-h-0 w-full flex-1 bg-white" />
    </div>
  )
}
