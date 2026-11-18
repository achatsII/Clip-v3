'use client'

import { useEffect, useState } from 'react'
import { CONSENT_GRANTED_EVENT, readConsent, trackEvent } from '@/lib/site/consent'
import { armOf, assign, experimentOf, readArms, saveArm, type ExperimentId } from '@/lib/site/experiments'
import type { SiteLang } from '@/lib/site/lang'

/** Le toggle `siteExperiments`, lu une fois par page ; sans serveur, non (le repli n'ouvre aucun test). */
let toggle: Promise<boolean> | null = null
function experimentsOn(): Promise<boolean> {
  toggle ??= fetch('/api/config', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ toggles?: Record<string, boolean> }>) : null))
    .then((c) => c?.toggles?.siteExperiments === true)
    .catch(() => false)
  return toggle
}

/**
 * Le bras d'un test A/B pour ce visiteur (`src/lib/site/experiments.ts`). Au premier rendu, toujours le
 * témoin (la page est statique, le même pour tous) ; ensuite, avec l'accord et le toggle, le bras tiré, gardé
 * dans ce navigateur. Le tirage envoie `experience_vue` une fois.
 */
export function useArm(id: ExperimentId, ctx: { lang: SiteLang; page: string; offer: string; place: string }): string {
  const xp = experimentOf(id)!
  const [arm, setArm] = useState(() => armOf(xp, {}))
  useEffect(() => {
    let alive = true
    const run = () =>
      void experimentsOn().then((on) => {
        if (!alive) return
        if (!on || readConsent() !== 'granted') return setArm(armOf(xp, {}))
        const { arm: mine, fresh } = assign(xp, readArms())
        if (fresh) {
          saveArm(xp.id, mine)
          trackEvent('experience_vue', { offre: ctx.offer, type_page: ctx.page, langue: ctx.lang, emplacement: ctx.place, experience: xp.id, variante: mine })
        }
        setArm(mine)
      })
    run()
    window.addEventListener(CONSENT_GRANTED_EVENT, run)
    return () => {
      alive = false
      window.removeEventListener(CONSENT_GRANTED_EVENT, run)
    }
  }, [xp, ctx.offer, ctx.page, ctx.lang, ctx.place])
  return arm
}
