'use client'

/**
 * L'état de facturation du compte connecté (gabarit BillingProvider du skill billing). Relu à la
 * connexion, au retour sur l'onglet, après chaque opération d'IA et après chaque refus. Drapeau
 * éteint : rien n'est lu, aucun verrou, aucune fonction nouvelle — l'app d'avant.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BILLING_V2 } from '../config'
import { onRefusal, onSettled, type Refusal } from './bus'
import { recordTry } from './advisorStore'
import { limitOf, type BillingClient, type BillingState, type LimitStatus } from './client'
import type { FeatureKey } from './catalog'

export interface PaywallRequest {
  feature?: FeatureKey
  refusal?: Refusal
  /** Pour une limite comptée par l'app : où l'on en est (la plateforme ne le sait pas). */
  used?: number
  /** L'action à relancer après l'achat (la saisie est gardée par l'écran). */
  retry?: () => void
  /** Ouverte par le conseiller d'achat (accueil), et non par un refus. */
  source?: 'advisor'
}

interface BillingContextValue {
  enabled: boolean
  /** L'aperçu (drapeau éteint) : l'état vient du catalogue de l'app, rien ne s'achète (`preview.ts`). */
  preview: boolean
  state: BillingState | null
  loading: boolean
  refresh: () => Promise<BillingState | null>
  paywall: PaywallRequest | null
  openPaywall: (r: PaywallRequest) => void
  closePaywall: () => void
  /** Une fonction fermée vient d'être essayée : le conseiller d'achat s'en souvient. */
  noteTry: (feature: string) => void
}

const Ctx = createContext<BillingContextValue>({
  enabled: false,
  preview: false,
  state: null,
  loading: false,
  refresh: async () => null,
  paywall: null,
  openPaywall: () => undefined,
  closePaywall: () => undefined,
  noteTry: () => undefined,
})

const QUIET_MS = 4000

export function BillingProvider({ client, session, enabled = BILLING_V2, preview = false, children }: { client: BillingClient; session: string | null; enabled?: boolean; preview?: boolean; children: ReactNode }) {
  const [read, setRead] = useState<{ session: string; state: BillingState | null } | null>(null)
  const [paywall, setPaywall] = useState<PaywallRequest | null>(null)
  const current = enabled && session && read?.session === session ? read : null
  const state = current?.state ?? null
  const loading = enabled && session !== null && !current
  const latest = useRef(0)
  const lastRefusal = useRef(0)

  const refresh = useCallback((): Promise<BillingState | null> => {
    if (!enabled || !session) return Promise.resolve(null)
    const s = session
    const id = ++latest.current
    return client.context().then(
      (fresh) => {
        if (id !== latest.current) return null
        setRead({ session: s, state: fresh })
        return fresh
      },
      () => {
        if (id === latest.current) setRead((prev) => (prev?.session === s ? prev : { session: s, state: null }))
        return null
      },
    )
  }, [client, enabled, session])

  useEffect(() => {
    if (session) void refresh()
  }, [session, refresh])

  useEffect(() => {
    if (!enabled) return
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    const offSettled = onSettled(() => void refresh())
    const offRefusal = onRefusal((refusal) => {
      void refresh()
      const now = Date.now()
      if (now - lastRefusal.current < QUIET_MS) return
      lastRefusal.current = now
      if (session && refusal.featureKey) recordTry(session, refusal.featureKey)
      setPaywall({ refusal })
    })
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      offSettled()
      offRefusal()
    }
  }, [enabled, refresh, session])

  const value = useMemo<BillingContextValue>(
    () => ({ enabled, preview: enabled && preview, state, loading, refresh, paywall, openPaywall: setPaywall, closePaywall: () => setPaywall(null), noteTry: (feature: string) => session && recordTry(session, feature) }),
    [enabled, preview, state, loading, refresh, paywall, session],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useBilling = () => useContext(Ctx)

/** `off` facturation éteinte · `pending` pas encore lu · `locked` hors plan · `open` inclus. */
export type Entitlement = 'off' | 'pending' | 'locked' | 'open'

export function useEntitlement(featureKey: FeatureKey): Entitlement {
  const { enabled, state, loading } = useBilling()
  if (!enabled) return 'off'
  // En période de grâce, les droits sont maintenus : l'état les rend encore.
  if (state) return state.features[featureKey] === true ? 'open' : 'locked'
  // Un état illisible ne sert jamais la fonction : une feature absente vaut « non ».
  return loading ? 'pending' : 'locked'
}

/** Une limite comptée par l'app (`capacity_source: reported`) ; `null` = rien à verrouiller. */
export function useLimit(featureKey: FeatureKey, used: number | undefined): LimitStatus | null {
  const { enabled, state, loading } = useBilling()
  if (!enabled || used === undefined) return null
  if (!state) return loading ? null : { limit: 0, used, remaining: 0, reached: true }
  return limitOf(state, featureKey, used)
}

/** Ouvre la fonction si elle est incluse, sinon le paywall (avec l'action à relancer). */
export function useGate() {
  const { openPaywall, refresh, noteTry } = useBilling()
  return useCallback(
    (entitlement: Entitlement, feature: FeatureKey, action: () => void) => {
      if (entitlement === 'off' || entitlement === 'open') return action()
      const locked = () => {
        noteTry(feature)
        openPaywall({ feature, retry: action })
      }
      if (entitlement === 'locked') return locked()
      // Pas encore lu : on relit, puis on décide ; illisible, on ne sert pas la fonction.
      void refresh().then((fresh) => (fresh?.features[feature] === true ? action() : locked()))
    },
    [openPaywall, refresh, noteTry],
  )
}
