import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DecouvrirLogin } from '@/components/decouvrir/Login'

export const metadata: Metadata = { title: 'Entrer', robots: { index: false, follow: false } }

/** L'entrée de l'espace relié à Sandboxes (interrupteur éteint, src/proxy.ts renvoie à /decouvrir). */
export default function Page() {
  return (
    <Suspense>
      <DecouvrirLogin />
    </Suspense>
  )
}
