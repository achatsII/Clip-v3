'use client'

import { useToggle } from '@/lib/toggles'
import { DEFAULT_RENEWAL_MONTHS, RENEWAL_CHOICES } from '@/lib/model/renewal'
import { AccountCard } from '@/components/settings/Account'
import { Check, CreditCard, Download, ImagePlus, Loader2, Lock, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { AppearanceControls } from '@/components/settings/Appearance'
import { MembersTab } from '@/components/settings/MembersTab'
import { StandardTab } from '@/components/settings/StandardTab'
import { Button } from '@/components/ui/Button'
import { ChoiceTile, Input, Label, Segmented } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { PageHeader, Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { BILLING_V2, APP_IDENTIFIER, GATEWAY_URL } from '@/lib/config'
import { useMessages, type Messages } from '@/lib/i18n'
import { compressImage } from '@/lib/media/image'
import { listInstructions, listVersions } from '@/lib/model/repo'
import { applyBrandColor } from '@/lib/theme'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { cn } from '@/lib/util/cn'

type Tab = 'usine' | 'standard' | 'approbation' | 'membres' | 'apparence' | 'donnees'

/** Les onglets : la valeur dans l'adresse, la clé du libellé (lu au rendu, dans la langue de l'outil). */
const TABS: Array<{ value: Tab; label: keyof Messages['settings']['tabs']; admin?: boolean }> = [
  { value: 'usine', label: 'plant', admin: true },
  { value: 'standard', label: 'standard' },
  { value: 'approbation', label: 'approval', admin: true },
  { value: 'membres', label: 'members', admin: true },
  { value: 'apparence', label: 'appearance' },
  { value: 'donnees', label: 'data' },
]

export default function SettingsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { can } = useSession()
  const t = useMessages().settings
  const isAdmin = can('settings', 'write')
  const tabs = TABS.filter((x) => !x.admin || isAdmin)
  const requested = params.get('onglet') as Tab | null
  const tab: Tab = tabs.some((x) => x.value === requested) ? requested! : tabs[0].value

  return (
    <div>
      <PageHeader
        title={t.title}
        actions={
          BILLING_V2 ? (
            <Link href="/reglages/abonnement" className="btn-press glass-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black">
              <CreditCard className="h-4 w-4" /> {t.subscription}
            </Link>
          ) : undefined
        }
      />
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map((x) => (
          <button key={x.value} type="button" role="tab" aria-selected={tab === x.value} onClick={() => router.replace(`/reglages?onglet=${x.value}`)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-4 text-sm font-black', tab === x.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
            {t.tabs[x.label]}
          </button>
        ))}
      </div>
      {tab === 'usine' && <PlantTab />}
      {tab === 'standard' && <StandardTab />}
      {tab === 'approbation' && <ApprovalTab />}
      {tab === 'membres' && <MembersTab />}
      {tab === 'apparence' && <AppearanceTab />}
      {tab === 'donnees' && <DataTab />}
    </div>
  )
}

function PlantTab() {
  const { org, updateOrg, files } = useSession()
  const renewalOn = useToggle('renewal')
  const words = useMessages()
  const t = words.settings.plant
  const toast = useToast()
  const brand = useEntitlement('brand_kit')
  const gate = useGate()
  const [name, setName] = useState(org.json_data.name)
  const [color, setColor] = useState(org.json_data.color ?? '#0078FF')
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function uploadLogo(file: File) {
    setUploading(true)
    try {
      const { blob } = await compressImage(file, 600, 0.9)
      const u = await files.upload(blob, file.name, 'brand')
      await updateOrg({ logoUrl: u.url })
      toast.success(t.logoSaved, t.logoSavedHint)
    } catch (e) {
      toast.error(t.logoFailed, errorText(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <h2 className="mb-4 text-xl font-black tracking-tight">{t.title}</h2>
        <Label htmlFor="org-name">{t.name}</Label>
        <div className="flex gap-2">
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="primary" disabled={!name.trim() || name === org.json_data.name} onClick={() => void updateOrg({ name: name.trim() }).then(() => toast.success(t.nameSaved))}>
            {words.common.save}
          </Button>
        </div>
        {renewalOn && (
          <div className="mt-5">
            <Label>{t.renewal}</Label>
            <Segmented
              size="sm"
              value={String(org.json_data.renewalMonths === undefined ? DEFAULT_RENEWAL_MONTHS : org.json_data.renewalMonths)}
              onChange={(v) => void updateOrg({ renewalMonths: v === 'null' ? null : Number(v) }).then(() => toast.success(t.renewalSaved))}
              options={RENEWAL_CHOICES.map((m) => ({ value: String(m), label: words.instructions.renewal.choice(m) }))}
            />
            <p className="mt-1.5 text-xs font-bold text-slate-400">{t.renewalHint}</p>
          </div>
        )}
      </Panel>
      <Panel>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight">{t.brandTitle} {brand === 'locked' && <LockBadge />}</h2>
        <p className="mb-4 text-sm font-medium text-slate-500">{t.brandNote}</p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => gate(brand, 'brand_kit', () => input.current?.click())} className="btn-press glass-card flex h-24 w-40 items-center justify-center overflow-hidden rounded-[24px]">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : org.json_data.logoUrl ? <img src={org.json_data.logoUrl} alt={t.logo} className="max-h-20 max-w-36 object-contain" /> : <span className="flex flex-col items-center gap-1 text-sm font-black text-slate-500"><ImagePlus className="h-6 w-6" /> {t.addLogo}</span>}
          </button>
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void uploadLogo(e.target.files[0])} />
          <div>
            <Label htmlFor="org-color">{t.color}</Label>
            <div className="flex items-center gap-2">
              <input id="org-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-12 w-16 cursor-pointer rounded-xl border-0 bg-transparent" />
              <Button
                size="sm"
                onClick={() =>
                  gate(brand, 'brand_kit', () =>
                    void updateOrg({ color }).then(() => {
                      applyBrandColor(color)
                      toast.success(t.colorApplied)
                    }),
                  )
                }
              >
                {t.apply}
              </Button>
              {org.json_data.color && (
                <Button size="sm" variant="ghost" onClick={() => void updateOrg({ color: null }).then(() => applyBrandColor(null))}>
                  {t.defaultBlue}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function ApprovalTab() {
  const { org, updateOrg } = useSession()
  const t = useMessages().settings.approval
  const toast = useToast()
  const approvals = useEntitlement('approvals')
  const gate = useGate()
  const mode = org.json_data.approval.mode
  const set = (m: 'none' | 'one') =>
    void updateOrg({ approval: { ...org.json_data.approval, mode: m } }).then(() => toast.success(m === 'none' ? t.directOn : t.approvalOn, m === 'none' ? t.directOnHint : t.approvalOnHint))
  return (
    <Panel className="max-w-3xl">
      <h2 className="mb-1 text-xl font-black tracking-tight">{t.title}</h2>
      <p className="mb-5 text-sm font-medium text-slate-500">{t.intro}</p>
      <div className="grid gap-3">
        <ChoiceTile selected={mode === 'none'} onClick={() => set('none')} icon={<Check className="h-5 w-5" />} title={t.noneTitle} description={t.noneDescription} />
        <ChoiceTile
          selected={mode === 'one'}
          onClick={() => gate(approvals, 'approvals', () => set('one'))}
          icon={<Lock className="h-5 w-5" />}
          title={<span className="inline-flex items-center gap-2">{t.oneTitle} {approvals === 'locked' && <LockBadge />}</span>}
          description={t.oneDescription}
        />
      </div>
      {mode === 'one' && <p className="mt-4 text-sm font-bold text-slate-500">{t.approversNote}</p>}
    </Panel>
  )
}

function AppearanceTab() {
  const { org } = useSession()
  const t = useMessages().settings.appearance
  return (
    <Panel className="max-w-2xl">
      <h2 className="mb-4 text-xl font-black tracking-tight">{t.title}</h2>
      <AppearanceControls brandColor={org.json_data.color} />
      <div className="mt-8 flex items-start gap-3 rounded-[24px] bg-primary-soft p-4">
        <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-[var(--primary)]" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.mobileNote}</p>
      </div>
    </Panel>
  )
}

function DataTab() {
  const { data, org } = useSession()
  const t = useMessages().settings.data
  const toast = useToast()
  const fullExport = useEntitlement('full_export')
  const gate = useGate()
  const [busy, setBusy] = useState(false)

  async function exportAll() {
    setBusy(true)
    try {
      const list = await listInstructions(data, undefined, 2000)
      const full = await Promise.all(list.map((d) => data.get(`clip_instruction`, d._id)))
      const versions = await Promise.all(list.map((d) => listVersions(data, d._id).catch(() => [])))
      const payload = {
        format: 'clip-v3/export',
        exportedAt: new Date().toISOString(),
        organization: org.json_data.name,
        instructions: full.filter(Boolean).map((d, i) => ({ id: d!._id, ...(d!.json_data as object), versions: versions[i].map((v) => v.json_data) })),
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
      a.download = `clip-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      toast.success(t.exportReady, t.exportReadyHint(payload.instructions.length))
    } catch (e) {
      toast.error(t.exportFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <Panel>
        <h2 className="mb-1 text-xl font-black tracking-tight">{t.title}</h2>
        <p className="mb-4 text-sm font-medium text-slate-500">{t.intro}</p>
        <Button icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} loading={busy} onClick={() => gate(fullExport, 'full_export', () => void exportAll())}>
          {t.exportAll} {fullExport === 'locked' && <LockBadge />}
        </Button>
      </Panel>
      <AccountCard />
      <Panel>
        <h2 className="mb-2 text-lg font-black tracking-tight">{t.connection}</h2>
        <p className="text-sm font-medium text-slate-500">{t.gateway(GATEWAY_URL.replace('https://', ''), APP_IDENTIFIER)}</p>
      </Panel>
    </div>
  )
}
