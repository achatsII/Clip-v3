'use client'

import { SectorList } from '@/components/PlacePicker'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, ExternalLink, Lock, Mic, QrCode, RefreshCw, Tablet, Trash2, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { InstructionRow } from '@/components/InstructionCard'
import { QrCode as Qr } from '@/components/QrCode'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { ChoiceTile, Input, Label, Switch } from '@/components/ui/Field'
import { MicButton } from '@/components/ui/MicButton'
import { EmptyState, ErrorState, Skeleton, errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useStationInstructions, useStations } from '@/hooks/queries'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { insertDictation } from '@/lib/media/dictation'
import { nowIso, T } from '@/lib/model/repo'
import type { Station } from '@/lib/model/types'
import { LINK_SCOPE_VERSION } from '@/lib/model/linkScope'
import { copyText, createShareLink, linkUrl } from '@/lib/share'
import { useToggle } from '@/lib/toggles'
import { formatDate } from '@/lib/util/cn'

export default function StationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, can } = useSession()
  const t = useMessages()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const stations = useStations()
  const instructions = useStationInstructions(id)
  const voiceToggle = useToggle('voiceAssistant')
  const operatorsOn = useToggle('operators')
  const voice = useEntitlement('voice_assistant')
  const gate = useGate()
  const [busy, setBusy] = useState(false)
  const [assistant, setAssistant] = useState(false)
  const station = stations.data?.find((s) => s._id === id)
  const canWrite = can('stations', 'write')
  const nameRef = useRef<HTMLInputElement>(null)

  if (stations.isLoading) return <Skeleton className="h-96" />
  if (stations.error) return <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
  if (!station) return <EmptyState icon={<QrCode className="h-7 w-7" />} title={t.stations.detail.notFound} action={<Link href="/postes" className="font-black text-[var(--primary)]">{t.stations.detail.allStations}</Link>} />

  const s = station.json_data
  const w = t.stations.detail
  const url = s.linkId ? linkUrl('station', s.linkId) : null
  const linked = instructions.data ?? []

  async function patch(p: Partial<Station>) {
    await data.patch(T.station, id, p as Record<string, unknown>)
    await qc.invalidateQueries({ queryKey: qk.stations })
  }

  async function makeLink(mode: 'focus' | 'only', withAssistant: boolean) {
    setBusy(true)
    try {
      const link = await createShareLink('station', id, { mode, assistant: withAssistant })
      // Un nouveau code remplace l'ancien pour de bon : les anciens liens ne suivent plus.
      await patch({ linkId: link.id, linkMode: mode, linkCreatedAt: nowIso(), linkVersion: LINK_SCOPE_VERSION, linkAssistant: withAssistant, linkFollow: [] })
      toast.success(s.linkId ? w.qrReplaced : w.qrCreated, s.linkId ? w.qrReplacedHint : w.qrCreatedHint)
    } catch (e) {
      toast.error(w.qrFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  /** Met le lien à jour (nouvelle portée) : la tablette et les codes QR imprimés suivent le nouveau. */
  async function upgradeLink() {
    if (!s.linkId) return
    setBusy(true)
    try {
      const withAssistant = s.linkAssistant ?? assistant
      const link = await createShareLink('station', id, { mode: s.linkMode ?? 'focus', assistant: withAssistant })
      await patch({ linkId: link.id, linkCreatedAt: nowIso(), linkVersion: LINK_SCOPE_VERSION, linkAssistant: withAssistant, linkFollow: [...(s.linkFollow ?? []), s.linkId] })
      toast.success(w.upgraded, w.upgradedHint)
    } catch (e) {
      toast.error(w.qrFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const outdated = operatorsOn && canWrite && !!s.linkId && (s.linkVersion ?? 1) < LINK_SCOPE_VERSION

  return (
    <div className="space-y-6">
      <Link href="/postes" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> {w.back}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps text-slate-500">{s.area || w.eyebrow}</p>
          <div className="flex items-center gap-1">
            <input
              ref={nameRef}
              defaultValue={s.name}
              readOnly={!canWrite}
              onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && void patch({ name: e.target.value.trim() })}
              className="w-full min-w-0 bg-transparent text-4xl font-black tracking-tighter focus:outline-none"
              aria-label={w.nameLabel}
            />
            {canWrite && <MicButton label={w.dictateName} onText={(text) => insertDictation(nameRef.current, text)} />}
          </div>
          {s.code && <p className="text-lg font-black text-slate-400">{s.code}</p>}
        </div>
        {canWrite && (
          <Button
            variant="ghost"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              if (!(await confirm({ title: w.deleteTitle(s.name), description: w.deleteDescription, confirmLabel: w.deleteConfirm, danger: true }))) return
              await data.remove(T.station, id)
              await qc.invalidateQueries({ queryKey: qk.stations })
              router.push('/postes')
            }}
          >
            {t.common.delete}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <h2 className="mb-4 text-lg font-black tracking-tight">{w.qrTitle}</h2>
          {outdated && (
            <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-amber-50 p-3 sm:flex-row sm:items-center dark:bg-amber-500/10">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-amber-900 dark:text-amber-100">{w.upgradeTitle}</p>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{w.upgradeHint}</p>
              </div>
              <Button size="sm" loading={busy} icon={<RefreshCw className="h-4 w-4" />} onClick={() => void upgradeLink()}>
                {w.upgrade}
              </Button>
            </div>
          )}
          {url ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Qr value={url} size={200} />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm font-bold text-slate-500">
                  {s.linkMode === 'only' ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" /> {w.onlyThisStation}
                    </span>
                  ) : w.thisStationFirst}{' '}
                  {w.createdOn(formatDate(s.linkCreatedAt))}
                </p>
                <p className="glass-input truncate rounded-xl px-3 py-2 text-xs font-bold">{url}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={url} target="_blank" rel="noreferrer" className="btn-press bg-gradient-primary shadow-primary inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black text-white">
                    <Tablet className="h-4 w-4" /> {w.openTablet}
                  </a>
                  <Button
                    icon={<Copy className="h-4 w-4" />}
                    onClick={async () => {
                      if (await copyText(url)) toast.success(w.linkCopied)
                    }}
                  >
                    {w.copy}
                  </Button>
                  <Link href={`/postes/etiquettes?poste=${id}`} className="btn-press glass-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black">
                    <ExternalLink className="h-4 w-4" /> {w.printLabel}
                  </Link>
                </div>
                <p className="text-xs font-medium text-slate-400">{w.tabletTip}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-medium text-slate-600 dark:text-slate-300">{w.choose}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceTile selected={false} onClick={() => makeLink('focus', assistant)} title={w.focusTitle} description={w.focusDescription} />
                <ChoiceTile selected={false} onClick={() => makeLink('only', assistant)} icon={<Lock className="h-5 w-5" />} title={w.onlyTitle} description={w.onlyDescription} />
              </div>
            </div>
          )}
          {canWrite && operatorsOn && (
            <div className="mt-5 border-t border-slate-900/5 pt-4 dark:border-white/5">
              <Switch
                checked={!!s.askOperator}
                onChange={(v) => void patch({ askOperator: v })}
                label={
                  <span className="inline-flex items-center gap-2">
                    <UserRound className="h-4 w-4" /> {w.askOperator}
                  </span>
                }
                description={w.askOperatorDescription}
              />
            </div>
          )}
          {canWrite && voiceToggle && (
            <div className="mt-5 border-t border-slate-900/5 pt-4 dark:border-white/5">
              <Switch
                checked={assistant}
                onChange={(v) => gate(voice, 'voice_assistant', () => setAssistant(v))}
                label={
                  <span className="inline-flex items-center gap-2">
                    <Mic className="h-4 w-4" /> {w.voiceAssistant} {voice === 'locked' && <LockBadge />}
                  </span>
                }
                description={w.voiceAssistantDescription}
              />
            </div>
          )}
          {canWrite && url && (
            <Button
              className="mt-4"
              variant="ghost"
              loading={busy}
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={async () => {
                if (await confirm({ title: w.replaceTitle, description: w.replaceDescription, confirmLabel: w.replaceConfirm })) void makeLink(s.linkMode ?? 'focus', assistant)
              }}
            >
              {w.replace}
            </Button>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-black tracking-tight">{w.details}</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="code">{w.code}</Label>
              <Input id="code" defaultValue={s.code} readOnly={!canWrite} onBlur={(e) => e.target.value !== (s.code ?? '') && void patch({ code: e.target.value.trim() || undefined })} />
            </div>
            <div>
              <Label htmlFor="area">{w.area}</Label>
              <Input id="area" list="sectors" defaultValue={s.area} readOnly={!canWrite} onBlur={(e) => e.target.value !== (s.area ?? '') && void patch({ area: e.target.value.trim() || undefined })} />
              <SectorList stations={stations.data ?? []} />
            </div>
          </div>
        </Panel>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-black tracking-tight">{w.instructions(linked.length)}</h2>
        {linked.length ? (
          <div className="space-y-2">
            {linked.map((d) => (
              <InstructionRow key={d._id} doc={d} stationNames={[s.name]} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<QrCode className="h-7 w-7" />} title={w.noInstructionsTitle} description={w.noInstructionsDescription} action={can('instructions', 'write') ? <Link href="/instructions/nouvelle" className="font-black text-[var(--primary)]">{w.createInstruction}</Link> : undefined} />
        )}
      </section>
    </div>
  )
}
