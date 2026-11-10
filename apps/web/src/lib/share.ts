import { ApiError, getAccessToken } from './gateway/client'

export async function createShareLink(type: 'station' | 'instruction', id: string, opts: { mode?: 'focus' | 'only'; assistant?: boolean } = {}): Promise<{ id: string; url: string }> {
  const token = getAccessToken()
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    body: JSON.stringify({ type, id, ...opts }),
  }).catch(() => null)
  if (!res) throw new ApiError('Pas de connexion au serveur', 0, null, 'network')
  const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string }
  if (!res.ok || !json.id) throw new ApiError(json.error ?? 'Le lien n’a pas pu être créé', res.status)
  return { id: json.id, url: json.url ?? `${window.location.origin}/${type === 'station' ? 'p' : 'i'}/${json.id}` }
}

export function linkUrl(type: 'station' | 'instruction', id: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/${type === 'station' ? 'p' : 'i'}/${id}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
