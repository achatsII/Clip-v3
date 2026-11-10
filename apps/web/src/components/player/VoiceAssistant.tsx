'use client'

import { Mic, MicOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AiApi } from '@/lib/gateway/ai'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

/**
 * Assistant vocal en direct (Gemini Live, `/api/v1/ai/live/session`) : l'opérateur parle, les
 * mains libres. Le modèle navigue dans les étapes par des fonctions de l'app et répond aux
 * questions à partir de l'instruction. Signaler un problème ouvre le formulaire : rien
 * d'irréversible ne part à la voix.
 */
interface Line {
  who: 'user' | 'ai'
  text: string
}

type LiveSession = {
  sendRealtimeInput: (p: { audio?: { data: string; mimeType: string }; text?: string; audioStreamEnd?: boolean }) => void
  sendToolResponse: (p: { functionResponses: Array<{ id?: string; name?: string; response: Record<string, unknown> }> }) => void
  close: () => void
}

const LANG_HINT: Record<string, string> = { fr: 'français québécois', en: 'English', es: 'español' }

function systemPrompt(content: InstructionContent, lang: string) {
  const steps = content.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.text}${s.warning ? ` (${s.warning.level} : ${s.warning.text})` : ''}`).join('\n')
  return `Tu es l'assistant vocal d'un opérateur d'usine qui suit l'instruction « ${content.title} ». Il a les mains occupées. Parle en ${LANG_HINT[lang] ?? lang}, phrases très courtes, ton calme et clair.
- Pour changer d'étape, appelle VRAIMENT la fonction (aller_etape_suivante, aller_etape_precedente, aller_a_etape) ; ne dis jamais que tu as changé d'étape sans l'avoir fait.
- Avant de répondre à « où j'en suis », appelle etat_instruction.
- Pour lire une étape, appelle etat_instruction puis lis son titre et son texte mot pour mot.
- Réponds aux questions UNIQUEMENT à partir de l'instruction ci-dessous ; si la réponse n'y est pas, dis-le et conseille de demander au superviseur. Ne devine jamais une valeur.
- Pour un danger ou une question de sécurité incertaine : dis d'arrêter et d'appeler le superviseur.
- Si l'opérateur veut signaler un problème, appelle signaler_probleme : le formulaire s'ouvre à l'écran.

