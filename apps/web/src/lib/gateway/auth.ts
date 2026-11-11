import { APP_IDENTIFIER } from '../config'
import { ApiError, gateway, publicCall, storeTokens } from './client'
import { messages } from '@/lib/i18n'

export interface Profile {
  userId: string
  email: string
  fullname: string | null
  company: string | null
  avatarUrl: string | null
  orgId: string | null
  orgName: string | null
  /** Rôle dans l'organisation (Supabase), pas le claim du jeton. */
  orgRole: 'admin' | 'user' | string | null
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export async function login(email: string, password: string): Promise<void> {
  const data = await publicCall<TokenResponse>(`/api/v1/auth/token?app_identifier=${encodeURIComponent(APP_IDENTIFIER)}`, {
    method: 'POST',
    body: { email: email.trim(), password },
  }).catch((e: ApiError) => {
    if (e.status === 400 || e.status === 401) throw new ApiError('Courriel ou mot de passe incorrect', e.status)
    if (e.status === 404) throw new ApiError(messages().common.errors.noAccess, 404)
    throw e
  })
  if (!data.access_token) throw new ApiError('Connexion impossible', 500)
  storeTokens(data.access_token, data.refresh_token)
}

/** Inscription libre : seulement sur une application déclarée self-service à la Gateway. */
export async function signup(input: { email: string; password: string; fullname?: string; company?: string }): Promise<void> {
  const data = await publicCall<TokenResponse>(`/api/v1/self-service/auth/signup?app_identifier=${encodeURIComponent(APP_IDENTIFIER)}`, {
    method: 'POST',
    body: { email: input.email.trim(), password: input.password, fullname: input.fullname, company: input.company },
  }).catch((e: ApiError) => {
    if (e.status === 403) throw new ApiError("L'inscription libre n'est pas encore ouverte pour cette application.", 403)
    throw e
  })
  if (!data.access_token) throw new ApiError('Inscription impossible', 500)
  storeTokens(data.access_token, data.refresh_token)
}

export async function requestPasswordReset(email: string): Promise<void> {
  await publicCall('/api/v1/auth/recovery/request', { method: 'POST', body: { email: email.trim() } })
}

interface MeResponse {
  user?: { sub?: string }
  results?: {
    email?: string
    profile?: { company?: string; fullname?: string; avatar_url?: string }
    organization?: { id?: string; name?: string }
  }
}

interface OrgMeResponse {
  organization?: { org_id?: string; org_name?: string; role?: string }
}

export async function fetchProfile(): Promise<Profile> {
  const [me, org] = await Promise.all([
    gateway.call<MeResponse>('/api/v1/auth/me'),
    gateway.call<OrgMeResponse>('/api/v1/org/me').catch(() => null),
  ])
  const r = me.results ?? {}
  return {
    userId: me.user?.sub ?? '',
    email: r.email ?? '',
    fullname: r.profile?.fullname || null,
    company: r.profile?.company || null,
    avatarUrl: r.profile?.avatar_url || null,
    orgId: org?.organization?.org_id ?? r.organization?.id ?? null,
    orgName: org?.organization?.org_name ?? r.organization?.name ?? null,
    orgRole: org?.organization?.role ?? null,
  }
}

export async function updateProfile(input: { fullname?: string; company?: string; avatar_url?: string }): Promise<void> {
  await gateway.call('/api/v1/auth/user/profile', { method: 'PUT', body: input })
}
