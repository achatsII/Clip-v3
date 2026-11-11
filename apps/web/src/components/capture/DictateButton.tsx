'use client'

import { MicButton } from '@/components/ui/MicButton'

/** Bouton micro à côté d'un champ : on parle, la transcription s'ajoute au texte (sans le remplacer). Sans libellé, « Dicter » (MicButton). */
export function DictateButton({ onText, className, label, size = 'md' }: { onText: (text: string) => void; className?: string; label?: string; size?: 'md' | 'lg' }) {
  return <MicButton onText={onText} className={className} label={label} size={size} tone="solid" />
}
