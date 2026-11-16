'use client'

import { useEffect } from 'react'
import { callNative, hasCapability } from '@/lib/bridge/native'

/**
 * La marque d'un écran de chargement de démarrage, le logo seul : le site qui part vers l'app,
 * l'ouverture de la session, un lien public qui charge.
 */
export const BOOT_LOADER = 'data-boot-loader'

const booting = () => !!document.querySelector(`[${BOOT_LOADER}]`)

/** Après deux images : le premier vrai écran est peint quand le logo de la coquille s'efface. */
function afterPaint(fn: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(fn)
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }
  const timer = setTimeout(fn, 32)
  return () => clearTimeout(timer)
}

/**
 * Dans l'app mobile, un seul logo au démarrage : la coquille garde son écran de démarrage tant
 * qu'un écran de chargement de démarrage est dans la page, et la page lui dit de l'effacer
 * (`splash.hide`) dès son premier vrai écran. Hors de la coquille, ou sans la capacité : rien.
 */
export function ShellSplash() {
  useEffect(() => {
    if (!hasCapability('splash.hide')) return
    let done = false
    let cancel: (() => void) | null = null
    const observer = new MutationObserver(() => check())
    const release = () => {
      if (done || booting()) return
      done = true
      observer.disconnect()
      void callNative('splash.hide', {}).catch(() => undefined)
    }
    const check = () => {
      if (done || cancel) return
      cancel = afterPaint(() => {
        cancel = null
        release()
      })
    }
    observer.observe(document.documentElement, { childList: true, subtree: true })
    check()
    return () => {
      done = true
      observer.disconnect()
      cancel?.()
    }
  }, [])
  return null
}
