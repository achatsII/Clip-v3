import { useRef, useState } from 'react'
import type { GestureResponderEvent, GestureResponderHandlers } from 'react-native'

/**
 * Zoom de la caméra par pincement à deux doigts, posé sur un calque au-dessus de l'aperçu.
 * `zoom` va de 0 (pas de zoom) à 1 (zoom maximal de l'appareil), comme `CameraView`. L'échelle de
 * la caméra suit une courbe (iOS : facteur minimal × (maximal / minimal)^zoom) : on avance donc
 * du logarithme de l'écart entre les doigts, ce qui donne un geste régulier sur tout le parcours.
 */
const SENSITIVITY = 0.3

export function clampZoom(z: number): number {
  return Math.min(1, Math.max(0, z))
}

/** Zoom après un pincement passé de `startDistance` à `distance` (en points). */
export function nextZoom(startZoom: number, startDistance: number, distance: number): number {
  if (startDistance <= 0 || distance <= 0) return clampZoom(startZoom)
  return clampZoom(startZoom + Math.log(distance / startDistance) * SENSITIVITY)
}

function spread(e: GestureResponderEvent): number | null {
  const [a, b] = e.nativeEvent.touches
  if (!a || !b) return null
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
}

export function usePinchZoom(): { zoom: number; reset: () => void; handlers: GestureResponderHandlers } {
  const [zoom, setZoom] = useState(0)
  const start = useRef<{ distance: number; zoom: number } | null>(null)
  const current = useRef(0)
  current.current = zoom

  const twoFingers = (e: GestureResponderEvent) => e.nativeEvent.touches.length >= 2
  const end = () => {
    start.current = null
  }

  const handlers: GestureResponderHandlers = {
    onStartShouldSetResponder: twoFingers,
    onMoveShouldSetResponder: twoFingers,
    onResponderGrant: (e) => {
      const d = spread(e)
      start.current = d ? { distance: d, zoom: current.current } : null
    },
    onResponderMove: (e) => {
      const d = spread(e)
      if (!d) return
      if (!start.current) {
        start.current = { distance: d, zoom: current.current }
        return
      }
      setZoom(nextZoom(start.current.zoom, start.current.distance, d))
    },
    onResponderRelease: end,
    onResponderTerminate: end,
    onResponderTerminationRequest: () => true,
  }

  return { zoom, reset: () => setZoom(0), handlers }
}
