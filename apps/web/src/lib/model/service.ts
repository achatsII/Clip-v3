/**
 * Le cycle de vie d'une instruction : brouillon, sources, publication, approbation, versions.
 * Toutes les écritures passent par PATCH (seules les clés touchées changent), sauf le document
 * publié, remplacé en entier à chaque publication.
 */
import { withoutProposals } from './checks'
import type { DataApi, Doc } from '../gateway/data'
import { messages, messagesIn } from '../i18n'
import { summarizeChanges } from './diff'
import { coverOf, emptyContent, findPublished, nowIso, T } from './repo'
import type { Branding, Instruction, InstructionContent, OrgSettings, Published, Renewal, Signature, Source, Version } from './types'
import { reuseSource } from './library'
import { allocateNumbers, instructionSearchText, publishedCard } from './search'

export interface Actor {
  id: string
  name: string
}

export async function createInstruction(data: DataApi, actor: Actor, init: Partial<Instruction> = {}): Promise<Doc<Instruction>> {
  const now = nowIso()
  const json: Instruction = {
    title: messages().instructions.defaults.title,
    kind: 'procedure',
    category: 'production',
    tags: [],
    stationIds: [],
    status: 'draft',
    sources: [],
    draft: null,
    dirty: false,
    publishedVersion: null,
    publishedId: null,
    review: null,
    generation: null,
    origin: 'capture',
    authorId: actor.id,
    authorName: actor.name,
    updatedBy: actor.id,
    updatedByName: actor.name,
    createdAt: now,
    updatedAt: now,
    coverUrl: null,
    stepCount: 0,
    sourceCount: init.sources?.length ?? 0,
    ...init,
  }
  json.searchText = instructionSearchText(json, json.draft)
  return data.insert<Instruction>(T.instruction, json, json.title)
}

export async function saveSources(data: DataApi, id: string, sources: Source[], actor: Actor) {
  await data.patch(T.instruction, id, { sources, sourceCount: sources.length, updatedAt: nowIso(), updatedBy: actor.id, updatedByName: actor.name })
}

/** Enregistre la copie de travail et les copies légères pour les listes. */
export async function saveDraft(data: DataApi, id: string, instr: Instruction, draft: InstructionContent, actor: Actor, extra: Partial<Instruction> = {}) {
  const patch: Record<string, unknown> = {
    draft,
    title: draft.title,
    kind: draft.kind,
    category: draft.category,
    tags: draft.tags,
    coverUrl: coverOf(draft),
    stepCount: draft.steps.length,
    updatedAt: nowIso(),
    updatedBy: actor.id,
    updatedByName: actor.name,
    // L'index de recherche suit le brouillon (la recherche se fait au serveur).
    searchText: instructionSearchText({ number: instr.number, intent: instr.intent }, draft),
    ...extra,
  }
  if (instr.status === 'published' || instr.publishedVersion) patch.dirty = true
  await data.patch(T.instruction, id, patch)
}

export function brandingOf(org: OrgSettings): Branding {
  return { orgName: org.name, logoUrl: org.logoUrl ?? null, color: org.color ?? null }
}

/**
 * Publie le brouillon : version immuable, document public remplacé, instruction à jour.
 * Rend le numéro de la nouvelle version et le document public.
 */
