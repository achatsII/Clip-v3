import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useEffect, useRef, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
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
import { usePinchZoom } from './usePinchZoom'
import { ZoomReset } from './ZoomReset'

const KEEP_AWAKE_TAG = 'clip-video'

/**
 * Une vidéo à poids contrôlé : 720p et ~2,5 Mb/s (≈ 19 Mo la minute), quelle que soit la
 * caméra du téléphone. Sur iOS, le débit ne s'applique que si le codec est imposé (avc1).
 */
export function VideoCaptureScreen({ capture }: { capture: ActiveCapture<'video'> }) {
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
  const { zoom, reset: resetZoom, handlers: pinch } = usePinchZoom()

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
        title="La caméra est nécessaire"
        message="CLIP filme la tâche pendant qu'on l'explique. Autorisez la caméra pour continuer."
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
        title="Le micro rend la vidéo utile"
        message="L'IA écoute les explications pour rédiger les étapes. Autorisez le micro, ou filmez sans le son."
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
      if (!result?.uri) throw new Error('Aucune vidéo rendue par la caméra')
      setPhase('finishing')
      const durationSec = (Date.now() - startedAt.current) / 1000
      const media = await finalizeVideo(result.uri, Math.min(durationSec, maxDuration))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      captureController.complete(capture.id, { items: [media] })
    } catch (e) {
      logError(e, { screen: 'camera.video', action: 'record' })
      setPhase('idle')
      Alert.alert('La vidéo n’a pas pu être enregistrée', 'Réessayez. Si le problème revient, redémarrez l’app.')
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
    try {
      const items = await pickFromLibrary(['video'], false)
      if (items.length) captureController.complete(capture.id, { items })
      else setPhase('idle')
    } catch (e) {
      setPhase('idle')
      if (e instanceof BridgeError && e.code === 'cancelled') return
      logError(e, { screen: 'camera.video', action: 'pick' })
      Alert.alert('La vidéo n’a pas pu être ajoutée', e instanceof BridgeError ? e.message : 'Réessayez avec une autre vidéo.')
    }
  }

  const portrait = height > width
  const nearEnd = phase === 'recording' && remaining <= 30

  return (
    <View style={styles.black}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        mode="video"
        facing={facing}
        enableTorch={torch}
        mute={withoutSound}
        videoQuality={CAPTURE_PRESETS.video.quality}
        videoBitrate={CAPTURE_PRESETS.video.bitrate}
        zoom={zoom}
        onCameraReady={() => setReady(true)}
        onRecordingProgress={(p) => setSizeBytes(p.fileSize)}
        onMountError={(e) => logError(new Error(e.message), { screen: 'camera.video', action: 'mount' })}
      />
      {/* Calque du pincement : sous les boutons, au-dessus de l'aperçu. */}
      <View style={StyleSheet.absoluteFill} {...pinch} />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {phase === 'idle' ? (
          <IconButton
            icon="x"
            label="Fermer"
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
              {nearEnd ? `${formatClock(remaining)} restantes` : formatClock(elapsed)}
              {sizeBytes > 0 ? `  ·  ${(sizeBytes / 1_000_000).toFixed(0)} Mo` : ''}
            </Text>
          </Pill>
        ) : (
          <Pill>{`720p · max ${formatClock(maxDuration)}`}</Pill>
        )}
        <View style={styles.row}>
          <IconButton
            icon="zap"
            label={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
            active={torch}
            onPress={() => setTorch((t) => !t)}
            size={touch.min + 8}
          />
          {phase === 'idle' ? (
            <IconButton
              icon="refresh-ccw"
              label="Changer de caméra"
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              size={touch.min + 8}
            />
          ) : null}
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {phase === 'idle' ? (
          <Text style={styles.hint}>
            {portrait
              ? 'Astuce : tenez le téléphone à l’horizontale et filmez la personne qui explique. Pincez pour zoomer.'
              : 'Filmez la personne qui explique, au plus près des gestes. Pincez pour zoomer.'}
          </Text>
        ) : null}
        {phase === 'finishing' ? <Text style={styles.hint}>Préparation de la vidéo…</Text> : null}
        <ZoomReset zoom={zoom} onReset={resetZoom} />
        <View style={styles.controls}>
          <View style={[styles.side, styles.sideLeft]}>
            {phase === 'idle' ? (
              <IconButton icon="image" label="Choisir une vidéo du téléphone" onPress={() => void pickExisting()} size={touch.large} />
            ) : null}
          </View>
          <ShutterButton
            variant={phase === 'recording' ? 'stop' : 'record'}
            label={phase === 'recording' ? 'Arrêter l’enregistrement' : 'Commencer à filmer'}
            onPress={phase === 'recording' ? stop : () => void start()}
            disabled={!ready || phase === 'finishing'}
          />
          <View style={styles.side} />
        </View>
      </View>
    </View>
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
  hint: {
    ...type.body,
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
})
