/**
 * Donne un fichier à la personne : dans l'app, la feuille de partage du téléphone (l'enregistrer
 * dans les photos, l'envoyer par Teams ou par courriel ; capacité `share`, avec le fichier en
 * base64) ; dans le navigateur, un téléchargement. Une feuille fermée sans rien choisir n'est pas
 * une erreur.
 */
import { callNative, hasCapability, NativeError } from '@/lib/bridge/native'

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function saveFile(blob: Blob, name: string): Promise<void> {
  if (hasCapability('share')) {
    try {
      await callNative('share', { fileName: name, mimeType: blob.type || 'application/octet-stream', base64: await toBase64(blob) })
    } catch (e) {
      if (!(e instanceof NativeError && e.code === 'cancelled')) throw e
    }
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

/** Un nom de fichier lisible tiré d'un titre (« Étape 3 — Serrer les vis.gif »). */
export function fileNameOf(title: string, ext: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'clip'
  return `${base}.${ext}`
}
