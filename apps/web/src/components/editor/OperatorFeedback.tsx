'use client'

/**
 * Le retour d'un opérateur sur l'étape, dans l'éditeur (les deux vues) : son commentaire et, s'il en a
 * joint une, sa photo, qui se met d'un toucher dans le média de l'étape (toggle `feedbackMedia`).
 */
import { ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { StoredPhoto } from '@/components/StoredPhoto'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useMessages } from '@/lib/i18n'

export function OperatorFeedbackNote({ note, photo, onUsePhoto }: { note: string | null | undefined; photo?: string | null; onUsePhoto?: () => Promise<void> }) {
  const t = useMessages().editor.stepEditor
  const { data } = useSession()
  const [busy, setBusy] = useState(false)
  if (!note && !photo) return null
  return (
    <div className="rounded-2xl bg-amber-100 px-4 py-3 dark:bg-amber-500/15">
      {note && <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{t.operatorFeedback(note)}</p>}
      {photo && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StoredPhoto value={photo} data={data} alt={t.feedbackPhotoAlt} className="h-20 w-28 rounded-xl object-cover" />
          {onUsePhoto && (
            <Button
              size="sm"
              loading={busy}
              icon={<ImagePlus className="h-4 w-4" />}
              onClick={async () => {
                setBusy(true)
                try {
                  await onUsePhoto()
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t.useFeedbackPhoto}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
