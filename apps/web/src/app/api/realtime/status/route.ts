/**
 * L'état du temps réel, pour un diagnostic sans connexion : `{ configured, ok, code? }`. Ne dit rien
 * de la clé ni d'une organisation (src/lib/realtime/status.ts).
 */
import { NextResponse } from 'next/server'
import { realtimeStatus } from '@/lib/realtime/status'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await realtimeStatus(process.env.ABLY_KEY), { headers: { 'Cache-Control': 'no-store' } })
}
