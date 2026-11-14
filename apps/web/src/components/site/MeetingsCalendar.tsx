'use client'

import { CalendarCheck, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { trackConversion } from '@/lib/site/consent'
import { MEETINGS_ORIGIN } from '@/lib/site/routes'

/**
 * Le calendrier de rendez-vous HubSpot, intégré. Il envoie sa hauteur à chaque étape (`{ height }`) :
 * le cadre la reprend (seulement de l'origine meetings.hubspot.com et de ce cadre-ci). Une réservation
 * confirmée (`{ meetingBookSucceeded: true }`) compte une conversion, avec le consentement seulement.
 */
export function MeetingsCalendar({
  src,
  title,
  labels,
  conversionPath,
}: {
  src: string
  title: string
  labels: { loading: string; fallback: string; booked: string; newTab: string }
  conversionPath: string
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const booked = useRef(false)
  const [height, setHeight] = useState(720)
  const [loaded, setLoaded] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== MEETINGS_ORIGIN) return
      if (event.source !== frameRef.current?.contentWindow) return
      const data = event.data as { height?: unknown; meetingBookSucceeded?: unknown } | null
      if (data?.meetingBookSucceeded && !booked.current) {
        booked.current = true
        setDone(true)
        trackConversion(conversionPath)
      }
      const next = data?.height
      if (typeof next === 'number' && next > 0) setHeight(Math.ceil(next))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [conversionPath])

  const page = src.split('?')[0]

  return (
    <div>
      {done && (
        <p className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-300" role="status">
          <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
          {labels.booked}
        </p>
      )}
      <div className="relative overflow-hidden rounded-[26px] bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)]">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col gap-3 p-6" aria-hidden>
            <div className="skeleton h-8 w-1/2 rounded-2xl" />
            <div className="skeleton h-64 rounded-3xl" />
            <div className="skeleton h-12 w-2/3 rounded-2xl" />
          </div>
        )}
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          className="relative block w-full border-0"
          style={{ height }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {!loaded && <p className="sr-only">{labels.loading}</p>}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
        <a href={page} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          {labels.fallback}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">({labels.newTab})</span>
        </a>
      </p>
    </div>
  )
}
