import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import type { AvailableLenses, CameraType } from 'expo-camera'

import { pickMultiLens } from './zoomMath'

/**
 * Le cadre de l'aperçu : exactement celui de la photo (4:3) ou de la vidéo (16:9), comme dans
 * l'appareil photo. Étiré sur tout l'écran (plus allongé), l'aperçu rognait les côtés : il
 * paraissait plus zoomé que la photo prise.
 * `aspect` : le grand côté sur le petit (4/3, 16/9) ; `top` : sous la barre du haut.
 */
export function previewFrame(win: { width: number; height: number }, top: number, aspect: number) {
  if (win.width > win.height) {
    const width = Math.min(win.width, win.height * aspect)
    return { position: 'absolute' as const, top: 0, left: (win.width - width) / 2, width, height: win.height }
  }
  const height = Math.min(win.height, win.width * aspect)
  return { position: 'absolute' as const, left: 0, top: Math.max(0, Math.min(top, win.height - height)), width: win.width, height }
}

/**
 * Sur iPhone, la caméra multi-objectifs de l'arrière (ultra grand-angle compris) : le zoom descend
 * à 0,5× et l'iPhone change d'objectif seul en zoomant, comme dans l'appareil photo. Le devant, un
 * téléphone sans ultra grand-angle ou Android : la caméra par défaut.
 */
export function useCameraLens(facing: CameraType) {
  const [lens, setLens] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (facing !== 'back') setLens(undefined)
  }, [facing])
  const onAvailableLensesChanged = (e: AvailableLenses) => {
    if (Platform.OS !== 'ios' || facing !== 'back') return
    const next = pickMultiLens(e.lenses)
    setLens((cur) => (cur === next ? cur : next))
  }
  return { selectedLens: lens, ultraWide: !!lens, onAvailableLensesChanged }
}
