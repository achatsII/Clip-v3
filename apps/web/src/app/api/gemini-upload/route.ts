/**
 * Envoie chez Gemini un fichier du stockage quand la route directe de la Gateway n'est pas servie
 * (`src/lib/server/geminiUpload.ts`). La personne se prouve par son jeton de la Gateway, que la
 * Gateway relit ; le fichier ne vient que de notre stockage. Ses réponses ne s'affichent jamais :
 * l'app dit « La vidéo n'a pas pu être préparée pour l'IA » (`files.geminiUpload`).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { bearer } from '@/lib/server/gateway'
import { bridgeToGemini } from '@/lib/server/geminiUpload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Une vidéo de 100 Mo lue du stockage puis versée chez Google.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const token = bearer(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const body = (await req.json().catch(() => null)) as { url?: unknown; mimeType?: unknown } | null
  if (!body) return NextResponse.json({ error: 'body' }, { status: 400 })
  const result = await bridgeToGemini({ url: body.url, mimeType: body.mimeType, token })
  return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
}
