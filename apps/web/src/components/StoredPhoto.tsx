'use client'

import { Camera } from 'lucide-react'
import type { DataApi } from '@/lib/gateway/data'
import { usePhotoSrc, useOpenableHref } from '@/lib/media/photos'
import { cn } from '@/lib/util/cn'

/**
 * Une photo de preuve ou de retour, quelle que soit sa forme : une adresse du stockage, une image
 * `data:`, ou une référence `clip-photo:` relue dans la base (`src/lib/media/photos.ts`). Sans image
 * lisible ici (encore en lecture, ou un lien qui ne relit pas les photos), un pictogramme tient sa
 * place. `link` : toucher la photo l'ouvre en grand dans un nouvel onglet.
 */
export function StoredPhoto({ value, data, alt, className, link = true }: { value: string; data?: Pick<DataApi, 'get'> | null; alt: string; className?: string; link?: boolean }) {
  const { src, loading } = usePhotoSrc(value, data)
  const href = useOpenableHref(link ? src : null)
  if (!src) {
    return (
      <span role="img" aria-label={alt} className={cn('flex items-center justify-center bg-slate-900/5 text-slate-400 dark:bg-white/10', loading && 'animate-pulse', className)}>
        <Camera className="h-6 w-6" />
      </span>
    )
  }
  const img = <img src={src} alt={alt} className={className} />
  return link && href ? (
    <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
      {img}
    </a>
  ) : (
    img
  )
}
