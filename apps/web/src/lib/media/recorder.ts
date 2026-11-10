/**
 * Enregistrement dans le navigateur, au même poids que la coquille native : vidéo 720p à
 * ~2,5 Mb/s, audio mono 64 kb/s (32 kb/s sur iOS, conseil de la Gateway pour la transcription).
 */
import { CAPTURE_PRESETS } from '@clip/bridge'

export function pickMime(kind: 'video' | 'audio'): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates =
    kind === 'video'
      ? ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}

export function extFor(mime: string): string {
  if (mime.includes('mp4')) return mime.startsWith('audio') ? 'm4a' : 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

/** Vidéo : 720p à 30 i/s au plus. Photo (sans audio) : jusqu'à 1080p, réduite à 1920 px. */
export async function openCamera(facing: 'environment' | 'user' = 'environment', withAudio = true): Promise<MediaStream> {
  const size = withAudio ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, ...size, frameRate: { ideal: 30, max: 30 } },
    audio: withAudio ? { echoCancellation: true, noiseSuppression: true, channelCount: 1 } : false,
  })
}

export async function openMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
}

export interface Recording {
  stop: () => Promise<Blob>
  cancel: () => void
  mime: string
}

export function startRecording(stream: MediaStream, kind: 'video' | 'audio'): Recording {
  const mime = pickMime(kind)
  const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent)
  const options: MediaRecorderOptions = mime ? { mimeType: mime } : {}
  if (kind === 'video') {
    options.videoBitsPerSecond = CAPTURE_PRESETS.video.bitrate
    options.audioBitsPerSecond = 96_000
  } else {
    options.audioBitsPerSecond = isIOS ? 32_000 : CAPTURE_PRESETS.audio.bitrate
  }
  const rec = new MediaRecorder(stream, options)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.start(kind === 'audio' ? 50 : 1000)
  return {
    mime: rec.mimeType || mime,
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: (rec.mimeType || mime || (kind === 'video' ? 'video/webm' : 'audio/webm')).split(';')[0] }))
        if (rec.state !== 'inactive') rec.stop()
      }),
    cancel: () => {
      rec.onstop = null
      if (rec.state !== 'inactive') rec.stop()
    },
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

/** Niveau sonore (0 à 1) d'un flux, pour le vu-mètre. */
export function levelMeter(stream: MediaStream): { read: () => number; close: () => void } {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const src = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  src.connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  return {
    read: () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += ((v - 128) / 128) ** 2
      return Math.min(1, Math.sqrt(sum / buf.length) * 3)
    },
    close: () => void ctx.close().catch(() => undefined),
  }
}
