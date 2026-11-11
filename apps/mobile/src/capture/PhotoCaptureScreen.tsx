import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BridgeError, cancelled } from '../bridge/errors'
import type { CapturedMedia } from '../bridge/protocol'
import { logError } from '../logging/log'
import { discardMedia } from '../media/mediaStore'
import { pickFromLibrary } from '../media/pick'
import { finalizePhoto } from '../media/pipeline'
import { IconButton, Pill, PrimaryButton } from '../ui/components'
import { colors, radii, touch, type } from '../ui/theme'
import { useBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { PermissionPanel } from './PermissionPanel'
import { ShutterButton } from './ShutterButton'
import { usePinchZoom } from './usePinchZoom'
import { ZoomReset } from './ZoomReset'
import { useStrings } from '../i18n'

/**
 * Plusieurs photos d'affilée. Chaque photo est réduite (1920 px, JPEG) pendant qu'on prend la
 * suivante ; « Terminé » rend la série dans l'ordre de prise.
 */
export function PhotoCaptureScreen({ capture }: { capture: ActiveCapture<'photo'> }) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const pending = useRef<Array<Promise<CapturedMedia | null>>>([])
  const [ready, setReady] = useState(false)
  const [facing, setFacing] = useState<CameraType>('back')
  const [torch, setTorch] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const nextKey = useRef(1)
  const [taken, setTaken] = useState<Array<{ key: number; media?: CapturedMedia }>>([])
  const [picking, setPicking] = useState(false)
  const { zoom, reset: resetZoom, gesture: pinch } = usePinchZoom()

  const maxCount = capture.payload.maxCount ?? 30
  const count = taken.length
  const full = count >= maxCount

  useBackAction(() => {
    if (finishing) return
    if (permission?.granted) close()
    else captureController.fail(capture.id, cancelled())
  })

  if (!permission) return <View style={styles.black} />
  if (!permission.granted) {
    return (
      <PermissionPanel
        icon="camera"
        title={t.photo.permissionTitle}
        message={t.photo.permissionMessage}
        canAskAgain={permission.canAskAgain}
        onRequest={() => void requestPermission()}
        onCancel={() => captureController.fail(capture.id, cancelled())}
      />
    )
  }

  async function shoot() {
    if (!cameraRef.current || !ready || shooting || full || finishing) return
    setShooting(true)
    const key = nextKey.current++
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.92, exif: false })
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setTaken((prev) => [...prev, { key }])
      const job = finalizePhoto(picture.uri, picture.width, picture.height)
        .then((media) => {
          setTaken((prev) => prev.map((t) => (t.key === key ? { key, media } : t)))
          return media
        })
        .catch((e) => {
          logError(e, { screen: 'camera.photo', action: 'finalize' })
          setTaken((prev) => prev.filter((t) => t.key !== key))
          return null
        })
      pending.current.push(job)
    } catch (e) {
      logError(e, { screen: 'camera.photo', action: 'takePicture' })
    } finally {
      setShooting(false)
    }
  }

  /** Des photos déjà sur le téléphone, ajoutées à la série comme si on venait de les prendre. */
  async function pickExisting() {
    if (picking || finishing || full) return
    setPicking(true)
    try {
      const items = (await pickFromLibrary(['photo'], true)).slice(0, maxCount - count)
      for (const media of items) {
        const key = nextKey.current++
        pending.current.push(Promise.resolve(media))
        setTaken((prev) => [...prev, { key, media }])
      }
    } catch (e) {
      if (!(e instanceof BridgeError && e.code === 'cancelled')) {
        logError(e, { screen: 'camera.photo', action: 'pick' })
        Alert.alert(t.photo.addFailed, e instanceof BridgeError ? e.message : t.common.tryAgain)
      }
    } finally {
      setPicking(false)
    }
  }

  async function finish() {
    setFinishing(true)
    const results = await Promise.all(pending.current)
    const items = results.filter((m): m is CapturedMedia => !!m)
    if (items.length === 0) captureController.fail(capture.id, cancelled())
    else captureController.complete(capture.id, { items })
  }

  function close() {
    if (count === 0) {
      captureController.fail(capture.id, cancelled())
      return
    }
    Alert.alert(t.photo.keepTitle(count), undefined, [
      { text: t.common.keep, style: 'default', onPress: () => void finish() },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          const results = await Promise.all(pending.current)
          await discardMedia(results.filter((m): m is CapturedMedia => !!m).map((m) => m.localId))
          captureController.fail(capture.id, cancelled())
        },
      },
    ])
  }

  return (
    <GestureDetector gesture={pinch}>
      <View style={styles.black}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="picture"
          facing={facing}
          enableTorch={torch}
          animateShutter
          zoom={zoom}
          onCameraReady={() => setReady(true)}
          onMountError={(e) => logError(new Error(e.message), { screen: 'camera.photo', action: 'mount' })}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <IconButton icon="x" label={t.common.close} onPress={close} size={touch.min + 8} />
          <Pill>{full ? t.photo.full(count) : t.photo.count(count)}</Pill>
          <View style={styles.row}>
            <IconButton
              icon="zap"
              label={torch ? t.common.torchOff : t.common.torchOn}
              active={torch}
              onPress={() => setTorch((t) => !t)}
              size={touch.min + 8}
            />
            <IconButton
              icon="refresh-ccw"
              label={t.common.switchCamera}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              size={touch.min + 8}
            />
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {picking ? (
            <View style={styles.preparing}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.hint}>{t.photo.preparing}</Text>
            </View>
          ) : null}
          {count > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {taken.map((t) =>
                t.media?.thumbnailDataUrl ? (
                  <Image key={t.key} source={{ uri: t.media.thumbnailDataUrl }} style={styles.thumb} />
                ) : (
                  <View key={t.key} style={[styles.thumb, styles.thumbPending]} />
                ),
              )}
            </ScrollView>
          ) : (
            <Text style={styles.hint}>{t.photo.hint}</Text>
          )}
          <View style={styles.zoomRow}>
            <ZoomReset zoom={zoom} onReset={resetZoom} />
          </View>
          <View style={styles.controls}>
            <View style={[styles.side, styles.sideLeft]}>
              {!full ? (
                <IconButton icon="image" label={t.photo.pick} onPress={() => void pickExisting()} disabled={picking || finishing} size={touch.large} />
              ) : null}
            </View>
            <ShutterButton onPress={shoot} disabled={!ready || full || finishing} label={t.photo.shoot} />
            <View style={styles.side}>
              {count > 0 ? (
                <PrimaryButton label={t.photo.done(count)} onPress={() => void finish()} loading={finishing} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', gap: 10 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14 },
  strip: { paddingHorizontal: 16, gap: 8 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: colors.slate850,
  },
  thumbPending: { opacity: 0.5 },
  hint: { ...type.body, color: colors.white, textAlign: 'center', paddingHorizontal: 24, textShadowColor: '#000', textShadowRadius: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  side: { flex: 1, alignItems: 'flex-end' },
  sideLeft: { alignItems: 'flex-start' },
  zoomRow: { alignItems: 'center' },
  preparing: { alignItems: 'center', gap: 8 },
})
