import Feather from '@expo/vector-icons/Feather'
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BridgeError, cancelled } from '../bridge/errors'
import { CAPTURE_PRESETS, type CapturedMedia } from '../bridge/protocol'
import { logError } from '../logging/log'
import { discardMedia } from '../media/mediaStore'
import { pickFromLibrary } from '../media/pick'
import { finalizePhoto, linkToNarration } from '../media/pipeline'
import { IconButton, Pill, PrimaryButton } from '../ui/components'
import { formatClock } from '../ui/format'
import { colors, radii, touch, type } from '../ui/theme'
import { useBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { useNarration } from './narration'
import { PermissionPanel } from './PermissionPanel'
import { ShutterButton } from './ShutterButton'
import { previewFrame, useCameraLens } from './framing'
import { usePinchZoom } from './usePinchZoom'
import { ZoomPresets } from './ZoomPresets'
import { useStrings } from '../i18n'

/**
 * Plusieurs photos d'affilée. Chaque photo est réduite (1920 px, JPEG) pendant qu'on prend la
 * suivante ; « Terminé » rend la série dans l'ordre de prise.
 *
 * Si la page le demande (`voice`), on peut parler en même temps : le micro s'ouvre avec la caméra
 * (sauf si la personne l'a fermé la dernière fois), une pastille rouge le dit et le ferme d'un
 * geste ; ce qui est dit revient en une note, chaque photo portant son instant (`narration.ts`).
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
  const win = useWindowDimensions()
  const lens = useCameraLens(facing)
  const { range, magnification, zoom, setMagnification, reset: resetZoom, gesture: pinch } = usePinchZoom(lens.ultraWide)

  const maxCount = capture.payload.maxCount ?? 30
  const count = taken.length
  const full = count >= maxCount
  const voice = capture.payload.voice === true
  // Le micro attend la caméra : la permission, puis l'aperçu prêt.
  const narration = useNarration(voice && !!permission?.granted && ready)

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
    // L'instant du déclic, pas celui où la photo est prête : c'est là qu'on parle de la photo.
    const voiceAt = narration.mark()
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.92, exif: false })
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setTaken((prev) => [...prev, { key }])
      const job = finalizePhoto(picture.uri, picture.width, picture.height)
        .then((photo) => linkToNarration(photo, { voiceAt }))
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
    // Ajoutées pendant qu'on parle : ce qui est dit à ce moment les décrit peut-être.
    const voiceAt = narration.mark()
    try {
      const picked = (await pickFromLibrary(['photo'], true)).slice(0, maxCount - count)
      for (const photo of picked) {
        const media = await linkToNarration(photo, { voiceAt })
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
    // Le commentaire, s'il y en a un, vient en dernier : la page le relie aux photos par leur instant.
    const note = await narration.finish()
    if (items.length === 0) {
      if (note) await discardMedia([note.localId])
      captureController.fail(capture.id, cancelled())
    } else captureController.complete(capture.id, { items: note ? [...items, note] : items })
  }

  /** La pastille du micro : fermer, rouvrir, ou dire comment l'autoriser. */
  function onMic() {
    if (narration.denied && !narration.denied.canAsk) {
      Alert.alert(t.photo.micDeniedTitle, t.photo.micDeniedMessage, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.openSettings, onPress: () => void Linking.openSettings() },
      ])
      return
    }
    void Haptics.selectionAsync()
    void narration.toggle()
  }

  function close() {
    if (count === 0) {
      void narration.discard().finally(() => captureController.fail(capture.id, cancelled()))
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
          await narration.discard()
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
          style={previewFrame(win, insets.top + 64, 4 / 3)}
          mode="picture"
          ratio="4:3"
          facing={facing}
          selectedLens={lens.selectedLens}
          onAvailableLensesChanged={lens.onAvailableLensesChanged}
          enableTorch={torch}
          animateShutter
          zoom={zoom}
          onCameraReady={() => setReady(true)}
          onMountError={(e) => logError(new Error(e.message), { screen: 'camera.photo', action: 'mount' })}
        />

        {voice && ready ? (
          <View style={[styles.micRow, { top: insets.top + 12 + touch.min + 8 + 10 }]} pointerEvents="box-none">
            <MicPill narration={narration} onPress={onMic} />
          </View>
        ) : null}

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
              onPress={() => {
                resetZoom()
                setFacing((f) => (f === 'back' ? 'front' : 'back'))
              }}
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
            <Text style={styles.hint}>{narration.recording ? t.photo.voiceHint : t.photo.hint}</Text>
          )}
          <View style={styles.zoomRow}>
            <ZoomPresets range={range} magnification={magnification} onPick={setMagnification} />
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

/**
 * Le micro, en une pastille sous la barre du haut : rouge quand il écoute (le point bat avec la
 * voix), sombre quand il est fermé. Un toucher l'ouvre ou le ferme.
 */
function MicPill({ narration, onPress }: { narration: ReturnType<typeof useNarration>; onPress: () => void }) {
  const t = useStrings()
  const on = narration.recording
  const label = on
    ? t.photo.listening(formatClock(narration.elapsed))
    : narration.full
      ? t.photo.micFull(formatClock(CAPTURE_PRESETS.audio.maxDurationSec))
      : narration.denied
        ? t.photo.micDenied
        : t.photo.micClosed
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `${label}. ${t.photo.micOff}` : `${label}. ${t.photo.micOn}`}
      accessibilityState={{ selected: on, disabled: narration.full }}
      disabled={narration.full}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.micPill, on ? styles.micPillOn : styles.micPillOff, pressed && { opacity: 0.8 }]}
    >
      {on ? (
        <View style={styles.micDotWrap}>
          <View style={[styles.micDot, { transform: [{ scale: 0.8 + narration.level * 0.7 }] }]} />
        </View>
      ) : (
        <Feather name="mic-off" size={16} color={colors.white} />
      )}
      <Text style={styles.micText}>{label}</Text>
      {on ? <Feather name="pause" size={14} color={colors.white} style={{ opacity: 0.85 }} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  micRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  micPill: {
    minHeight: touch.min,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micPillOn: { backgroundColor: colors.danger },
  micPillOff: { backgroundColor: 'rgba(10,15,24,0.55)', borderWidth: 1, borderColor: colors.glassBorder },
  micDotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  micDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  micText: { color: colors.white, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
