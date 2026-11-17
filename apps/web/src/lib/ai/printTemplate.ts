/**
 * Un gabarit du PDF repris d'un exemple de l'usine (toggle `printTemplates`, feature `brand_kit`) :
 * une de ses instructions actuelles (PDF, Word converti, ou photo d'une page). L'IA dit ce qu'elle
 * voit (disposition, orientation, ce que montre l'en-tête, le texte du pied de page, la couleur) ;
 * le gabarit n'en garde que ce qui tient (`normalizeTemplate`). Débitée au coût réel (`print_template`).
 */
import type { AiApi } from '../gateway/ai'
import { HEADER_FIELDS, normalizeTemplate, type HeaderField, type PrintTemplate } from '../pdf/template'
import { printTemplateSchema } from './schemas'

const SYSTEM =
  'Tu regardes l’exemple d’une instruction de travail d’une usine (un PDF ou la photo d’une page) pour en reprendre la mise en page dans un nouvel outil. Tu dis comment les étapes sont disposées, l’orientation de la page, ce que montre son en-tête (numéro du document, version ou révision, approbation, poste ou machine, durée, code QR), le texte fixe de son pied de page s’il y en a un, mot pour mot (sans numéro de page ni date), et sa couleur principale. N’invente rien : ce qui ne se voit pas est false, ou vide.'

export async function templateFromExample(ai: AiApi, file: { url: string; mimeType: string; filename: string }): Promise<PrintTemplate> {
  const res = await ai.ask<Record<string, unknown>>(
    'print_template',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      mediaResolution: 'high',
      system_instruction: SYSTEM,
      prompt: 'Voici l’exemple. Rends sa mise en page.',
      files: [file],
      json_schema: printTemplateSchema,
    },
    { scope: 'print-template', timeoutMs: 90_000 },
  )
  const j = res.json ?? {}
  const fields: Partial<Record<HeaderField, boolean>> = {}
  for (const f of HEADER_FIELDS) if (j[f] === false) fields[f] = false
  return normalizeTemplate({ layout: j.layout, orientation: j.orientation, fields, footer: j.footer, accent: j.color, pageNumbers: true })
}