export async function publishInstruction(
  data: DataApi,
  doc: Doc<Instruction>,
  org: OrgSettings,
  actor: Actor,
  opts: {
    approvedBy?: Actor | null
    previous?: InstructionContent | null
    renewal?: Renewal | null
    approvals?: { list: NonNullable<Version['approvals']>; line: string } | null
    /** La formation (toggle `training`) : combien de questions sont publiées, et faut-il se re-former. */
    training?: { questions: number; retrain: boolean } | null
    /** Une phrase en tête du résumé de la version (« Bloc commun « X » v3. »). */
    note?: string
  } = {},
): Promise<{ number: number; publishedId: string | null; docNumber: string | null }> {
  const instr = doc.json_data
  // Ce qui part au poste : les relevés que l'IA a proposés et que l'auteur n'a pas gardés restent au brouillon.
  const content = instr.draft ? withoutProposals(instr.draft) : null
  if (!content || !content.steps.length) throw new Error(messages().instructions.errors.publishWithoutSteps)
  const number = (instr.publishedVersion ?? 0) + 1
  const publishedAt = nowIso()
  const previous = opts.previous ?? null
  // Le numéro de document se donne à la première publication, et reste ensuite (un bloc commun n'en a pas).
  const docNumber = instr.number || (instr.block ? null : (await allocateNumbers(data, 1).catch(() => []))[0]) || null

  const version: Version = {
    instructionId: doc._id,
    number,
    content,
    stationIds: instr.stationIds,
    publishedBy: instr.review?.requestedBy ?? actor.id,
    publishedByName: instr.review?.requestedByName ?? actor.name,
    approvedBy: opts.approvedBy?.id ?? null,
    // À plusieurs : « Nathalie Roy (Qualité), Luc Gagnon (Production) », et chaque signature à part.
    approvedByName: opts.approvals?.line || (opts.approvedBy?.name ?? null),
    ...(opts.approvals?.list.length ? { approvals: opts.approvals.list } : {}),
    changelog: [opts.note, summarizeChanges(previous, content)].filter(Boolean).join(' '),
    createdAt: publishedAt,
  }
  await data.insert<Version>(T.version, version, `${content.title} — v${number}`)

  const pub: Published = {
    instructionId: doc._id,
    version: number,
    content,
    stationIds: instr.stationIds,
    branding: brandingOf(org),
    publishedAt,
    // La fiche et l'index : la liste d'un poste et sa recherche ne lisent pas le contenu.
    card: publishedCard(content, docNumber),
    searchText: instructionSearchText({ number: docNumber }, content),
  }
  // Un bloc commun ne s'affiche à aucun poste : pas de version publique ; ses instructions le portent.
  let publishedId = instr.block ? null : instr.publishedId
  if (!instr.block) {
    if (publishedId) {
      const existing = await data.get<Published>(T.published, publishedId)
      if (existing) await data.replace(T.published, publishedId, pub)
      else publishedId = null
    }
    if (!publishedId) {
      const found = await findPublished(data, doc._id)
      if (found) {
        publishedId = found._id
        await data.replace(T.published, publishedId, pub)
      } else {
        publishedId = (await data.insert<Published>(T.published, pub, content.title))._id
      }
    }
  }

  await data.patch(T.instruction, doc._id, {
    status: 'published',
    publishedVersion: number,
    publishedId,
    publishedAt,
    ...(docNumber && docNumber !== instr.number ? { number: docNumber, searchText: instructionSearchText({ number: docNumber, intent: instr.intent }, content) } : {}),
    dirty: false,
    review: null,
    // Publier repousse la relecture périodique (toggle `renewal`).
    ...(opts.renewal !== undefined ? { renewal: opts.renewal } : {}),
    // La matrice de compétences lit ces deux champs : une formation d'avant `trainingVersion` est à refaire.
    ...(opts.training ? { publishedQuiz: opts.training.questions, ...(opts.training.retrain ? { trainingVersion: number } : {}) } : {}),
    updatedAt: publishedAt,
    updatedBy: actor.id,
    updatedByName: actor.name,
  })
  return { number, publishedId, docNumber }
}

/** « Toujours bonne » : la relecture est faite, la prochaine est repoussée ; pas de nouvelle version. */
export async function confirmRenewal(data: DataApi, id: string, renewal: Renewal): Promise<void> {
  await data.patch(T.instruction, id, { renewal })
}

