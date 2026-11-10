'use client'

import { Camera, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createDetector } from '@/lib/media/scan'
import { Modal } from './ui/Modal'

/** Lecteur de code dans le navigateur (la coquille native a le sien). */
export function ScanSheet({ open, onClose, onResult, title = 'Scanner un code' }: { open: boolean; onClose: () => void; onResult: (value: string) => void; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let stream: MediaStream | null = null
    let stopped = false
    let raf = 0
    const detect = createDetector()
    setError(null)
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
        if (stopped) return
        const v = videoRef.current!
        v.srcObject = stream
        await v.play().catch(() => undefined)
        const loop = async () => {
          if (stopped) return
          const value = await detect(v, canvasRef.current!).catch(() => null)
          if (value) {
            onResult(value)
            return
          }
          raf = window.setTimeout(loop, 220) as unknown as number
        }
        loop()
      } catch {
        setError('La caméra n’est pas accessible. Autorisez-la dans votre navigateur, ou tapez le code dans la recherche.')
      }
    })()
    return () => {
      stopped = true
      clearTimeout(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open, onResult])

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Camera className="h-10 w-10 text-slate-400" />
          <p className="font-medium text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[28px] bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-56 w-56 rounded-[32px] border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <ScanLine className="animate-pulse-glow absolute inset-x-0 top-1/2 mx-auto h-10 w-10 -translate-y-1/2 text-white" />
            </div>
          </div>
          <p className="absolute inset-x-0 bottom-3 text-center text-sm font-black text-white">Visez le code QR ou le code-barres</p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  )
}
