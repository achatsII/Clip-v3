'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { aiApi, onAiUsage, type AiApi } from '@/lib/gateway/ai'
import { fetchProfile, type Profile } from '@/lib/gateway/auth'
import { gateway, hasSession } from '@/lib/gateway/client'
import { dataApi, type DataApi, type Doc } from '@/lib/gateway/data'
import { filesApi, type FilesApi } from '@/lib/gateway/files'
import { ROLES, type Feature, type Permission } from '@/lib/model/catalog'
import { ensureOrg, logUsage, normalizeOrg, T } from '@/lib/model/repo'
import type { MemberRole, MemberSettings, OrgSettings } from '@/lib/model/types'
import { applyBrandColor } from '@/lib/theme'

export const data = dataApi(gateway)
export const files = filesApi(gateway)
export const ai = aiApi(gateway)

interface SessionValue {
  profile: Profile
  org: Doc<OrgSettings>
  role: MemberRole
  me: MemberSettings
  displayName: string
  can: (feature: Feature, level?: Permission) => boolean
  data: DataApi
  files: FilesApi
  ai: AiApi
  updateOrg: (patch: Record<string, unknown>) => Promise<void>
  refreshOrg: () => Promise<void>
}

const Ctx = createContext<SessionValue | null>(null)

const rank: Record<Permission, number> = { none: 0, read: 1, write: 2 }

export function roleOf(org: OrgSettings, profile: Profile): MemberRole {
  // Réglage de la personne, sinon celui posé à son invitation (clé `email:<courriel>`).
  const explicit = org.members[profile.userId]?.role ?? org.members[`email:${profile.email.toLowerCase()}`]?.role
  if (explicit) return explicit
  if (profile.orgRole === 'admin') return 'admin'
  if (org.createdBy && org.createdBy === profile.userId) return 'admin'
  return 'author'
}

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter()
  const qc = useQueryClient()
  const loggedIn = typeof window !== 'undefined' && hasSession()

  useEffect(() => {
    if (!hasSession()) router.replace('/connexion')
  }, [router])

  const profileQ = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, enabled: loggedIn, staleTime: 5 * 60_000 })
  const orgQ = useQuery({
    queryKey: ['org'],
    enabled: !!profileQ.data,
    staleTime: 60_000,
    queryFn: async () => {
      const p = profileQ.data!
      const doc = await ensureOrg(data, p.orgName || p.company || 'Mon usine')
      if (!doc.json_data.createdBy && p.userId) {
        await data.patch(T.org, doc._id, { createdBy: p.userId }).catch(() => undefined)
        doc.json_data.createdBy = p.userId
      }
      return { ...doc, json_data: normalizeOrg(doc.json_data) }
    },
  })

  const profile = profileQ.data
  const org = orgQ.data

  useEffect(() => {
    applyBrandColor(org?.json_data.color)
  }, [org?.json_data.color])

  useEffect(() => {
    if (!profile) return
    if (hasCapability('context.set')) void callNative('context.set', { organizationId: profile.orgId, userId: profile.userId }).catch(() => undefined)
    const off = onAiUsage((e) => {
      if (!e.ok) return
      const tokens = typeof e.usage?.total_tokens === 'number' ? (e.usage.total_tokens as number) : null
      logUsage(data, { type: 'ai', source: 'app', operation: e.operation, model: e.model, tokens, userId: profile.userId })
    })
    return () => {
      off()
    }
  }, [profile])

  const updateOrg = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!org) return
      await data.patch(T.org, org._id, patch)
      await qc.invalidateQueries({ queryKey: ['org'] })
    },
    [org, qc],
  )
  const refreshOrg = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['org'] })
  }, [qc])

  const value = useMemo<SessionValue | null>(() => {
    if (!profile || !org) return null
    const role = roleOf(org.json_data, profile)
    const me: MemberSettings = org.json_data.members[profile.userId] ?? org.json_data.members[`email:${profile.email.toLowerCase()}`] ?? { role, categories: [], stationIds: [] }
    const perms = ROLES[role].permissions
    return {
      profile,
      org,
      role,
      me: { ...me, role },
      displayName: profile.fullname || profile.email.split('@')[0] || 'Moi',
      can: (feature, level = 'read') => rank[perms[feature]] >= rank[level],
      data,
      files,
      ai,
      updateOrg,
      refreshOrg,
    }
  }, [profile, org, updateOrg, refreshOrg])

  if (profileQ.error || orgQ.error) {
    return <SessionError onRetry={() => (profileQ.error ? profileQ.refetch() : orgQ.refetch())} />
  }
  if (!value) return <>{fallback}</>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function SessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass-panel max-w-md rounded-[32px] p-8 text-center">
        <h1 className="text-2xl font-black tracking-tight">Impossible d’ouvrir CLIP</h1>
        <p className="mt-2 font-medium text-slate-500">Le serveur ne répond pas pour le moment. Vérifiez votre connexion, puis réessayez.</p>
        <button type="button" onClick={onRetry} className="btn-press bg-gradient-primary shadow-primary mt-6 h-12 rounded-full px-6 font-black text-white">
          Réessayer
        </button>
      </div>
    </div>
  )
}

export function useSession(): SessionValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession hors de SessionProvider')
  return ctx
}
