/**
 * Lecture à voix haute des étapes par la voix en direct (Gemini Live, `/api/v1/ai/live/session`),
 * au lieu d'un fichier audio à générer : la session s'ouvre au premier « Écouter », reste ouverte
 * tant que l'instruction est à l'écran, et chaque étape part tout de suite. Sans session (réseau,
 * droit absent), la voix de l'appareil prend le relais (`speechSynthesis`).
 */
import type { AiApi } from './gateway/ai'

/** Ce que le lecteur reçoit de la session en direct (le sous-ensemble utile des messages). */
export interface LiveMessage {
  usageMetadata?: unknown
  serverContent?: { interrupted?: boolean; turnComplete?: boolean; modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> } }
}

export interface ReaderSession {
  send: (text: string) => void
  close: () => void
}

/** Où joue l'audio : une file de morceaux PCM, qui dit quand elle a fini de parler. */
export interface AudioSink {
  play: (base64Pcm: string) => void
  stop: () => void
  /** Rappelée quand le dernier morceau joué s'est tu. */
  onIdle?: () => void
  /** Plus rien ne joue ni n'attend de jouer. */
  idle: () => boolean
  resume?: () => void
  close?: () => void
}

export interface LiveSpeakerDeps {
  connect: (ai: AiApi, onMessage: (m: LiveMessage) => void, onClose: () => void) => Promise<{ session: ReaderSession; sessionId: string; model: string }>
  sink: () => AudioSink
  synth?: () => SpeechSynthesis | undefined
}

const SYSTEM = `Tu es une voix de lecture pour des opérateurs d’usine. Chaque message contient un texte à lire.
Lis-le à voix haute, exactement et en entier, une seule fois, dans la langue où il est écrit, sans le traduire ; le français se lit avec l’accent du Québec.
N’ajoute rien : ni salutation, ni commentaire, ni question, ni résumé. Ton calme et clair, débit normal.`

/** Le texte d'une étape à lire : titre, consigne, mise en garde. */
export function stepSpeech(title: string, text: string, warning?: string | null): string {
  return [title, text, warning].filter(Boolean).join('. ')
}

export class LiveSpeaker {
  onState?: (playing: boolean) => void
  private session: ReaderSession | null = null
  private opening: Promise<ReaderSession | null> | null = null
  private audio: AudioSink | null = null
  private info = { sessionId: '', model: '' }
  private lastUsage: unknown = null
  /** Une lecture est demandée et sa voix n'a pas fini d'arriver. */
  private inFlight = false
  /** La voix d'une lecture interrompue arrive encore : on la jette jusqu'à la coupure. */
  private dropping = false
  private turnDone = true
  private disposed = false

  constructor(
    private ai: AiApi,
    private deps: LiveSpeakerDeps = defaultDeps,
  ) {}

  private sink(): AudioSink {
    if (!this.audio) {
      this.audio = this.deps.sink()
      this.audio.onIdle = () => {
        if (this.turnDone) this.onState?.(false)
      }
    }
    return this.audio
  }

  /** À appeler dans un geste (toucher) : iOS n'ouvre le son qu'ainsi. */
  unlock() {
    this.sink().resume?.()
  }

  /** Ouvre la session à l'avance : la première lecture part sans attendre la connexion. */
  prefetch(..._ignored: unknown[]) {
    void this.open()
  }

  private open(): Promise<ReaderSession | null> {
    if (this.session) return Promise.resolve(this.session)
    if (this.opening) return this.opening
    this.opening = this.deps
      .connect(this.ai, (m) => this.onMessage(m), () => this.onClosed())
      .then(({ session, sessionId, model }) => {
        this.info = { sessionId, model }
        if (this.disposed) {
          session.close()
          return null
        }
        this.session = session
        return session
      })
      .catch(() => null)
      .finally(() => {
        this.opening = null
      })
    return this.opening
  }

  private onClosed() {
    this.report()
    this.session = null
    this.inFlight = false
    this.dropping = false
  }

  private onMessage(m: LiveMessage) {
    if (m.usageMetadata) this.lastUsage = m.usageMetadata
    const sc = m.serverContent
    if (!sc) return
    if (this.dropping) {
      // La lecture d'avant est coupée (ou finie) : la suite est la nouvelle.
      if (sc.interrupted || sc.turnComplete) this.dropping = false
      return
    }
    for (const part of sc.modelTurn?.parts ?? []) {
      if (!part.inlineData?.data) continue
      if (this.turnDone) {
        this.turnDone = false
        this.onState?.(true)
      }
      this.sink().play(part.inlineData.data)
    }
    if (sc.turnComplete) {
      this.inFlight = false
      this.turnDone = true
      // La voix est déjà toute jouée : la lecture est finie.
      if (this.audio?.idle() ?? true) this.onState?.(false)
    }
  }

