import { useRef, useState } from 'react'
import { Platform } from 'react-native'
import { usePinchGesture } from 'react-native-gesture-handler'

import { pinchZoom, type ZoomPlatform } from './zoomMath'

const platform: ZoomPlatform = Platform.OS === 'ios' ? 'ios' : 'android'

/**
 * Pincer n'importe où sur l'écran de la caméra pour zoomer. Le geste est reconnu par le système
 * (comme dans l'appareil photo), pas reconstitué à partir des touchers : il part au premier écart
 * des doigts, même posés l'un après l'autre.
 */
export function usePinchZoom() {
  const [zoom, setZoom] = useState(0)
  const current = useRef(0)
  current.current = zoom
  const start = useRef(0)
  const gesture = usePinchGesture({
    runOnJS: true,
    onActivate: () => {
      start.current = current.current
    },
    onUpdate: (e) => setZoom(pinchZoom(platform, start.current, e.scale)),
  })
  return { zoom, reset: () => setZoom(0), gesture }
}
