/**
 * Le conseiller de l'espace Découvrir : sa base ne dit ni prix, ni nom d'outil interne ; sa réponse de
 * démonstration ne dit jamais seulement « non » (la conduite du contrat de Sandboxes, §4) ; ce qu'il envoie
 * à l'assistant et ce qu'il retient.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { ADVISOR_SCHEMA, advisorRequest, advisorSystem, EMPTY_EXTRACT, mergeExtract, readAdvisorReply, toConversationPayload, videoGuide, type AdvisorMessage } from '@/lib/decouvrir/advisor'
import { demoAnswer, missingFeatures, STARTER_HINTS } from '@/lib/decouvrir/advisorDemo'
import { VIDEO_IDS } from '@/lib/decouvrir/catalog'
import { extractNeed } from '@/lib/decouvrir/contract'
import { KNOWLEDGE } from '@/lib/decouvrir/knowledge'
import { messages, messagesIn, setLang } from '@/lib/i18n'

afterEach(() => setLang('fr'))

/** Le film publié et ses chapitres (public/decouvrir/videos/00-film.json). */
const FILM = [{ id: '00-film' as const, chapters: [{ t: 0, title: 'Le savoir-faire qui part à la retraite' }, { t: 39.8, title: 'Retoucher, annoter, traduire' }, { t: 45.2, title: 'Moderniser les anciennes instructions' }, { t: 57.6, title: "L'opérateur au poste" }] }]

/** Ce que l'espace ne dit jamais : un prix, un outil interne, l'application partagée. */
const FORBIDDEN = [/octopus/i, /\bgateway\b/i, /\bably\b/i, /\bn8n\b/i, /vercel/i, /revenuecat/i, /stripe/i, /higgsfield/i, /\bkrakend\b/i, /\bhtml\b/, /sandboxes/i, /\bclip-v3\b/]
const AMOUNT = /\d[\d\s.,]*\s*(\$|\bcad\b|dollars?\b)|\$\s*\d/i

