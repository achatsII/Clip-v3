import { redirect } from 'next/navigation'
import { resolveVideoId } from '@/lib/decouvrir/catalog'

/** L'adresse d'une vidéo : la bibliothèque l'ouvre dans son lecteur (un ancien identifiant mène à la nouvelle vidéo). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const video = resolveVideoId(id)
  redirect(video ? `/decouvrir?v=${encodeURIComponent(video)}` : '/decouvrir')
}
