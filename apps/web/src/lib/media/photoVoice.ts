'use client'

/**
 * Parler pendant les photos, dans le navigateur (toggle `photoVoice`) : le même geste que dans l'app
 * mobile. Un seul enregistrement du micro pour toute la série, jamais coupé : couper à chaque photo
 * perdrait les mots dits au moment du déclic et séparerait les phrases. Chaque photo garde son
 * instant dans l'enregistrement (`mark`), pauses non comprises ; l'IA apparie ensuite chaque photo
 * avec ce qui est dit autour.
 *
 * Le micro s'ouvre avec la caméra, sauf si la personne l'a fermé la dernière fois sur cet appareil :
 * le dernier geste sur la pastille fait foi (`clip_pref_photo_voice`).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CAPTURE_PRESETS } from '@clip/bridge'
import { readPref, writePref } from '../prefs'
import { extFor, openMic, pausableClock, startRecording, stopStream, type Recording } from './recorder'

export const PHOTO_VOICE_PREF = 'clip_pref_photo_voice'
/** En dessous, rien d'utile n'a été dit : pas de note. */
const MIN_SECONDS = 1

/**
 * `idle` : pas encore ouvert ; `off` : fermé par la personne ; `denied` : le navigateur a refusé le micro
 * (retenu comme fermé) ; `full` : la durée d'une note est atteinte.
 */
export type MicState = 'idle' | 'on' | 'off' | 'denied' | 'full'

export interface PhotoVoice {
  state: MicState
  /** Secondes enregistrées, pauses non comprises. */
  seconds: number
  /** L'instant présent dans l'enregistrement, ou `undefined` micro fermé. */
  mark: () => number | undefined
  /** Ouvre ou ferme le micro, et retient ce geste sur l'appareil. */
  toggle: () => void
  /** Arrête et rend la note (null s'il n'y a rien d'utile). */
  finish: () => Promise<File | null>
}

/** `active` : la caméra est ouverte en mode photo et la fonction est allumée. */
export function usePhotoVoice(active: boolean): PhotoVoice {
  const [state, setState] = useState<MicState>('idle')
  const [seconds, setSeconds] = useState(0)
  const stream = useRef<MediaStream | null>(null)
  const rec = useRef<Recording | null>(null)
  const clock = useRef(pausableClock())
  // Une ouverture qui répond après la fermeture de la caméra ne garde pas le micro.
  const generation = useRef(0)
  const max = CAPTURE_PRESETS.audio.maxDurationSec

  const release = useCallback(() => {
    generation.current++
    rec.current?.cancel()
    rec.current = null
    stopStream(stream.current)
    stream.current = null
  }, [])

  const open = useCallback(async (): Promise<boolean> => {
    if (rec.current) {
      rec.current.resume()
      clock.current.start(performance.now())
      setState('on')
      return true
    }
    const mine = generation.current
    try {
      const s = await openMic()
      if (mine !== generation.current) {
        stopStream(s)
        return false
      }
      stream.current = s
      rec.current = startRecording(s, 'audio')
      clock.current = pausableClock()
      clock.current.start(performance.now())
      setState('on')
      return true
    } catch {
      // Un refus vaut « micro fermé » : la prochaine fois, la caméra s'ouvre sans redemander.
      if (mine === generation.current) {
        setState('denied')
        writePref(PHOTO_VOICE_PREF, 'off')
      }
      return false
    }
  }, [])

  useEffect(() => {
    if (!active) return
    if (readPref(PHOTO_VOICE_PREF) === 'off') setState('off')
    else void open()
    return () => {
      release()
      setState('idle')
      setSeconds(0)
    }
  }, [active, open, release])

  // L'horloge de la pastille, et la durée d'une note au plus : le micro se ferme alors.
  useEffect(() => {
    if (state !== 'on') return
    const id = setInterval(() => {
      const now = performance.now()
      const s = clock.current.seconds(now)
      setSeconds(s)
      if (s >= max) {
        rec.current?.pause()
        clock.current.pause(now)
        setState('full')
      }
    }, 250)
    return () => clearInterval(id)
  }, [state, max])

  const mark = () => (rec.current && clock.current.running ? Math.round(clock.current.seconds(performance.now()) * 10) / 10 : undefined)

  const toggle = () => {
    if (state === 'full') return
    if (state === 'on') {
      const now = performance.now()
      rec.current?.pause()
      clock.current.pause(now)
      setSeconds(clock.current.seconds(now))
      setState('off')
      writePref(PHOTO_VOICE_PREF, 'off')
      return
    }
    void open().then((ok) => ok && writePref(PHOTO_VOICE_PREF, 'on'))
  }

  const finish = async (): Promise<File | null> => {
    const r = rec.current
    if (!r) return null
    const now = performance.now()
    const secs = clock.current.seconds(now)
    clock.current.pause(now)
    rec.current = null
    const blob = await r.stop()
    stopStream(stream.current)
    stream.current = null
    setState('idle')
    if (secs < MIN_SECONDS || !blob.size) return null
    const type = blob.type || 'audio/webm'
    return new File([blob], `commentaire-${Date.now()}.${extFor(r.mime || type)}`, { type })
  }

  return { state, seconds, mark, toggle, finish }
}