describe('la base de connaissance', () => {
  it('ne dit ni prix, ni nom d’outil interne', () => {
    for (const re of FORBIDDEN) expect(KNOWLEDGE, String(re)).not.toMatch(re)
    expect(KNOWLEDGE).not.toMatch(AMOUNT)
    expect(KNOWLEDGE).toMatch(/un conseiller d'Intelligence Industrielle vous les donnera/)
  })

  it('a ses sections de référence, dont ce qui n’existe pas encore et ce qui est prévu', () => {
    for (const h of ['## En une phrase', '## Pour qui', '## Forfaits', "## Ce qui n'existe pas encore", "## Ce qu'on prévoit ensuite", '## Sécurité et données', '## Questions fréquentes', '## Glossaire']) expect(KNOWLEDGE).toContain(h)
    const missing = missingFeatures()
    expect(missing.length).toBeGreaterThan(10)
    // La date d'échéance et l'alerte d'une instruction ne sont pas dans l'app (le deck les montre ; pas l'espace).
    expect(missing.some((m) => /alerte avant l'échéance/i.test(m.name) && !m.planned)).toBe(true)
    expect(missing.some((m) => /échéance d'une instruction choisie/i.test(m.name) && !m.planned)).toBe(true)
    // Prévus (README) : l'écran TV synchronisé et les vidéos de caméras par API.
    expect(missing.filter((m) => m.planned).map((m) => m.name)).toEqual(['Écran TV synchronisé avec la tablette du poste', 'Réception des vidéos de caméras par une API'])
  })

  it('la consigne et les textes de l’espace ne disent aucun montant', () => {
    expect(advisorSystem({ connaissances: KNOWLEDGE, personne: 'Alex', videos: 'aucune', retenu: '{}' })).not.toMatch(AMOUNT)
    for (const lang of ['fr', 'en']) expect(JSON.stringify(messagesIn(lang).decouvrir)).not.toMatch(AMOUNT)
  })
})

describe('la liste des vidéos du conseiller', () => {
  it('recommande les vidéos tournées par leur titre exact, avec leurs chapitres ; les autres sont « à venir »', () => {
    const guide = videoGuide([{ id: '00-film', chapters: [{ t: 0, title: 'Le savoir-faire qui part à la retraite' }, { t: 15.4, title: 'Voici Clip' }] }])
    expect(guide).toContain('« Clip en 75 secondes » : ')
    expect(guide).toContain('2. Voici Clip (0:15)')
    expect(guide).toMatch(/Vidéos à venir \(pas encore tournées, ne les recommande pas\) : « La visite complète »/)
    expect(guide.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(1)
  })
})

describe('l’appel à l’assistant', () => {
  const history: AdvisorMessage[] = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}`, at: i }))

  it('porte la consigne, la base, la sortie structurée et les 14 derniers messages', () => {
    const body = advisorRequest({ question: 'Traduisez-vous en espagnol ?', history, personne: 'Alex Exemple', seen: [{ titre: 'Clip en 75 secondes', pct: 45 }], retenu: EMPTY_EXTRACT, published: [{ id: '00-film', chapters: [] }] })
    expect(body).toMatchObject({ prompt: 'Traduisez-vous en espagnol ?', provider: 'google', level: 'mid', thinking: 'disabled', json_schema: ADVISOR_SCHEMA })
    const system = body.system_instruction as string
    expect(system).toContain('Tu parles à Alex Exemple')
    expect(system).toContain('Vidéos déjà regardées : Clip en 75 secondes (45 %)')
    expect(system).toContain('## 4. Traduire')
    expect(system).toContain('```besoin')
    expect((body.history as unknown[]).length).toBe(14)
    expect(body.files).toBeUndefined()
  })

  it('un document : le texte lu dans le navigateur, ou le fichier téléversé', () => {
    const text = advisorRequest({ question: '', doc: { name: 'proc.txt', text: 'Étape 1' }, history: [], seen: [], retenu: EMPTY_EXTRACT, published: [] })
    expect(text.prompt).toBe('Analyse le document joint.\n\nContenu du document « proc.txt » :\nÉtape 1')
    const pdf = advisorRequest({ question: 'Et ça ?', files: [{ url: 'https://stockage.test/p.pdf', filename: 'p.pdf', mimeType: 'application/pdf', sizeBytes: 10 }], history: [], seen: [], retenu: EMPTY_EXTRACT, published: [] })
    expect(pdf.files).toHaveLength(1)
    expect((pdf.system_instruction as string)).toContain('Tu parles à une personne')
  })

  it('lit la réponse structurée, dans `parsed_json` ou dans le texte, sinon le texte seul', () => {
    expect(readAdvisorReply({ parsed_json: { reponse: 'Oui.', extraction: { besoins: ['x'] } } })).toEqual({ reponse: 'Oui.', extraction: { besoins: ['x'] } })
    expect(readAdvisorReply({ assistant_response: '```json\n{"reponse":"Oui.","extraction":{}}\n```' })).toEqual({ reponse: 'Oui.', extraction: {} })
    expect(readAdvisorReply({ assistant_response: 'Un texte libre.' })).toEqual({ reponse: 'Un texte libre.', extraction: null })
    expect(readAdvisorReply(null)).toEqual({ reponse: '', extraction: null })
  })

  it('retient sans doublon (sans égard à la casse), garde le déjà retenu, borne les listes', () => {
    const prev = { ...EMPTY_EXTRACT, besoins: ['Alerte avant échéance'], entreprise: 'Atelier' }
    const merged = mergeExtract(prev, { besoins: ['alerte avant échéance', 'Traduire en tagalog'], idees: ['Un QR par pièce'], modules: [], outils: ['Word', 4], entreprise: '', role: 'Méthodes' })
    expect(merged).toEqual({ besoins: ['Alerte avant échéance', 'Traduire en tagalog'], idees: ['Un QR par pièce'], modules: [], outils: ['Word'], entreprise: 'Atelier', role: 'Méthodes' })
    expect(mergeExtract(EMPTY_EXTRACT, { besoins: Array.from({ length: 60 }, (_, i) => `b${i}`) }).besoins).toHaveLength(40)
    expect(mergeExtract(prev, null)).toEqual(prev)
  })

  it('envoie la conversation à Sandboxes en français : un document joint tient en une ligne', () => {
    setLang('en')
    const payload = toConversationPayload(
      { id: 'c_0123456789abcd', startedAt: 1, updatedAt: 2, messages: [{ role: 'user', text: 'Voici', at: 1, files: ['proc.pdf'] }], extract: { ...EMPTY_EXTRACT, resume: 'Traduire' } },
      [{ id: '00-film', titre: 'Clip en 75 secondes', pct: 50 }],
    )
    expect(payload.messages[0].texte).toBe('Voici\n[Document joint : proc.pdf]')
    expect(payload.extrait).toEqual({ besoins: [], idees: [], modules: [], outils: [], resume: 'Traduire' })
    expect(payload.videos).toEqual([{ id: '00-film', titre: 'Clip en 75 secondes', pct: 50 }])
  })
})

describe('le conseiller de démonstration (interrupteur éteint)', () => {
  const d = () => messages().decouvrir.advisor.demo
  const say = (history: AdvisorMessage[], q: string) => {
    const r = demoAnswer(q, EMPTY_EXTRACT, history, FILM)
    history.push({ role: 'user', text: q, at: history.length }, { role: 'assistant', text: extractNeed(r.reponse).text, at: history.length + 1 })
    return r
  }

  it('ce qui n’existe pas : « Pas encore… », ce qui s’en approche, l’invitation, une première question, aucun bloc', () => {
    const r = demoAnswer('Est-ce que Clip envoie une alerte par courriel avant l’échéance d’une instruction ?', EMPTY_EXTRACT, [])
    expect(r.reponse).toContain(d().notYet)
    expect(r.reponse).toContain('Ce qui s’en approche déjà : « À revoir dans » 6 mois')
    expect(r.reponse).not.toContain(d().planned)
    expect(r.reponse).toContain(d().invite)
    expect(r.reponse.trim().endsWith(d().questions[0])).toBe(true)
    expect(r.reponse).not.toContain('```')
  })

  it('ce qui est prévu : « C’est dans ce qu’on prévoit ensuite. », sans date', () => {
    const r = demoAnswer('Est-ce que l’étape peut s’afficher sur un écran TV synchronisé avec la tablette ?', EMPTY_EXTRACT, [])
    expect(r.reponse).toContain(d().notYet)
    expect(r.reponse).toContain(d().planned)
    expect(r.reponse).not.toMatch(/20\d\d/)
  })

  it('trois questions, une à la fois, puis le besoin reformulé en trois lignes et son bloc', () => {
    const history: AdvisorMessage[] = []
    say(history, 'Est-ce que Clip envoie une alerte par courriel avant l’échéance d’une instruction ?')
    expect(say(history, 'On oublie de revoir nos procédures de cadenassage.').reponse.trim().endsWith(d().questions[1])).toBe(true)
    expect(say(history, 'Chaque mois, le responsable SST.').reponse.trim().endsWith(d().questions[2])).toBe(true)
    const last = demoAnswer('Une procédure périmée au poste, et un audit raté.', EMPTY_EXTRACT, history)
    const { text, need } = extractNeed(last.reponse)
    expect(need).toMatchObject({ titre: "Alerte avant l'échéance d'une instruction", frequence: 'Chaque mois, le responsable SST.', impact: 'Une procédure périmée au poste, et un audit raté.' })
    expect(need?.probleme).toContain('On oublie de revoir')
    expect(need?.modulesLies).toContain('échéances et avertissements')
    expect(need?.existant).toMatch(/^« À revoir dans »/)
    expect(text).toMatch(/1\. .+\n2\. .+\n3\. .+/)
    expect(text).not.toContain('```')
    expect(last.extraction.besoins).toContain(need?.titre)
  })

  it('la personne décline : rien n’est retenu, pas d’insistance', () => {
    const history: AdvisorMessage[] = []
    say(history, 'Est-ce que Clip envoie une alerte par courriel avant l’échéance d’une instruction ?')
    const r = demoAnswer('Non merci', EMPTY_EXTRACT, history)
    expect(r.reponse).toBe(d().declined)
    expect(extractNeed(r.reponse).need).toBeNull()
  })

  it('les six exemples de l’écran trouvent ce que Clip fait, en français comme en anglais', () => {
    for (const lang of ['fr', 'en'] as const) {
      setLang(lang)
      const starters = messages().decouvrir.advisor.starters
      expect(starters).toHaveLength(STARTER_HINTS.length)
      starters.forEach((s, i) => {
        const r = demoAnswer(s, EMPTY_EXTRACT, [], FILM, STARTER_HINTS[i])
        expect(r.reponse, `${lang} ${s}`).not.toContain(messages().decouvrir.advisor.demo.notYet)
      })
    }
  })

  it('ce qui existe : la section, et la vidéo où le voir quand elle est publiée', () => {
    const r = demoAnswer('Est-ce que les opérateurs ont besoin d’un compte pour voir l’instruction au poste ?', EMPTY_EXTRACT, [], FILM)
    expect(r.reponse).not.toContain(d().notYet)
    expect(r.reponse).toContain(d().note)
    expect(r.reponse.trim().endsWith(d().discovery)).toBe(true)
  })

  it('dit où le voir : le chapitre du film qui en parle, avec son heure', () => {
    const r = demoAnswer('Nos opérateurs parlent espagnol et arabe : est-ce un problème ?', EMPTY_EXTRACT, [], FILM)
    expect(r.reponse).toContain('À voir : le chapitre « Retoucher, annoter, traduire » de la vidéo « Clip en 75 secondes », à 0:39.')
    const moderniser = demoAnswer('Peut-on importer nos vieilles procédures PDF et Word ?', EMPTY_EXTRACT, [], FILM)
    expect(moderniser.reponse).toContain('« Moderniser les anciennes instructions »')
    // Sans vidéo publiée, rien à voir.
    expect(demoAnswer('Nos opérateurs parlent espagnol et arabe : est-ce un problème ?', EMPTY_EXTRACT, []).reponse).not.toContain('À voir')
  })

  it('le prix : les forfaits, aucun montant, le renvoi à un conseiller', () => {
    for (const q of ['Combien coûte Clip ?', 'Quel est le prix du forfait Usine ?']) {
      const r = demoAnswer(q, EMPTY_EXTRACT, [])
      expect(r.reponse).toContain(d().prices)
      expect(r.reponse).toContain('Usine : 15 rédacteurs')
      expect(r.reponse).not.toMatch(AMOUNT)
      expect(r.reponse).not.toContain(d().notYet)
    }
    setLang('en')
    expect(demoAnswer('How much does it cost?', EMPTY_EXTRACT, []).reponse).toContain(messages().decouvrir.advisor.demo.prices)
  })

  it('en anglais, une question trouve sa section par les mots du métier', () => {
    setLang('en')
    const r = demoAnswer('Can operators read it in Spanish or Arabic?', EMPTY_EXTRACT, [])
    expect(r.reponse).not.toContain(messages().decouvrir.advisor.demo.notYet)
    expect(r.reponse).toContain('Traduire')
  })

  it('n’existe que pour les vidéos tournées : aucune vidéo « Bientôt » n’est recommandée', () => {
    const titles = VIDEO_IDS.filter((id) => id !== '00-film').map((id) => messagesIn('fr').decouvrir.videos[id].title)
    for (const q of ['Comment importer nos vieux PDF ?', 'Comment approuver une instruction ?', 'Comment traduire ?']) {
      const r = demoAnswer(q, EMPTY_EXTRACT, [], FILM)
      for (const t of titles) expect(r.reponse).not.toContain(`« ${t} »`)
    }
  })
})
