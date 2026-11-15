import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import { File } from 'expo-file-system'
import { useEffect, useMemo, useState } from 'react'

import { CAPTURE_PRESETS, type CapturedMedia } from '../bridge/protocol'
import { logError } from '../logging/log'
import { finalizeAudio, linkToNarration } from '../media/pipeline'
import { AUDIO_OPTIONS } from './AudioCaptureScreen'
import { narrationController } from './narrationController'

/**
 * Parler pendant les photos : un seul enregistrement, du premier au dernier déclic, jamais coupé.
 * Chaque photo en garde l'instant (`mark`), et l'IA apparie ensuite chaque photo avec ce qui a été
 * dit autour. Couper le son à chaque photo perdrait les mots dits au moment du déclic (c'est là
 * qu'on parle le plus de la photo) et séparerait les phrases en deux.
 *
 * Le micro s'ouvre avec la caméra, sauf si la personne l'a fermé la dernière fois sur cet appareil :
 * le dernier geste fait foi (`clip.shell.photoVoice`). Fermé en cours de route, il se met en pause ;
 * les photos prises micro fermé n'ont pas d'instant. La logique est dans `narrationController.ts`.
 */
const PREF_KEY = 'clip.shell.photoVoice'

export async function micWanted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) !== 'off'
  } catch {
    return true
  }
}

function removeFile(uri: string) {
  try {
    const f = new File(uri)
    if (f.exists) f.delete()
  } catch {
    // Le cache se vide de lui-même.
  }
}

export interface Narration {
  /** Le micro enregistre en ce moment. */
  recording: boolean
  /** Secondes enregistrées, pauses non comprises. */
  elapsed: number
  /** Niveau du micro, de 0 à 1 (pour montrer qu'il entend). */
  level: number
  /** La personne a refusé le micro ; `canAsk` dit si on peut le redemander. */
  denied: { canAsk: boolean } | null
  /** Le maximum d'une note vocale est atteint : le micro s'est fermé. */
  full: boolean
  /** L'instant présent dans l'enregistrement, ou `undefined` si le micro est fermé. */
  mark: () => number | undefined
  /** Ouvre ou ferme le micro, et retient ce geste sur l'appareil. */
  toggle: () => Promise<void>
  /** Arrête l'enregistrement et rend la note (null s'il n'y a rien d'utile). */
  finish: () => Promise<CapturedMedia | null>
  /** Arrête l'enregistrement et le jette. */
  discard: () => Promise<void>
}

/** `active` : la page l'a demandé et la caméra est prête (le micro ne s'ouvre pas avant). */
export function useNarration(active: boolean): Narration {
  const recorder = useAudioRecorder(AUDIO_OPTIONS)
  const state = useAudioRecorderState(recorder, 400)
  const [denied, setDenied] = useState<{ canAsk: boolean } | null>(null)
  const [full, setFull] = useState(false)
  const ctl = useMemo(
    () =>
      narrationController(recorder, {
        getPermission: getRecordingPermissionsAsync,
        requestPermission: requestRecordingPermissionsAsync,
        audioMode: (on) => setAudioModeAsync(on ? { allowsRecording: true, playsInSilentMode: true } : { allowsRecording: false }),
        finalize: async (uri, seconds) => linkToNarration(await finalizeAudio(uri, seconds), { narration: true }),
        removeFile,
        remember: (on) => void AsyncStorage.setItem(PREF_KEY, on ? 'on' : 'off').catch(() => undefined),
        onDenied: setDenied,
        onFull: () => setFull(true),
        log: (e, action) => logError(e, { screen: 'camera.photo', action }),
        maxSeconds: CAPTURE_PRESETS.audio.maxDurationSec,
      }),
    [recorder],
  )

  // À l'ouverture de la caméra : le micro suit le dernier geste de la personne sur cet appareil.
  useEffect(() => {
    if (!active) return
    let alive = true
    void micWanted().then((wanted) => (alive ? ctl.start(wanted) : undefined))
    return () => {
      alive = false
    }
  }, [active, ctl])

  // Au plus la durée d'une note vocale ; et l'écran qui se ferme ne laisse pas le micro ouvert.
  useEffect(() => ctl.tick(state), [ctl, state])
  useEffect(() => () => ctl.close(), [ctl])

  const level = state.isRecording && state.metering != null ? Math.min(1, Math.max(0, (state.metering + 50) / 50)) : 0
  return { recording: state.isRecording, elapsed: state.durationMillis / 1000, level, denied, full, mark: ctl.mark, toggle: ctl.toggle, finish: ctl.finish, discard: ctl.discard }
}
