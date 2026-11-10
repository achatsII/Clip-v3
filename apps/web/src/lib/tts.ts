/**
 * Lecture à voix haute des étapes (`/api/v1/ai/tts`, voix québécoise). Un seul élément audio,
 * déverrouillé par le premier toucher, réutilisé ensuite (exigence de Safari iOS).
 */
import type { AiApi } from './gateway/ai'

const LANG_NAMES: Record<string, string> = { fr: 'Canadian French', en: 'English', es: 'Spanish', pt: 'Portuguese', ar: 'Arabic', tl: 'Tagalog', vi: 'Vietnamese', zh: 'Chinese', uk: 'Ukrainian' }

export class Speaker {
  private audio: HTMLAudioElement | null = null
  private cache = new Map<string, string>()
  private current = ''
  onState?: (playing: boolean) => void

  constructor(private ai: AiApi) {}

  private el(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.preload = 'auto'
      this.audio.onended = () => this.onState?.(false)
      this.audio.onpause = () => this.onState?.(false)
      this.audio.onplay = () => this.onState?.(true)
    }
    return this.audio
  }

  /** À appeler dans un gestionnaire de toucher : autorise les lectures suivantes. */
  unlock() {
    const a = this.el()
    a.muted = true
    void a.play().catch(() => undefined)
    a.pause()
    a.muted = false
  }

  async prefetch(key: string, text: string, lang: string) {
    if (this.cache.has(key) || !text.trim()) return
    try {
      const url = await this.ai.tts(text, { language: LANG_NAMES[lang] ?? 'auto', pace: 'normal' })
      this.cache.set(key, url)
    } catch {
      /* la lecture n'est qu'un plus */
    }
  }

  async speak(key: string, text: string, lang: string): Promise<boolean> {
    this.current = key
    if (!this.cache.has(key)) await this.prefetch(key, text, lang)
    const url = this.cache.get(key)
    if (!url || this.current !== key) return false
    const a = this.el()
    a.src = url
    try {
      await a.play()
      return true
    } catch {
      return false
    }
  }

  stop() {
    this.current = ''
    this.audio?.pause()
  }
}

export function stepSpeech(title: string, text: string, warning?: string | null): string {
  return [title, text, warning].filter(Boolean).join('. ')
}
