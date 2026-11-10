import Feather from '@expo/vector-icons/Feather'
import {
  AudioQuality,
  IOSOutputFormat,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cancelled } from '../bridge/errors'
import { CAPTURE_PRESETS } from '../bridge/protocol'
import { logError } from '../logging/log'
import { finalizeAudio } from '../media/pipeline'
import { GlassButton, IconButton, PrimaryButton } from '../ui/components'
import { formatClock } from '../ui/format'
import { colors, touch, type } from '../ui/theme'
import { useBackAction } from './backAction'
import { captureController, type ActiveCapture } from './controller'
import { PermissionPanel } from './PermissionPanel'

/** AAC mono 64 kb/s dans un .m4a : ~0,5 Mo la minute, assez pour la transcription. */
export const AUDIO_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: CAPTURE_PRESETS.audio.sampleRate,
  numberOfChannels: CAPTURE_PRESETS.audio.channels,
  bitRate: CAPTURE_PRESETS.audio.bitrate,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: 'audio/webm', bitsPerSecond: CAPTURE_PRESETS.audio.bitrate },
}

const BARS = 28

type Permission = { granted: boolean; canAskAgain: boolean } | null

export function AudioCaptureScreen({ capture }: { capture: ActiveCapture<'audio'> }) {
  const insets = useSafeAreaInsets()
  const recorder = useAudioRecorder(AUDIO_OPTIONS)
  const state = useAudioRecorderState(recorder, 120)
  const [permission, setPermission] = useState<Permission>(null)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'finishing'>('idle')
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.05))
  const stopping = useRef(false)

  const maxDuration = capture.payload.maxDurationSec ?? CAPTURE_PRESETS.audio.maxDurationSec
  const elapsed = state.durationMillis / 1000

  useEffect(() => {
    getRecordingPermissionsAsync()
      .then((p) => setPermission({ granted: p.granted, canAskAgain: p.canAskAgain }))
      .catch(() => setPermission({ granted: false, canAskAgain: true }))
  }, [])

  // Niveau du micro : dB (−60 à 0) ramenés de 0 à 1, en bande défilante.
  useEffect(() => {
    if (phase !== 'recording' || state.metering == null) return
    const level = Math.min(1, Math.max(0.05, (state.metering + 60) / 60))
    setLevels((prev) => [...prev.slice(1), level])
  }, [state.metering, phase])

  useEffect(() => {
    if (phase === 'recording' && elapsed >= maxDuration) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase, maxDuration])

  useEffect(
    () => () => {
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined)
    },
    [],
  )

  useBackAction(() => {
    if (phase === 'recording') confirmDiscard()
    else if (phase === 'idle') captureController.fail(capture.id, cancelled())
  })

  async function ask() {
    const p = await requestRecordingPermissionsAsync()
    setPermission({ granted: p.granted, canAskAgain: p.canAskAgain })
  }

  async function start() {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setPhase('recording')
    } catch (e) {
      logError(e, { screen: 'audio.record', action: 'start' })
      Alert.alert('Le micro n’a pas démarré', 'Fermez les autres apps qui utilisent le micro, puis réessayez.')
    }
  }

  async function finish() {
    if (stopping.current) return
    stopping.current = true
    setPhase('finishing')
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined)
      const uri = recorder.uri
      if (!uri) throw new Error('Aucun enregistrement rendu par le micro')
      const media = await finalizeAudio(uri, Math.min(elapsed, maxDuration))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      captureController.complete(capture.id, { items: [media] })
    } catch (e) {
      logError(e, { screen: 'audio.record', action: 'stop' })
      stopping.current = false
      setPhase('idle')
      Alert.alert('La note vocale n’a pas pu être gardée', 'Réessayez l’enregistrement.')
    }
  }

  function confirmDiscard() {
    Alert.alert('Supprimer cette note vocale ?', undefined, [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await recorder.stop().catch(() => undefined)
          captureController.fail(capture.id, cancelled())
        },
      },
    ])
  }

  if (!permission) return <View style={styles.page} />
  if (!permission.granted) {
    return (
      <PermissionPanel
        icon="mic"
        title="Le micro est nécessaire"
        message="CLIP enregistre vos explications pour que l'IA les transforme en étapes."
        canAskAgain={permission.canAskAgain}
        onRequest={() => void ask()}
        onCancel={() => captureController.fail(capture.id, cancelled())}
      />
    )
  }

  const recording = phase === 'recording'

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <IconButton
          icon="x"
          label={recording ? 'Supprimer la note' : 'Fermer'}
          onPress={recording ? confirmDiscard : () => captureController.fail(capture.id, cancelled())}
          size={touch.min + 8}
          disabled={phase === 'finishing'}
        />
      </View>

      <View style={styles.center}>
        <Text style={styles.label}>{recording ? 'Enregistrement' : 'Note vocale'}</Text>
        <Text style={styles.clock}>{formatClock(elapsed)}</Text>
        <Text style={styles.sub}>
          {recording ? `Parlez normalement · max ${formatClock(maxDuration)}` : 'Expliquez la tâche comme à un collègue.'}
        </Text>
        <View style={styles.wave} accessibilityElementsHidden>
          {levels.map((l, i) => (
            <View key={i} style={[styles.bar, { height: 8 + l * 64, opacity: recording ? 1 : 0.35 }]} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {recording || phase === 'finishing' ? (
          <PrimaryButton
            label="Terminer la note"
            icon="check"
            onPress={() => void finish()}
            loading={phase === 'finishing'}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Commencer l’enregistrement"
            onPress={() => void start()}
            style={({ pressed }) => [styles.micButton, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Feather name="mic" size={44} color={colors.white} />
          </Pressable>
        )}
        {recording ? <GlassButton label="Supprimer" icon="trash-2" onPress={confirmDiscard} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageDark, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { ...type.label, color: 'rgba(255,255,255,0.65)' },
  clock: { color: colors.white, fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  sub: { ...type.body, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 80, marginTop: 24 },
  bar: { width: 6, borderRadius: 3, backgroundColor: colors.primary },
  actions: { gap: 12, alignItems: 'stretch', width: '100%', maxWidth: 420, alignSelf: 'center' },
  micButton: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: colors.danger,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
})
