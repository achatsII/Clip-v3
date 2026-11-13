/**
 * Les vidéos tournées de l'espace Découvrir : chaque `public/decouvrir/videos/<id>.json` dont le MP4 est là.
 * Lu au rendu, donc au build en production (les pages de l'espace sont statiques : les vidéos arrivent
 * avec le déploiement). Chaque accès au disque reste dans ce dossier (sinon le traceur de la build
 * emporterait tout le projet avec le serveur) : l'affiche et les sous-titres y vivent aussi. Serveur seulement.
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseVideoMeta, type VideoMeta } from '../videos'

/** Un fichier de l'espace (`/decouvrir/videos/<nom>`), présent à côté des métadonnées. */
function present(publicPath: string): boolean {
  if (!publicPath.startsWith('/decouvrir/videos/')) return false
  return fs.existsSync(path.join(process.cwd(), 'public', 'decouvrir', 'videos', path.basename(publicPath)))
}

export function readVideoMetas(): Record<string, VideoMeta> {
  let files: string[] = []
  try {
    files = fs.readdirSync(path.join(process.cwd(), 'public', 'decouvrir', 'videos')).filter((f) => f.endsWith('.json'))
  } catch {
    return {}
  }
  const out: Record<string, VideoMeta> = {}
  for (const f of files) {
    const id = f.replace(/\.json$/, '')
    try {
      const meta = parseVideoMeta(id, JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'decouvrir', 'videos', path.basename(f)), 'utf8')), present)
      if (meta) out[id] = meta
    } catch {
      /* JSON en cours d'écriture ou invalide : la vidéo reste « Bientôt » */
    }
  }
  return out
}