INSTRUCTION :
${steps}`
}

const TOOLS = [
  { name: 'aller_etape_suivante', description: "Passe à l'étape suivante à l'écran. Appelle-la vraiment.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'aller_etape_precedente', description: "Revient à l'étape précédente à l'écran. Appelle-la vraiment.", parameters: { type: 'OBJECT', properties: {} } },
  {
    name: 'aller_a_etape',
    description: "Affiche l'étape demandée (1 = première). Appelle-la vraiment.",
    parameters: { type: 'OBJECT', properties: { numero: { type: 'NUMBER', description: "Numéro de l'étape, 1 = première" } }, required: ['numero'] },
  },
  { name: 'etat_instruction', description: "Rend l'étape affichée en ce moment et son contenu. À appeler avant de dire où en est l'opérateur.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'signaler_probleme', description: "Ouvre à l'écran le formulaire pour signaler qu'une étape n'est pas claire, fausse ou dangereuse.", parameters: { type: 'OBJECT', properties: {} } },
]

function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function VoiceAssistant({ ai, content, lang, index, onClose, onGo, onReport }: { ai: AiApi; content: InstructionContent; lang: string; index: number; onClose: () => void; onGo: (i: number) => void; onReport: () => void }) {
  const [state, setState] = useState<'connecting' | 'listening' | 'error'>('connecting')
  const [lines, setLines] = useState<Line[]>([])
  const [muted, setMuted] = useState(false)
  const [level, setLevel] = useState(0)
  const indexRef = useRef(index)
  indexRef.current = index
  const mutedRef = useRef(false)
  mutedRef.current = muted
  const handlers = useRef({ onGo, onReport })
  handlers.current = { onGo, onReport }

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

    const runTool = (name: string, args: Record<string, unknown>): Record<string, unknown> => {
      const n = content.steps.length
      const i = indexRef.current
      if (name === 'aller_etape_suivante') {
        if (i >= n - 1) {
          handlers.current.onGo(n)
          return { ok: true, message: 'Instruction terminée.' }
        }
        handlers.current.onGo(i + 1)
        return { ok: true, etape: i + 2, titre: content.steps[i + 1]?.title }
      }
      if (name === 'aller_etape_precedente') {
        if (i <= 0) return { ok: false, motif: 'Déjà à la première étape.' }
        handlers.current.onGo(i - 1)
        return { ok: true, etape: i, titre: content.steps[i - 1]?.title }
      }
      if (name === 'aller_a_etape') {
        const k = Math.round(Number(args.numero))
        if (!Number.isFinite(k) || k < 1 || k > n) return { ok: false, motif: `Il y a ${n} étapes.` }
        handlers.current.onGo(k - 1)
        return { ok: true, etape: k, titre: content.steps[k - 1].title }
      }
      if (name === 'etat_instruction') {
        const s = content.steps[i]
        return i < 0 ? { ecran: 'avant de commencer', etapes: n } : i >= n ? { ecran: 'terminé', etapes: n } : { etape: i + 1, sur: n, titre: s.title, texte: s.text, mise_en_garde: s.warning?.text ?? null, points_cles: s.keyPoints ?? [] }
      }
      if (name === 'signaler_probleme') {
        handlers.current.onReport()
        return { ok: true, message: 'Le formulaire est ouvert à l’écran.' }
      }
      return { ok: false, motif: 'Fonction inconnue' }
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
            systemInstruction: { parts: [{ text: systemPrompt(content, lang) }] },
            tools: [{ functionDeclarations: TOOLS as never }],
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
              if (msg.toolCall?.functionCalls?.length) {
                const functionResponses = msg.toolCall.functionCalls.map((fc) => ({ id: fc.id, name: fc.name, response: { result: runTool(fc.name ?? '', (fc.args ?? {}) as Record<string, unknown>) } }))
                session?.sendToolResponse({ functionResponses })
              }
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
        session.sendRealtimeInput({ text: lang === 'fr' ? 'Bonjour, présente-toi en une phrase et demande comment aider.' : 'Hello, introduce yourself in one sentence.' })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pb-safe animate-slide-up fixed inset-x-0 bottom-0 z-[65] px-3 pb-3 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[420px] sm:px-0 sm:pb-0">
      <div className="glass-panel rounded-[32px] bg-white/90 p-5 dark:bg-slate-850/95">
        <div className="flex items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <span className="bg-gradient-accent absolute inset-0 rounded-full opacity-30 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.5})` }} />
            <span className={cn('bg-gradient-accent relative flex h-12 w-12 items-center justify-center rounded-full text-white', state === 'connecting' && 'animate-pulse')}>
              <Mic className="h-6 w-6" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black">{state === 'connecting' ? 'Connexion…' : state === 'error' ? 'Assistant indisponible' : muted ? 'Micro coupé' : 'Je vous écoute'}</p>
            <p className="text-sm font-medium text-slate-500">{state === 'error' ? 'Vérifiez le micro et la connexion, puis réessayez.' : '« Étape suivante », « répète », « c’est quoi le couple ? »'}</p>
          </div>
          <button type="button" onClick={() => setMuted((m) => !m)} disabled={state !== 'listening'} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 disabled:opacity-40 dark:bg-white/10" aria-label={muted ? 'Activer le micro' : 'Couper le micro'}>
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 dark:bg-white/10" aria-label="Fermer l’assistant">
            <X className="h-5 w-5" />
          </button>
        </div>
        {lines.length > 0 && (
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
            {lines.slice(-6).map((l, i) => (
              <p key={i} className={cn('rounded-2xl px-3 py-2 text-sm font-bold', l.who === 'user' ? 'ml-8 bg-slate-900/5 dark:bg-white/10' : 'mr-8 bg-primary-soft')}>
                {l.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function appendLine(lines: Line[], who: Line['who'], text: string): Line[] {
  const last = lines[lines.length - 1]
  if (last && last.who === who) return [...lines.slice(0, -1), { who, text: (last.text + text).slice(-400) }]
  return [...lines, { who, text }]
}
