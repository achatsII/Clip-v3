/**
 * Ce qu'un rapport lit, et seulement ce qu'il lit (`ReportDef.needs`), sur la période et la précédente :
 * les événements (ouvertures, instructions faites), les travaux avec relevés, les retours, la
 * formation, et des comptes faits au serveur pour la bibliothèque. Jamais toute la bibliothèque : les
 * fiches publiées suffisent pour les titres et les temps prévus.
 */
import type { DataApi, Doc } from '../gateway/data'
import { latestQualifications, dueQualifications, listQualifications } from '../model/academy'
import { listExecutions } from '../model/executions'
import { listOperators } from '../model/operators'
import { T } from '../model/repo'
import { countInstructions, countPublished, trainingCatalog } from '../model/search'
import { listTrainings } from '../model/training'
import type { Execution, Feedback, Published, UsageEvent } from '../model/types'
import type { CardInfo, LibraryFacts, TrainingFacts } from './catalog'

/** Au-delà, la période est trop chargée pour tout lire : le rapport le dit. */
export const EVENTS_CAP = 20_000

export async function loadEvents(data: DataApi, since: string): Promise<{ events: UsageEvent[]; capped: boolean }> {
  const docs = await data.filter<UsageEvent>(T.event, {
    filter: { $and: [{ 'json_data.at': { $gte: since } }, { 'json_data.type': { $in: ['view', 'complete'] } }] },
    projection: { 'json_data.type': 1, 'json_data.instructionId': 1, 'json_data.stationId': 1, 'json_data.version': 1, 'json_data.durationSec': 1, 'json_data.operatorId': 1, 'json_data.operatorName': 1, 'json_data.source': 1, 'json_data.at': 1 },
    sort: { _id: -1 },
    limit: EVENTS_CAP,
  })
  return { events: docs.map((d) => d.json_data), capped: docs.length >= EVENTS_CAP }
}

export async function loadExecutions(data: DataApi, since: string): Promise<Execution[]> {
  return (await listExecutions(data, { since, limit: 5000 })).map((d) => d.json_data)
}

export async function loadFeedback(data: DataApi, since: string): Promise<Feedback[]> {
  const docs = await data.filter<Feedback>(T.feedback, { filter: { 'json_data.createdAt': { $gte: since } }, sort: { 'json_data.createdAt': -1 }, limit: 3000 })
  return docs.map((d) => d.json_data)
}

/** Les fiches des versions publiées : le titre, le numéro, le temps prévu, les postes. */
export async function loadCards(data: DataApi): Promise<Map<string, CardInfo>> {
  const docs: Array<Doc<Published>> = await data.filter<Published>(T.published, {
    projection: { 'json_data.instructionId': 1, 'json_data.version': 1, 'json_data.stationIds': 1, 'json_data.publishedAt': 1, 'json_data.card': 1, 'json_data.content.title': 1, 'json_data.content.durationMin': 1 },
    limit: 10_000,
  })
  const out = new Map<string, CardInfo>()
  for (const { json_data: p } of docs) {
    const card = p.card
    out.set(p.instructionId, {
      title: card?.title ?? p.content?.title ?? '',
      number: card?.number ?? null,
      durationMin: card?.durationMin ?? p.content?.durationMin ?? null,
      version: p.version ?? null,
      stationIds: p.stationIds ?? [],
      publishedAt: p.publishedAt ?? null,
    })
  }
  return out
}

/** La formation : les instructions qui ont des questions, qui les a réussies, et l'Académie si l'usine l'a. */
export async function loadTraining(data: DataApi, withAcademy: boolean): Promise<TrainingFacts> {
  const [catalog, trainings, quals, ops] = await Promise.all([
    trainingCatalog(data),
    listTrainings(data, 5000),
    withAcademy ? listQualifications(data) : Promise.resolve(null),
    withAcademy ? listOperators(data) : Promise.resolve(null),
  ])
  return {
    catalog: new Map(catalog.map((d) => [d._id, { trainingVersion: d.json_data.trainingVersion ?? 0 }])),
    trainings: trainings.map((d) => d.json_data),
    qualifications: quals ? quals.map((d) => d.json_data) : null,
    due: quals && ops ? dueQualifications(latestQualifications(quals), ops, Date.now()).length : null,
  }
}

/** La bibliothèque, comptée au serveur (des milliers d'instructions ne se lisent pas). */
export async function loadLibrary(data: DataApi): Promise<LibraryFacts> {
  const [published, review, draft, renew] = await Promise.all([countPublished(data), countInstructions(data, { status: 'review' }, []), countInstructions(data, { status: 'draft' }, []), countInstructions(data, { status: 'renew' }, [])])
  return { published, review, draft, renew }
}
