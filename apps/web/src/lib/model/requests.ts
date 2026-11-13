/**
 * Les demandes à l'administrateur (conseiller d'achat, toggle `salesAdvisor`) : qui ne peut pas
 * acheter le dit en un geste, et l'administrateur le voit dans « À voir » (et par courriel ou sur
 * son téléphone si l'usine avertit). Une seule demande par personne et par fonction sur 30 jours.
 */
import type { DataApi, Doc } from '../gateway/data'
import { T } from './repo'
import type { UpgradeRequest } from './types'

/** Une demande se montre 30 jours, ou jusqu'à ce que l'usine ait la fonction. */
export const REQUEST_DAYS = 30

const sinceOf = (now: number) => new Date(now - REQUEST_DAYS * 86400_000).toISOString()

/** Les demandes des 30 derniers jours, la plus récente d'abord. */
export function recentRequests(data: DataApi, now = Date.now()): Promise<Doc<UpgradeRequest>[]> {
  return data.filter<UpgradeRequest>(T.request, { filter: { 'json_data.at': { $gte: sinceOf(now) } }, sort: { 'json_data.at': -1 }, limit: 100 })
}

/** Ma demande pour cette fonction, si je l'ai déjà faite ces 30 derniers jours. */
export async function myRequest(data: DataApi, userId: string, feature: string, now = Date.now()): Promise<Doc<UpgradeRequest> | null> {
  const [found] = await data.filter<UpgradeRequest>(T.request, {
    filter: { $and: [{ 'json_data.byId': { $eq: userId } }, { 'json_data.feature': { $eq: feature } }, { 'json_data.at': { $gte: sinceOf(now) } }] },
    limit: 1,
  })
  return found ?? null
}

/** Demande à l'administrateur ; `created` faux : la demande était déjà faite (rien n'est écrit). */
export async function askAdmin(data: DataApi, actor: { id: string; name: string }, feature: string, targetName: string | null, now = Date.now()): Promise<{ created: boolean }> {
  if (await myRequest(data, actor.id, feature, now)) return { created: false }
  await data.insert<UpgradeRequest>(T.request, { feature, targetName, byId: actor.id, byName: actor.name, at: new Date(now).toISOString() }, actor.name)
  return { created: true }
}
