/**
 * Où sont les figures d'une page de document (toggle `documentFigures`, `src/lib/media/figures.ts`) :
 * une seule demande par page, avec la page rendue en image et la liste des figures que les étapes
 * veulent montrer. Débitée au coût réel comme toute réponse de l'IA (`aiApi.ask`, usage `figures`).
 */
import type { AiApi } from '../gateway/ai'
import { parseBox, type FigureBox } from '../media/figures'
import { figuresPrompt, figuresSystem } from './prompts'
import { figuresSchema } from './schemas'

/** La boîte de chaque figure demandée, dans l'ordre ; null pour une figure que la page n'a pas. */
export async function locateFigures(ai: AiApi, pageImageUrl: string, figures: string[], scope: string): Promise<Array<FigureBox | null>> {
  const res = await ai.ask<{ figures?: Array<{ n?: number; found?: boolean; box?: unknown }> }>(
    'figures',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      mediaResolution: 'high',
      system_instruction: figuresSystem(),
      prompt: figuresPrompt(figures),
      files: [{ url: pageImageUrl, filename: 'page.png', mimeType: 'image/png' }],
      json_schema: figuresSchema,
    },
    { scope, timeoutMs: 60_000 },
  )
  const out: Array<FigureBox | null> = figures.map(() => null)
  for (const f of res.json?.figures ?? []) {
    const i = Math.round(Number(f.n)) - 1
    if (i >= 0 && i < out.length && f.found !== false && !out[i]) out[i] = parseBox(f.box)
  }
  return out
}
