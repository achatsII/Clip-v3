'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasSession } from '@/lib/gateway/client'
import { LogoMark } from '@/components/Logo'

export default function Root() {
  const router = useRouter()
  useEffect(() => {
    router.replace(hasSession() ? '/accueil' : '/connexion')
  }, [router])
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="animate-float h-16 w-16" />
    </div>
  )
}
