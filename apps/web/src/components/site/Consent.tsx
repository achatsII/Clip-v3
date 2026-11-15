'use client'

import { Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CONSENT_OPEN_EVENT, loadHubSpot, readConsent, revokeHubSpot, saveConsent } from '@/lib/site/consent'

/**
 * La bannière des témoins (Loi 25) : rien n'est chargé avant « Accepter » ; refuser est aussi simple
 * qu'accepter (deux boutons identiques) et efface les témoins de HubSpot. Le lien « Témoins » du
 * pied de page la rouvre.
 */
export function ConsentBanner({ hubId, t, privacyUrl }: { hubId: string; t: { title: string; text: string; accept: string; refuse: string; policy: string }; privacyUrl: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const choice = readConsent()
    if (choice === 'granted') loadHubSpot(hubId)
    else if (choice === null) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
  }, [hubId])

  if (!open) return null

  function choose(granted: boolean) {
    saveConsent(granted ? 'granted' : 'denied')
    if (granted) loadHubSpot(hubId)
    else revokeHubSpot()
    setOpen(false)
  }

  return (
    <div
      role="region"
      aria-label={t.title}
      className="animate-slide-up fixed inset-x-3 bottom-3 z-50 sm:right-auto sm:left-4 sm:max-w-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="glass-float rounded-[26px] p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
          <Cookie className="h-4 w-4 text-[var(--primary)]" aria-hidden />
          {t.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed font-medium text-slate-600 dark:text-slate-300">
          {t.text}{' '}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--primary-strong)] underline underline-offset-2 dark:text-sky-300">
            {t.policy}
          </a>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => choose(false)} className="btn-press h-11 rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
            {t.refuse}
          </button>
          <button type="button" onClick={() => choose(true)} className="btn-press h-11 rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Le lien « Témoins » du pied de page : rouvre la bannière pour changer d'avis. */
export function CookieSettingsButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {children}
    </button>
  )
}
