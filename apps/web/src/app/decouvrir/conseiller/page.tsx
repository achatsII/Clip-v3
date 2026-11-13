import type { Metadata } from 'next'
import { AdvisorView } from '@/components/decouvrir/Advisor'
import { VIDEO_IDS } from '@/lib/decouvrir/catalog'
import { readVideoMetas } from '@/lib/decouvrir/server/videos'

export const metadata: Metadata = { title: 'Conseiller' }

/** Le conseiller : les chapitres des vidéos publiées lui servent à dire où voir une fonction (la vidéo et son chapitre). */
export default function Page() {
  const metas = readVideoMetas()
  const published = VIDEO_IDS.filter((id) => metas[id])
  const chapters = Object.fromEntries(published.map((id) => [id, metas[id].chapters]))
  return <AdvisorView chapters={chapters} published={published} />
}
