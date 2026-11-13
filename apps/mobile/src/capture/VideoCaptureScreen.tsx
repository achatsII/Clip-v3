import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BridgeError, cancelled } from '../bridge/errors'
import { CAPTURE_PRESETS } from '../bridge/protocol'
import { logError } from '../logging/log'
import { pickFromLibrary } from '../media/pick'
import { finalizeVideo } from '../media/pipeline'
import { IconButton, Pill } from '../ui/components'
import { formatClock } from '../ui/format'
import { colors, touch, type } from '../ui/theme'
import { useBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { PermissionPanel } from './PermissionPanel'
import { ShutterButton } from './ShutterButton'
import { previewFrame, useCameraLens } from './framing'
import { usePinchZoom } from './usePinchZoom'
import { ZoomPresets } from './ZoomPresets'
import { useStrings } from '../i18n'

const KEEP_AWAKE_TAG = 'clip-video'

/**
 * Une vidéo à poids contrôlé : 720p et ~2,5 Mb/s (≈ 19 Mo la minute), quelle que soit la
 * caméra du téléphone. Sur iOS, le débit ne s'applique que si le codec est imposé (avc1).
 */
export function VideoCaptureScreen({ capture }: { capture: ActiveCapture<'video'> }) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const [cameraPermission, requestCamera] = useCameraPermissions()
  const [micPermission, requestMic] = useMicrophonePermissions()
  const cameraRef = useRef<CameraView>(null)
  const startedAt = useRef(0)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'finishing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [sizeBytes, setSizeBytes] = useState(0)
  const [facing, setFacing] = useState<CameraType>('back')
  const [torch, setTorch] = useState(false)
  const [withoutSound, setWithoutSound] = useState(false)
  const lens = useCameraLens(facing)
  const { range, magnification, zoom, setMagnification, reset: resetZoom, gesture: pinch } = usePinchZoom(lens.ultraWide)
  const [fromLibrary, setFromLibrary] = useState(false)

  const maxDuration = capture.payload.maxDurationSec ?? CAPTURE_PRESETS.video.maxDurationSec
  const remaining = maxDuration - elapsed

  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => () => void deactivateKeepAwake(KEEP_AWAKE_TAG), [])

  useBackAction(() => {
    if (phase === 'recording') stop()
    else if (phase === 'idle') captureController.fail(capture.id, cancelled())
  })

  if (!cameraPermission || !micPermission) return <View style={styles.black} />
  if (!cameraPermission.granted) {
    return (
      <PermissionPanel
        icon="video"
        title={t.video.permissionTitle}
        message={t.video.permissionMessage}
        canAskAgain={cameraPermission.canAskAgain}
        onRequest={() => void requestCamera()}
        onCancel={() => captureController.fail(capture.id, cancelled())}
      />
    )
  }
  if (!micPermission.granted && !withoutSound) {
    return (
      <PermissionPanel
        icon="mic"
        title={t.video.micTitle}
        message={t.video.micMessage}
        canAskAgain={micPermission.canAskAgain}
        onRequest={() => void requestMic()}
        onCancel={() => captureController.fail(capture.id, cancelled())}
        alternative={{ label: 'Filmer sans le son', icon: 'mic-off', onPress: () => setWithoutSound(true) }}
      />
    )
  }

  async function start() {
    if (!cameraRef.current || !ready || phase !== 'idle') return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    startedAt.current = Date.now()
    setElapsed(0)
    setSizeBytes(0)
    setPhase('recording')
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined)
    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration,
        ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}),
      })
      if (!result?.uri) throw new Error(t.video.noVideo)
      setPhase('finishing')
      const durationSec = (Date.now() - startedAt.current) / 1000
      const media = await finalizeVideo(result.uri, Math.min(durationSec, maxDuration))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      captureController.complete(capture.id, { items: [media] })
    } catch (e) {
      logError(e, { screen: 'camera.video', action: 'record' })
      setPhase('idle')
      Alert.alert(t.video.recordFailedTitle, t.video.recordFailedMessage)
    } finally {
      void deactivateKeepAwake(KEEP_AWAKE_TAG)
    }
  }

  function stop() {
    if (phase !== 'recording') return
    cameraRef.current?.stopRecording()
  }

  /** Une vidéo déjà sur le téléphone, ramenée en 720p comme une vidéo filmée ici. */
  async function pickExisting() {
    if (phase !== 'idle') return
    setPhase('finishing')
    setFromLibrary(true)
    try {
      const items = await pickFromLibrary(['video'], false)
      if (items.length) captureController.complete(capture.id, { items })
      else setPhase('idle')
    } catch (e) {
      setPhase('idle')
      setFromLibrary(false)
      if (e instanceof BridgeError && e.code === 'cancelled') return
      logError(e, { screen: 'camera.video', action: 'pick' })
      Alert.alert(t.video.addFailed, e instanceof BridgeError ? e.message : t.video.addFailedMessage)
    }
  }

  const portrait = height > width
  const nearEnd = phase === 'recording' && remaining <= 30

  return (
    <GestureDetector gesture={pinch}>
      <View style={styles.black}>
        <CameraView
          ref={cameraRef}
          style={previewFrame({ width, height }, insets.top, 16 / 9)}
          mode="video"
          ratio="16:9"
          facing={facing}
          selectedLens={lens.selectedLens}
          onAvailableLensesChanged={lens.onAvailableLensesChanged}
          enableTorch={torch}
          mute={withoutSound}
          videoQuality={CAPTURE_PRESETS.video.quality}
          videoBitrate={CAPTURE_PRESETS.video.bitrate}
          zoom={zoom}
          onCameraReady={() => setReady(true)}
          onRecordingProgress={(p) => setSizeBytes(p.fileSize)}
          onMountError={(e) => logError(new Error(e.message), { screen: 'camera.video', action: 'mount' })}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          {phase === 'idle' ? (
            <IconButton
              icon="x"
              label={t.common.close}
              onPress={() => captureController.fail(capture.id, cancelled())}
              size={touch.min + 8}
            />
          ) : (
            <View style={{ width: touch.min + 8 }} />
          )}
          {phase === 'recording' ? (
            <Pill tone={nearEnd ? 'danger' : 'glass'}>
              <View style={styles.recDot} />
              <Text style={styles.timer}>
                {nearEnd ? t.video.remaining(formatClock(remaining)) : formatClock(elapsed)}
                {sizeBytes > 0 ? `  ·  ${t.video.megabytes(sizeBytes / 1_000_000)}` : ''}
              </Text>
            </Pill>
          ) : (
            <Pill>{t.video.preset(formatClock(maxDuration))}</Pill>
          )}
          <View style={styles.row}>
            <IconButton
              icon="zap"
              label={torch ? t.common.torchOff : t.common.torchOn}
              active={torch}
              onPress={() => setTorch((t) => !t)}
              size={touch.min + 8}
            />
            {phase === 'idle' ? (
              <IconButton
                icon="refresh-ccw"
                label={t.common.switchCamera}
                onPress={() => {
                  resetZoom()
                  setFacing((f) => (f === 'back' ? 'front' : 'back'))
                }}
                size={touch.min + 8}
              />
            ) : null}
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
          {phase === 'idle' ? (
            <Text style={styles.hint}>
              {portrait
                ? t.video.hintPortrait
                : t.video.hintLandscape}
            </Text>
          ) : null}
          {phase === 'finishing' ? (
            <View style={styles.preparing}>
              <ActivityIndicator color={colors.white} size="large" />
              <Text style={styles.hint}>
                {fromLibrary
                  ? t.video.preparingLibrary
                  : t.video.preparing}
              </Text>
            </View>
          ) : null}
          <ZoomPresets range={range} magnification={magnification} onPick={setMagnification} />
          <View style={styles.controls}>
            <View style={[styles.side, styles.sideLeft]}>
              {phase === 'idle' ? (
                <IconButton icon="image" label={t.video.pick} onPress={() => void pickExisting()} size={touch.large} />
              ) : null}
            </View>
            <ShutterButton
              variant={phase === 'recording' ? 'stop' : 'record'}
              label={phase === 'recording' ? t.video.stop : t.video.start}
              onPress={phase === 'recording' ? stop : () => void start()}
              disabled={!ready || phase === 'finishing'}
            />
            <View style={styles.side} />
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
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  timer: { color: colors.white, ...type.timer, fontSize: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 24 },
  side: { flex: 1, alignItems: 'flex-end' },
  sideLeft: { alignItems: 'flex-start' },
  preparing: { alignItems: 'center', gap: 10 },
  hint: {
    ...type.body,
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
})
