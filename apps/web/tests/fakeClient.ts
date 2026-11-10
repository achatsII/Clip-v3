import { vi } from 'vitest'
import { ApiError, type CallOptions, type GatewayClient } from '@/lib/gateway/client'

export interface Recorded {
  endpoint: string
  options: CallOptions
}

/** Un client de Gateway factice : enregistre les appels et rend la réponse prévue par route. */
export function fakeGateway(responder: (endpoint: string, options: CallOptions) => unknown): GatewayClient & { calls: Recorded[] } {
  const calls: Recorded[] = []
  return {
    calls,
    source: { getToken: () => 'jeton', refresh: async () => false, onAuthFailure: () => undefined },
    call: vi.fn(async (endpoint: string, options: CallOptions = {}) => {
      calls.push({ endpoint, options })
      const r = responder(endpoint, options)
      if (r instanceof ApiError) throw r
      return r
    }) as GatewayClient['call'],
  }
}