export async function requestReview(data: DataApi, doc: Doc<Instruction>, org: OrgSettings, actor: Actor, note?: string, retrain?: boolean) {
  await data.patch(T.instruction, doc._id, {
    status: 'review',
    review: {
      requestedBy: actor.id,
      requestedByName: actor.name,
      requestedAt: nowIso(),
      // À plusieurs, les approbateurs sont les membres des groupes ; une nouvelle demande repart sans signature.
      approverIds: org.approval.mode === 'all' ? [...new Set((org.approval.groups ?? []).flatMap((g) => g.memberIds))] : org.approval.approverIds,
      note: note?.trim() || null,
      changesRequested: null,
      signatures: [],
      ...(retrain ? { retrain: true } : {}),
    },
    updatedAt: nowIso(),
  })
}

/**
 * Range les signatures d'une revue. L'instruction est relue juste avant : une signature posée par
 * quelqu'un d'autre entre-temps reste.
 */
export async function saveSignatures(data: DataApi, id: string, mine: Signature[]): Promise<Signature[]> {
  const fresh = await data.get<Instruction>(T.instruction, id)
  const others = (fresh?.json_data.review?.signatures ?? []).filter((s) => !mine.some((m) => m.groupId === s.groupId))
  const signatures = [...others, ...mine]
  await data.patch(T.instruction, id, { 'review.signatures': signatures, updatedAt: nowIso() })
  return signatures
}

export async function requestChanges(data: DataApi, doc: Doc<Instruction>, actor: Actor, comment: string) {
  const review = doc.json_data.review
  await data.patch(T.instruction, doc._id, {
    status: doc.json_data.publishedVersion ? 'published' : 'draft',
    dirty: !!doc.json_data.publishedVersion,
    // Des changements demandés : les signatures déjà posées ne valent plus.
    review: review ? { ...review, signatures: [], changesRequested: { by: actor.id, byName: actor.name, at: nowIso(), comment } } : null,
    updatedAt: nowIso(),
  })
}

export async function updatePublishedStations(data: DataApi, doc: Doc<Instruction>, stationIds: string[]) {
  await data.patch(T.instruction, doc._id, { stationIds, updatedAt: nowIso() })
  if (doc.json_data.publishedId) await data.patch(T.published, doc.json_data.publishedId, { stationIds }).catch(() => undefined)
}

export async function archiveInstruction(data: DataApi, doc: Doc<Instruction>) {
  await data.patch(T.instruction, doc._id, { status: 'archived', updatedAt: nowIso() })
  if (doc.json_data.publishedId) await data.remove(T.published, doc.json_data.publishedId)
}

export async function duplicateInstruction(data: DataApi, doc: Doc<Instruction>, actor: Actor): Promise<Doc<Instruction>> {
  const src = doc.json_data
  // « (copie) » dans la langue du contenu copié (le français pour un contenu d'avant les langues) ;
  // sans brouillon, dans celle du nouveau contenu.
  const draft = src.draft ? { ...src.draft, title: messagesIn(src.draft.language || 'fr').instructions.defaults.copy(src.draft.title) } : emptyContent({ title: messages().instructions.defaults.copy(src.title) })
  return createInstruction(data, actor, {
    title: draft.title,
    kind: src.kind,
    category: src.category,
    tags: src.tags,
    stationIds: src.stationIds,
    sources: src.sources,
    draft,
    ...(src.block ? { block: true } : {}),
    origin: 'duplicate',
    coverUrl: coverOf(draft),
    stepCount: draft.steps.length,
  })
}

/**
 * Une nouvelle instruction avec les médias et la demande d'une autre : on la relance, on en fait
 * une variante, sans toucher à l'originale. Elle s'ouvre sur la capture : on ajoute, on retire, on
 * génère.
 */
export async function newFromSources(data: DataApi, doc: Doc<Instruction>, actor: Actor): Promise<Doc<Instruction>> {
  const src = doc.json_data
  return createInstruction(data, actor, {
    intent: src.intent,
    sources: (src.sources ?? []).map(reuseSource),
    stationIds: src.stationIds,
    origin: 'capture',
  })
}

/** Remet le contenu d'une ancienne version dans le brouillon (rien n'est publié). */
export async function restoreVersion(data: DataApi, doc: Doc<Instruction>, version: Version, actor: Actor) {
  await saveDraft(data, doc._id, doc.json_data, version.content, actor)
}
