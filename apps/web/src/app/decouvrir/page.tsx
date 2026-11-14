import { LibraryView } from '@/components/decouvrir/Library'
import { readVideoMetas } from '@/lib/decouvrir/server/videos'

/** La bibliothèque : les vidéos publiées se lisent au build (public/decouvrir/videos/<id>.json). */
export default function Page() {
  return <LibraryView metas={readVideoMetas()} />
}
