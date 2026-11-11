import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cancelled } from '../bridge/errors'
import type { ScanFormat } from '../bridge/protocol'
import { IconButton } from '../ui/components'
import { colors, radii, touch, type } from '../ui/theme'
import { useBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { PermissionPanel } from './PermissionPanel'
import { useStrings } from '../i18n'

const ALL_FORMATS: ScanFormat[] = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'datamatrix']
const FRAME = 260

/** Viseur plein écran : le premier code lu est rendu à la page, avec une vibration. */
export function ScanScreen({ capture }: { capture: ActiveCapture<'scan'> }) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [torch, setTorch] = useState(false)
  const done = useRef(false)

  const formats: BarcodeType[] = capture.payload.formats?.length ? capture.payload.formats : ALL_FORMATS

  useBackAction(() => captureController.fail(capture.id, cancelled()))

  if (!permission) return <View style={styles.black} />
  if (!permission.granted) {
    return (
      <PermissionPanel
        icon="maximize"
        title={t.scan.permissionTitle}
        message={t.scan.permissionMessage}
        canAskAgain={permission.canAskAgain}
        onRequest={() => void requestPermission()}
        onCancel={() => captureController.fail(capture.id, cancelled())}
      />
    )
  }

  function onScanned(result: BarcodeScanningResult) {
    if (done.current || !result.data) return
    done.current = true
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    captureController.complete(capture.id, { value: result.data, format: result.type })
  }

  return (
    <View style={styles.black}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: formats }}
        onBarcodeScanned={onScanned}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.shade} />
        <View style={styles.middle}>
          <View style={styles.shade} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.shade} />
        </View>
        <View style={[styles.shade, styles.below]}>
          <Text style={styles.prompt}>
            {capture.payload.prompt || t.scan.aim}
          </Text>
        </View>
      </View>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <IconButton
          icon="x"
          label={t.common.close}
          onPress={() => captureController.fail(capture.id, cancelled())}
          size={touch.min + 8}
        />
        <IconButton
          icon="zap"
          label={torch ? t.common.torchOff : t.common.torchOn}
          active={torch}
          onPress={() => setTorch((t) => !t)}
          size={touch.min + 8}
        />
      </View>
    </View>
  )
}

const CORNER = 36
const BORDER = 5

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  shade: { flex: 1, backgroundColor: 'rgba(10,15,24,0.55)' },
  middle: { flexDirection: 'row', height: FRAME },
  frame: { width: FRAME, height: FRAME },
  below: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 32 },
  prompt: { ...type.body, color: colors.white, textAlign: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.white },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: radii.md },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: radii.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: radii.md },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: radii.md },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
