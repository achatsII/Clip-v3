import { useRef, useState } from 'react'
import { Platform } from 'react-native'
import { usePinchGesture } from 'react-native-gesture-handler'

import { cameraZoom, pinchMagnification, type ZoomPlatform, type ZoomRange } from './zoomMath'

const platform: ZoomPlatform = Platform.OS === 'ios' ? 'ios' : 'android'

/**
 * Pincer n'importe où sur l'écran de la caméra pour zoomer. Le geste est reconnu par le système
 * (comme dans l'appareil photo), pas reconstitué à partir des touchers : il part au premier écart
 * des doigts, même posés l'un après l'autre. Le grossissement part de 1× ; avec la caméra
 * multi-objectifs (`ultraWide`), il descend jusqu'à 0,5×.
 */
export function usePinchZoom(ultraWide: boolean) {
  const range: ZoomRange = { platform, ultraWide }
  const [magnification, setMagnification] = useState(1)
  const current = useRef(1)
  current.current = magnification
  const start = useRef(1)
  const rangeRef = useRef(range)
  rangeRef.current = range
  const gesture = usePinchGesture({
    runOnJS: true,
    onActivate: () => {
      start.current = current.current
    },
    onUpdate: (e) => setMagnification(pinchMagnification(rangeRef.current, start.current, e.scale)),
  })
  return {
    range,
    magnification,
    zoom: cameraZoom(range, magnification),
    setMagnification,
    reset: () => setMagnification(1),
    gesture,
  }
}
