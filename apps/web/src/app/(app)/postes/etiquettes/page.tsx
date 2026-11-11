'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { QrCode } from '@/components/QrCode'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonCards } from '@/components/ui/States'
import { useStations } from '@/hooks/queries'
import { useMessages } from '@/lib/i18n'
import { linkUrl } from '@/lib/share'

/** Planche d'étiquettes QR à imprimer et à coller sur les postes. */
export default function LabelsPage() {
  const params = useSearchParams()
  const only = params.get('poste')
  const { org } = useSession()
  const t = useMessages().stations.labels
  const stations = useStations()
  const list = (stations.data ?? []).filter((s) => s.json_data.linkId && (!only || s._id === only))

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/postes" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>
        <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} disabled={!list.length}>
          {t.print}
        </Button>
      </div>
      {stations.isLoading ? (
        <SkeletonCards count={4} />
      ) : !list.length ? (
        <EmptyState icon={<Printer className="h-7 w-7" />} title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
          {list.map((s) => (
            <div key={s._id} className="print-avoid flex items-center gap-4 rounded-[24px] border-2 border-slate-900 bg-white p-4 text-slate-900">
              <QrCode value={linkUrl('station', s.json_data.linkId!)} size={150} className="shrink-0 p-0" />
              <div className="min-w-0">
                {org.json_data.logoUrl ? <img src={org.json_data.logoUrl} alt="" className="mb-2 h-8 max-w-28 object-contain" /> : <p className="label-caps text-slate-500">{org.json_data.name}</p>}
                <p className="text-2xl leading-tight font-black tracking-tight">{s.json_data.name}</p>
                {s.json_data.code && <p className="text-lg font-black text-slate-500">{s.json_data.code}</p>}
                <p className="mt-2 text-sm font-bold">📱 {t.scan}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
