import { describe, expect, it } from 'vitest'
import { buildPrintHtml } from '@/lib/pdf/printHtml'
import { emptyContent } from '@/lib/model/repo'
import { buildScope, permissionsFor } from '@/lib/server/scope'

describe('portée des liens publics', () => {
  const id = '68791cc877718aec114d43ec'
  it('poste « ce poste d’abord » : son poste en lecture, toutes les instructions publiées de CLIP, retours et événements en insertion', () => {
    const s = buildScope('station', id, { mode: 'focus', sharedApp: true, slug: 'clip-v3' })
    expect(s.resources).toEqual([
      { data_type: 'clip_station', filter: { _id: id }, actions: ['read'] },
      { data_type: 'clip_published', filter: { 'json_data.app_identifier': 'clip-v3' }, actions: ['read'] },
      { data_type: 'clip_feedback', actions: ['insert'] },
      { data_type: 'clip_event', actions: ['insert'] },
    ])
  })
  it('poste « seulement ce poste » : les instructions publiées de ce poste seulement', () => {
    const s = buildScope('station', id, { mode: 'only', sharedApp: true, slug: 'clip-v3' })
    expect(s.resources[1].filter).toEqual({ 'json_data.stationIds': id, 'json_data.app_identifier': 'clip-v3' })
  })
  it('instruction : cette instruction publiée seulement, jamais les brouillons', () => {
    const s = buildScope('instruction', id, { sharedApp: false, slug: 'clip-v3' })
    expect(s.resources.map((r) => r.data_type)).toEqual(['clip_published', 'clip_feedback', 'clip_event'])
    expect(s.resources[0].filter).toEqual({ 'json_data.instructionId': id })
    expect(JSON.stringify(s)).not.toContain('clip_instruction')
  })
  it('l’assistant vocal n’est ouvert que sur demande, pour un poste', () => {
    expect(permissionsFor('station', false)).not.toContain('assistant:ask')
    expect(permissionsFor('station', true)).toEqual(expect.arrayContaining(['assistant:ask', 'ai:live']))
    expect(permissionsFor('instruction', true)).not.toContain('assistant:ask')
  })
})

describe('export PDF', () => {
  it('échappe le texte et marque un brouillon', () => {
    const html = buildPrintHtml(emptyContent({ title: '<script>alert(1)</script>', steps: [{ id: 's', title: 'A & B', text: '"x"', keyPoints: [], warning: { level: 'danger', text: '<b>' }, media: [] }] }), {
      branding: { orgName: 'Usine' },
      version: null,
      stationNames: [],
      showClipMention: false,
      draft: true,
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('A &amp; B')
    expect(html).toContain('Brouillon')
  })
})