  /** Lit le texte ; rend faux si rien ne peut le lire (ni voix en direct, ni voix de l'appareil). */
  async speak(_key: string, text: string, lang: string): Promise<boolean> {
    if (!text.trim() || this.disposed) return false
    this.stop()
    const session = await this.open()
    if (!session) return this.fallback(text, lang)
    if (this.inFlight) this.dropping = true
    this.inFlight = true
    this.turnDone = true
    session.send(text)
    return true
  }

  /** Coupe la lecture en cours ; la session reste ouverte pour la suivante. */
  stop() {
    this.audio?.stop()
    if (this.inFlight) this.dropping = true
    this.deps.synth?.()?.cancel()
    this.turnDone = true
    this.onState?.(false)
  }

  /** L'instruction quitte l'écran : on ferme la session et on rend compte de son usage. */
  dispose() {
    this.disposed = true
    this.stop()
    try {
      this.session?.close()
    } catch {
      /* déjà fermée */
    }
    this.report()
    this.session = null
    this.audio?.close?.()
    this.audio = null
  }

  private reported = false
  private report() {
    if (this.reported || !this.lastUsage || !this.info.model) return
    this.reported = true
    void this.ai.liveUsage(this.info.sessionId, this.info.model, this.lastUsage)
  }

  private fallback(text: string, lang: string): boolean {
    const synth = this.deps.synth?.()
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'fr' ? 'fr-CA' : lang
    u.onstart = () => this.onState?.(true)
    u.onend = () => this.onState?.(false)
    u.onerror = () => this.onState?.(false)
    synth.speak(u)
    return true
  }
}

/** La file audio du navigateur : PCM 16 bits à 24 kHz, joué morceau après morceau. */
function webSink(): AudioSink {
  let ctx: AudioContext | null = null
  let playAt = 0
  const sources: AudioBufferSourceNode[] = []
  const sink: AudioSink = {
    resume: () => {
      ctx ??= new AudioContext()
      void ctx.resume().catch(() => undefined)
    },
    play: (b64) => {
      ctx ??= new AudioContext()
      const bin = atob(b64)
      const pcm = new Int16Array(bin.length / 2)
      for (let i = 0; i < pcm.length; i++) pcm[i] = (bin.charCodeAt(i * 2 + 1) << 8) | bin.charCodeAt(i * 2)
      const buf = ctx.createBuffer(1, pcm.length, 24000)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      playAt = Math.max(playAt, ctx.currentTime)
      src.start(playAt)
      playAt += buf.duration
      sources.push(src)
      src.onended = () => {
        const i = sources.indexOf(src)
        if (i >= 0) sources.splice(i, 1)
        if (!sources.length) sink.onIdle?.()
      }
    },
    stop: () => {
      sources.splice(0).forEach((s) => {
        s.onended = null
        try {
          s.stop()
        } catch {
          /* déjà arrêtée */
        }
      })
      playAt = 0
    },
    idle: () => sources.length === 0,
    close: () => void ctx?.close().catch(() => undefined),
  }
  return sink
}

async function connectLive(ai: AiApi, onMessage: (m: LiveMessage) => void, onClose: () => void) {
  const live = await ai.liveSession()
  const { GoogleGenAI, Modality } = await import('@google/genai')
  const genai = new GoogleGenAI({ apiKey: live.accessToken, httpOptions: { apiVersion: 'v1alpha' } })
  const raw = (await genai.live.connect({
    model: live.model.replace(/^models\//, ''),
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
      systemInstruction: { parts: [{ text: SYSTEM }] },
    },
    callbacks: { onmessage: (m) => onMessage(m as LiveMessage), onerror: () => onClose(), onclose: () => onClose() },
  })) as unknown as { sendClientContent: (p: { turns: Array<{ role: string; parts: Array<{ text: string }> }>; turnComplete: boolean }) => void; close: () => void }
  const session: ReaderSession = {
    send: (text) => raw.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true }),
    close: () => raw.close(),
  }
  return { session, sessionId: live.sessionId, model: live.model }
}

const defaultDeps: LiveSpeakerDeps = {
  connect: connectLive,
  sink: webSink,
  synth: () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined),
}
