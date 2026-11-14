/**
 * Le contrat de l'espace Découvrir avec Sandboxes : les messages exacts, les événements du suivi et leurs
 * lots, le bloc ```besoin, la conversation bornée.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { batches, cleanConversation, cleanEvents, cleanNeed, extractNeed, fitConversation, isConversationId, isVisitId, lastDay, MAX_BATCH_BYTES, MAX_EVENTS, type SuiviEvent } from '@/lib/decouvrir/contract'
import { messages, setLang } from '@/lib/i18n'

afterEach(() => setLang('fr'))

const NOW = Date.UTC(2026, 10, 13, 15, 0, 0)
const FIN = Date.UTC(2026, 11, 16, 5, 0, 0)
const FIN_12_DEC = Date.UTC(2026, 11, 13, 5, 0, 0)

describe('les messages du contrat, mot pour mot', () => {
  it('l’accès pas encore ouvert, terminé (avec le dernier jour), la session finie', () => {
    const t = messages().decouvrir
    expect(t.access.noAccess).toBe("Votre accès à cet espace n'est pas encore ouvert. Votre contact chez Intelligence Industrielle peut l'ouvrir.")
    expect(t.access.ended(FIN_12_DEC)).toBe('Votre accès a pris fin le 12 décembre. Votre contact chez Intelligence Industrielle peut le prolonger.')
    expect(t.access.wrongCredentials).toBe('Courriel ou mot de passe incorrect.')
    expect(t.access.unavailable).toBe('La connexion ne répond pas pour le moment. Réessayez dans un instant.')
    expect(t.login.notice).toBe('Ce que vous regardez et demandez ici est enregistré pour mieux vous servir.')
    expect(t.advisor.needSaved).toBe("Ajouté à nos propositions d'ajout")
    expect(t.advisor.demo.notYet).toBe("Pas encore dans Clip aujourd'hui.")
    expect(t.advisor.demo.planned).toBe("C'est dans ce qu'on prévoit ensuite.")
  })

  it('le dernier jour d’accès, à l’heure du Québec, « 1er » le premier du mois', () => {
    expect(lastDay(FIN, 'fr-CA', 'short')).toBe('15 déc.')
    expect(lastDay(FIN_12_DEC, 'fr-CA', 'long')).toBe('12 décembre')
    // Midi UTC le 12 : toujours le 12 au Québec (la fin d'un accès tombe à minuit, heure du Québec).
    expect(lastDay(Date.UTC(2026, 11, 12, 17), 'fr-CA', 'long')).toBe('12 décembre')
    expect(lastDay(Date.UTC(2026, 11, 2, 5), 'fr-CA', 'long')).toBe('1er décembre')
    expect(messages().decouvrir.shell.until(FIN)).toBe('Accès jusqu’au 15 déc.')
    setLang('en')
    expect(messages().decouvrir.access.ended(FIN_12_DEC)).toBe('Your access ended on December 12. Your contact at Intelligence Industrielle can extend it.')
  })
})

describe('les événements du suivi', () => {
  it('seuls ceux qui suivent le contrat passent, nettoyés', () => {
    const raw = [
      { at: NOW, type: 'page', chemin: '/decouvrir', libelle: 'Vidéos', jeton: 'à ignorer', personne: { id: 'quelqu’un' } },
      { at: NOW, type: 'video', videoId: '00-film', pct: 45.4, sec: 33.7, chapitre: 'c05', libelle: 'Clip en 75 secondes' },
      { at: NOW, type: 'video', videoId: '00-film' },
      { at: NOW, type: 'inconnu' },
      { at: NOW, type: 'conseiller', libelle: 'question', donnees: { texte: 'q'.repeat(900) } },
      { at: NOW, type: 'conseiller', libelle: 'pirater' },
      { at: NOW, type: 'page', chemin: 'sans-barre' },
      { at: NOW - 30 * 86_400_000, type: 'sortie', sec: 95.6 },
      { at: NOW + 3_600_000, type: 'video_fin', videoId: '00-film', libelle: 'Clip en 75 secondes' },
      { at: Math.round(NOW / 1000), type: 'parcours', libelle: 'Commencer ici : terminé' },
      'pas un objet',
    ]
    const clean = cleanEvents(raw, NOW)
    expect(clean.map((e) => e.type)).toEqual(['page', 'video', 'conseiller', 'sortie', 'video_fin', 'parcours'])
    expect(clean[0]).toEqual({ at: NOW, type: 'page', chemin: '/decouvrir', libelle: 'Vidéos' })
    expect(clean[1]).toEqual({ at: NOW, type: 'video', videoId: '00-film', pct: 45, sec: 34, chapitre: 'c05', libelle: 'Clip en 75 secondes' })
    expect((clean[2].donnees?.texte as string).length).toBe(500)
    // Une heure vieille de plus d'une semaine, future ou en secondes devient maintenant.
    expect(clean[3]).toEqual({ at: NOW, type: 'sortie', sec: 96 })
    expect(clean[4].at).toBe(NOW)
    expect(clean[5].at).toBe(NOW)
  })

  it('au plus 100 par appel ; une liste illisible ne donne rien', () => {
    expect(cleanEvents(Array.from({ length: 150 }, () => ({ at: NOW, type: 'sortie', sec: 1 })), NOW)).toHaveLength(MAX_EVENTS)
    expect(cleanEvents('pas une liste', NOW)).toEqual([])
  })

  it('les données d’un geste restent sous 4 Ko', () => {
    const [e] = cleanEvents([{ at: NOW, type: 'conseiller', libelle: 'fichier', donnees: { nom: 'é'.repeat(900), type: 'é'.repeat(900), taille: 12, a: 'é'.repeat(900), b: 'é'.repeat(900), c: 'é'.repeat(900), d: 'é'.repeat(900), e: 'é'.repeat(900) } }], NOW)
    expect(new TextEncoder().encode(JSON.stringify(e.donnees ?? {})).length).toBeLessThan(4096)
  })

  it('250 événements donnent 100 + 100 + 50, dans l’ordre', () => {
    const many: SuiviEvent[] = Array.from({ length: 250 }, (_, i) => ({ at: NOW + i, type: 'page', chemin: '/decouvrir' }))
    const lots = batches(many)
    expect(lots.map((l) => l.length)).toEqual([100, 100, 50])
    expect(lots.flat().every((e, i) => e.at === NOW + i)).toBe(true)
    expect(batches([])).toEqual([])
  })

  it('des événements lourds : chaque lot, enveloppe comprise, reste sous 64 Ko', () => {
    const heavy: SuiviEvent[] = Array.from({ length: 100 }, (_, i) => ({ at: NOW + i, type: 'conseiller', libelle: 'question', donnees: { texte: 'é'.repeat(450) } }))
    const lots = batches(heavy)
    const size = (l: SuiviEvent[]) => new TextEncoder().encode(JSON.stringify({ personne: { id: 'x'.repeat(40), courriel: 'x'.repeat(60), nom: 'x'.repeat(60), entrepriseId: 'x'.repeat(40), type: 'prospect' }, session: 's_xxxxxxxxxxxxxx', evenements: l })).length
    expect(lots.length).toBeGreaterThan(1)
    for (const l of lots) {
      expect(l.length).toBeLessThanOrEqual(MAX_EVENTS)
      expect(size(l)).toBeLessThanOrEqual(MAX_BATCH_BYTES)
    }
  })

  it('l’identifiant de visite et celui d’une conversation', () => {
    expect(isVisitId('s_abc123def456')).toBe(true)
    expect(isVisitId('s_a')).toBe(false)
    expect(isVisitId('x_abc123def456')).toBe(false)
    expect(isConversationId('c_0123456789abcd')).toBe(true)
    expect(isConversationId('../etc')).toBe(false)
    expect(isConversationId('c')).toBe(false)
  })
})

describe('le bloc besoin', () => {
  const need = { titre: 'Alerter avant la date de relecture', probleme: 'On oublie de revoir les instructions.', frequence: 'chaque mois', verbatims: ['On l’oublie toujours.'], modulesLies: ['échéances'] }

  it('est extrait et retiré du message ; le reste reste intact', () => {
    const msg = `Votre besoin, en trois lignes :\n\n1. Alerter\n2. Avant la date\n3. Par courriel\n\n\`\`\`besoin\n${JSON.stringify(need)}\n\`\`\``
    const r = extractNeed(msg)
    expect(r.need).toMatchObject({ titre: need.titre, probleme: need.probleme, frequence: 'chaque mois', modulesLies: ['échéances'] })
    expect(r.text).toBe('Votre besoin, en trois lignes :\n\n1. Alerter\n2. Avant la date\n3. Par courriel')
  })

  it('illisible : retiré, rien n’est envoyé, le message n’est pas cassé', () => {
    const bad = extractNeed('Merci ! Voici ce que je retiens.\n\n```besoin\n{ titre: oups, \n```\n\nUne autre question ?')
    expect(bad.need).toBeNull()
    expect(bad.text).toBe('Merci ! Voici ce que je retiens.\n\nUne autre question ?')
    expect(extractNeed(`Texte.\n\`\`\`besoin\n${JSON.stringify({ probleme: 'sans titre' })}\n\`\`\``).need).toBeNull()
  })

  it('sans bloc : le message ne change pas ; non fermé (réponse coupée) : extrait et retiré ; deux blocs : le premier compte', () => {
    const plain = 'Oui : « Traduire pour les opérateurs », 38 langues.'
    expect(extractNeed(plain)).toEqual({ text: plain, need: null })
    const cut = extractNeed(`Merci.\n\n\`\`\`besoin\n${JSON.stringify(need)}`)
    expect(cut.need?.titre).toBe(need.titre)
    expect(cut.text).toBe('Merci.')
    const twice = extractNeed(`A\n\`\`\`besoin json\n${JSON.stringify(need)}\n\`\`\`\nB\n\`\`\`besoin\n${JSON.stringify({ ...need, titre: 'Autre' })}\n\`\`\``)
    expect(twice.need?.titre).toBe(need.titre)
    expect(twice.text).toBe('A\n\nB')
  })

  it('aux limites que Sandboxes vérifie', () => {
    const capped = cleanNeed({ titre: 'x'.repeat(500), probleme: 'p'.repeat(5000), frequence: 'f'.repeat(900), verbatims: Array(30).fill('v'), modulesLies: Array(30).fill('m'), contournement: 4 })!
    expect(capped.titre).toHaveLength(200)
    expect(capped.probleme).toHaveLength(4000)
    expect(capped.frequence).toHaveLength(500)
    expect(capped.verbatims).toHaveLength(20)
    expect(capped.modulesLies).toHaveLength(20)
    expect(capped.contournement).toBeUndefined()
    expect(cleanNeed(['un', 'tableau'])).toBeNull()
  })
})

describe('la conversation', () => {
  it('est bornée : 200 messages, 8 000 caractères par message, l’extrait et les vidéos', () => {
    const raw = {
      debut: NOW,
      maj: NOW,
      messages: Array.from({ length: 260 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', texte: 'x'.repeat(9000), at: NOW + i })),
      extrait: { besoins: ['a'], idees: [], modules: [], outils: [], role: 'r'.repeat(400), entreprise: 'Atelier' },
      videos: [{ id: '00-film', titre: 'Clip en 75 secondes', pct: 120 }],
    }
    const c = cleanConversation(raw)!
    expect(c.messages).toHaveLength(200)
    expect(c.messages[0].texte).toHaveLength(8000)
    expect(c.extrait.role).toHaveLength(300)
    expect(c.videos).toEqual([{ id: '00-film', titre: 'Clip en 75 secondes', pct: 100 }])
    expect(cleanConversation({ debut: NOW })).toBeNull()
  })

  it('tient sous 256 Ko : les plus vieux messages tombent d’abord, jamais le dernier', () => {
    const body = { personne: { id: 'p' }, messages: Array.from({ length: 200 }, (_, i) => ({ role: 'user', texte: `${i}:${'é'.repeat(3000)}`, at: i })) }
    const fit = fitConversation(body)
    expect(new TextEncoder().encode(JSON.stringify(fit)).length).toBeLessThanOrEqual(256 * 1024)
    expect(fit.messages.at(-1)).toEqual(body.messages.at(-1))
    expect(fit.messages.length).toBeLessThan(200)
  })
})
