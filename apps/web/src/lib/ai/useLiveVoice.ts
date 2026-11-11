'use client'

/**
 * Une conversation à la voix, en direct (Gemini Live, `/api/v1/ai/live/session`) : le micro part au
 * modèle, sa voix revient, et il appelle des fonctions de l'app (aller à une étape, modifier
 * l'instruction…). Une fonction peut prendre son temps (une modification par l'IA) : le modèle
 * attend sa réponse. Partagé par l'assistant du poste et l'assistant d'édition.
 */
import { useEffect, useRef, useState } from 'react'
import type { AiApi } from '../gateway/ai'

export interface LiveLine {
  who: 'user' | 'ai'
  text: string
}

/** Une fonction offerte au modèle (types en majuscules, à la manière de Gemini). */
export interface LiveTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

type LiveSession = {
  sendRealtimeInput: (p: { audio?: { data: string; mimeType: string }; text?: string; audioStreamEnd?: boolean }) => void
  sendToolResponse: (p: { functionResponses: Array<{ id?: string; name?: string; response: Record<string, unknown> }> }) => void
  close: () => void
}

function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function appendLine(lines: LiveLine[], who: LiveLine['who'], text: string): LiveLine[] {
  const last = lines[lines.length - 1]
  if (last && last.who === who) return [...lines.slice(0, -1), { who, text: (last.text + text).slice(-400) }]
  return [...lines, { who, text }]
}

export function useLiveVoice({
  ai,
  systemPrompt,
  tools,
  greeting,
  onTool,
}: {
  ai: AiApi
  /** Lu une fois, à l'ouverture de la session. */
  systemPrompt: () => string
  tools: LiveTool[]
  /** Ce qu'on demande au modèle de dire en premier. */
  greeting: string
  onTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>
}) {
  const [state, setState] = useState<'connecting' | 'listening' | 'error'>('connecting')
  const [lines, setLines] = useState<LiveLine[]>([])
  const [muted, setMuted] = useState(false)
  const [level, setLevel] = useState(0)
  const mutedRef = useRef(false)
  mutedRef.current = muted
  const toolRef = useRef(onTool)
  toolRef.current = onTool
  const init = useRef({ systemPrompt, tools, greeting })

  useEffect(() => {
    let closed = false
    let session: LiveSession | null = null
    let stream: MediaStream | null = null
    let micCtx: AudioContext | null = null
    let outCtx: AudioContext | null = null
    let playAt = 0
    const sources: AudioBufferSourceNode[] = []
    let lastUsage: unknown = null
    let sessionId = ''
    let model = ''
    let reported = false

    const report = () => {
      if (reported || !lastUsage || !model) return
      reported = true
      void ai.liveUsage(sessionId, model, lastUsage)
    }

    const stopPlayback = () => {
      sources.splice(0).forEach((s) => {
        try {
          s.stop()
        } catch {
          /* déjà arrêtée */
        }
      })
      playAt = 0
    }

    const play = (b64: string) => {
      if (!outCtx) return
      const bin = atob(b64)
      const pcm = new Int16Array(bin.length / 2)
      for (let i = 0; i < pcm.length; i++) pcm[i] = (bin.charCodeAt(i * 2 + 1) << 8) | bin.charCodeAt(i * 2)
      const buf = outCtx.createBuffer(1, pcm.length, 24000)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768
      const src = outCtx.createBufferSource()
      src.buffer = buf
      src.connect(outCtx.destination)
      playAt = Math.max(playAt, outCtx.currentTime)
      src.start(playAt)
      playAt += buf.duration
      sources.push(src)
      src.onended = () => {
        const i = sources.indexOf(src)
        if (i >= 0) sources.splice(i, 1)
      }
    }

    // Les appels de fonctions : chacun répond quand il a fini, même s'il prend du temps.
    const answer = async (calls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>) => {
      const functionResponses = await Promise.all(
        calls.map(async (fc) => {
          let result: Record<string, unknown>
          try {
            result = await toolRef.current(fc.name ?? '', (fc.args ?? {}) as Record<string, unknown>)
          } catch (e) {
            result = { ok: false, motif: e instanceof Error ? e.message : 'échec' }
          }
          return { id: fc.id, name: fc.name, response: { result } }
        }),
      )
      if (!closed) session?.sendToolResponse({ functionResponses })
    }

    ;(async () => {
      try {
        const live = await ai.liveSession()
        sessionId = live.sessionId
        model = live.model
        const { GoogleGenAI, Modality } = await import('@google/genai')
        const genai = new GoogleGenAI({ apiKey: live.accessToken, httpOptions: { apiVersion: 'v1alpha' } })
        outCtx = new AudioContext()
        session = (await genai.live.connect({
          model: live.model.replace(/^models\//, ''),
          config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
            systemInstruction: { parts: [{ text: init.current.systemPrompt() }] },
            tools: [{ functionDeclarations: init.current.tools as never }],
          },
          callbacks: {
            onopen: () => !closed && setState('listening'),
            onmessage: (msg) => {
              if (msg.usageMetadata) lastUsage = msg.usageMetadata
              if (msg.goAway) report()
              const sc = msg.serverContent
              if (sc?.interrupted) stopPlayback()
              for (const part of sc?.modelTurn?.parts ?? []) if (part.inlineData?.data) play(part.inlineData.data)
              const said = sc?.outputTranscription?.text
              const heard = sc?.inputTranscription?.text
              if (heard) setLines((l) => appendLine(l, 'user', heard))
              if (said) setLines((l) => appendLine(l, 'ai', said))
              if (msg.toolCall?.functionCalls?.length) void answer(msg.toolCall.functionCalls as Array<{ id?: string; name?: string; args?: Record<string, unknown> }>)
            },
            onerror: () => !closed && setState('error'),
            onclose: () => report(),
          },
        })) as unknown as LiveSession

        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
        micCtx = new AudioContext({ sampleRate: 16000 })
        const node = micCtx.createScriptProcessor(4096, 1, 1)
        node.onaudioprocess = (e) => {
          if (mutedRef.current || !session) return
          const f32 = e.inputBuffer.getChannelData(0)
          let sum = 0
          const i16 = new Int16Array(f32.length)
          for (let i = 0; i < f32.length; i++) {
            const v = Math.max(-1, Math.min(1, f32[i]))
            i16[i] = v * 32767
            sum += v * v
          }
          setLevel(Math.min(1, Math.sqrt(sum / f32.length) * 4))
          session.sendRealtimeInput({ audio: { data: toBase64(new Uint8Array(i16.buffer)), mimeType: 'audio/pcm;rate=16000' } })
        }
        const mute = micCtx.createGain()
        mute.gain.value = 0
        micCtx.createMediaStreamSource(stream).connect(node)
        node.connect(mute)
        mute.connect(micCtx.destination)
        session.sendRealtimeInput({ text: init.current.greeting })
      } catch {
        if (!closed) setState('error')
      }
    })()

    return () => {
      closed = true
      report()
      stopPlayback()
      try {
        session?.close()
      } catch {
        /* déjà fermée */
      }
      stream?.getTracks().forEach((t) => t.stop())
      void micCtx?.close().catch(() => undefined)
      void outCtx?.close().catch(() => undefined)
    }
  }, [ai])

  return { state, lines, muted, setMuted, level }
}
