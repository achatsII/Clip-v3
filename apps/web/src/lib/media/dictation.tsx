'use client'

/**
 * La dictée des champs de texte. Deux moteurs, choisis par le contexte :
 * - compte connecté : on enregistre la voix et la Gateway la transcrit (même voie que les notes
 *   vocales ; marche dans la coquille iPhone, où le navigateur n'a pas de reconnaissance vocale) ;
 * - lien public sans compte (tablette de poste) : la reconnaissance vocale du navigateur, s'il en a
 *   une ; sinon pas de micro (un invité n'a pas le droit de transcrire par la Gateway).
 * Hors de tout fournisseur (page de connexion), aucun micro.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { openMic, startRecording, stopStream, type Recording } from './recorder'

export type Transcriber = (audio: Blob, fileName: string) => Promise<string>

interface DictationConfig {
  transcribe: Transcriber | null
  speech: boolean
  lang: string
}

const Ctx = createContext<DictationConfig>({ transcribe: null, speech: false, lang: 'fr-CA' })

export function DictationProvider({ transcribe = null, speech = false, lang = 'fr-CA', children }: { transcribe?: Transcriber | null; speech?: boolean; lang?: string; children: ReactNode }) {
  return <Ctx.Provider value={{ transcribe, speech, lang }}>{children}</Ctx.Provider>
}

/** La reconnaissance vocale du navigateur (Chrome, Safari), absente des WebView iOS. */
interface SpeechResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechCtor = new () => SpeechRecognitionLike

function speechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

type Engine = 'record' | 'speech' | null

function pickEngine(cfg: DictationConfig): Engine {
  if (cfg.transcribe && canRecord()) return 'record'
  if (cfg.speech && speechCtor()) return 'speech'
  return null
}

const noSubscription = () => () => undefined

/**
 * Faux au rendu serveur et à l'hydratation, puis ce que le navigateur sait faire : le micro
 * apparaît sans que le champ soit recréé (il garderait sinon mal son focus).
 */
export function useDictationAvailable(): boolean {
  const cfg = useContext(Ctx)
  return useSyncExternalStore(noSubscription, () => pickEngine(cfg) !== null, () => false)
}

export type DictationState = 'idle' | 'recording' | 'busy'

/** On parle, puis on arrête : le texte reconnu est rendu à `onText` (jamais vide). */
export function useDictation(onText: (text: string) => void, onProblem: (title: string, detail?: string) => void) {
  const cfg = useContext(Ctx)
  const [state, setState] = useState<DictationState>('idle')
  const rec = useRef<Recording | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const speech = useRef<SpeechRecognitionLike | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textRef = useRef(onText)
  textRef.current = onText
  const problemRef = useRef(onProblem)
  problemRef.current = onProblem

  useEffect(
    () => () => {
      rec.current?.cancel()
      stopStream(stream.current)
      speech.current?.abort()
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const stop = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    if (speech.current) {
      setState('busy')
      speech.current.stop()
      return
    }
    const r = rec.current
    if (!r || !cfg.transcribe) return
    rec.current = null
    setState('busy')
    try {
      const blob = await r.stop()
      stopStream(stream.current)
      stream.current = null
      const text = (await cfg.transcribe(blob, `dictee.${r.mime.includes('mp4') ? 'm4a' : 'webm'}`)).trim()
      if (text) textRef.current(text)
      else problemRef.current('Rien entendu', 'Parlez un peu plus près du micro.')
    } catch {
      problemRef.current('La dictée n’a pas fonctionné', 'Réessayez ou tapez le texte.')
    } finally {
      setState('idle')
    }
  }, [cfg])

  const start = useCallback(async () => {
    const engine = pickEngine(cfg)
    if (engine === 'speech') {
      const Ctor = speechCtor()!
      const r = new Ctor()
      r.lang = cfg.lang
      r.continuous = true
      r.interimResults = false
      const parts: string[] = []
      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) parts.push(e.results[i][0].transcript)
      }
      r.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') problemRef.current('Le micro n’est pas accessible', 'Autorisez le micro pour ce site.')
      }
      r.onend = () => {
        speech.current = null
        const text = parts.join(' ').trim()
        if (text) textRef.current(text)
        setState('idle')
      }
      speech.current = r
      r.start()
      setState('recording')
      timer.current = setTimeout(() => void stop(), 120_000)
      return
    }
    if (engine === 'record') {
      try {
        stream.current = await openMic()
        rec.current = startRecording(stream.current, 'audio')
        setState('recording')
        timer.current = setTimeout(() => void stop(), 120_000)
      } catch {
        problemRef.current('Le micro n’est pas accessible', 'Autorisez le micro dans les réglages du téléphone ou du navigateur.')
      }
    }
  }, [cfg, stop])

  const toggle = useCallback(() => {
    if (state === 'recording') void stop()
    else if (state === 'idle') void start()
  }, [state, start, stop])

  return { state, toggle }
}

/**
 * Ajoute le texte dicté à la fin d'un champ, comme si on l'avait tapé : la page reçoit son
 * `onChange` (champ contrôlé) puis son `onBlur` (champ qui s'enregistre en le quittant).
 */
export function insertDictation(el: HTMLInputElement | HTMLTextAreaElement | null, text: string) {
  if (!el) return
  const clean = (el instanceof HTMLTextAreaElement ? text : text.replace(/\s+/g, ' ')).trim()
  if (!clean) return
  const current = el.value
  const next = current && !/\s$/.test(current) ? `${current} ${clean}` : `${current}${clean}`
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  if (document.activeElement !== el) el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}
