'use client'

import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/util/cn'

export function QrCode({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string>('')
  useEffect(() => {
    let alive = true
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [value])
  return <div className={cn('overflow-hidden rounded-2xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full', className)} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="Code QR" role="img" />
}
