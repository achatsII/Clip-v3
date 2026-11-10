import { useEffect, useState } from 'react'
import { Modal } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AudioCaptureScreen } from './AudioCaptureScreen'
import { runBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { PhotoCaptureScreen } from './PhotoCaptureScreen'
import { ScanScreen } from './ScanScreen'
import { VideoCaptureScreen } from './VideoCaptureScreen'

/** Affiche l'écran de capture demandé par le pont, en plein écran par-dessus la WebView. */
export function CaptureHost() {
  const [capture, setCapture] = useState<ActiveCapture | null>(captureController.current)

  useEffect(() => captureController.subscribe(setCapture), [])

  return (
    <Modal
      visible={!!capture}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right', 'portrait-upside-down']}
      onRequestClose={runBackAction}
    >
      {/* La Modal ouvre une nouvelle fenêtre native : ses marges sûres se mesurent à part. */}
      <SafeAreaProvider>
        {capture?.kind === 'photo' ? <PhotoCaptureScreen key={capture.id} capture={capture as ActiveCapture<'photo'>} /> : null}
        {capture?.kind === 'video' ? <VideoCaptureScreen key={capture.id} capture={capture as ActiveCapture<'video'>} /> : null}
        {capture?.kind === 'audio' ? <AudioCaptureScreen key={capture.id} capture={capture as ActiveCapture<'audio'>} /> : null}
        {capture?.kind === 'scan' ? <ScanScreen key={capture.id} capture={capture as ActiveCapture<'scan'>} /> : null}
      </SafeAreaProvider>
    </Modal>
  )
}
