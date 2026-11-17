/**
 * Une réponse de l'IA qui continue quand l'app quitte l'écran (toggle `backgroundAi`). Sur un
 * téléphone, iOS suspend l'app quelques secondes après qu'elle passe en arrière-plan, et coupe la
 * requête en cours : la réponse de l'assistant était perdue. La demande part donc au serveur, par
 * le même chemin que la génération au serveur (Job_start, branche clip-v2 : il roule la requête
 * AskAI v4 telle quelle et écrit le résultat et son coût dans `clip_job`). L'app relit ce travail
 * toutes les 2 secondes tant qu'elle est à l'écran, et aussitôt qu'elle y revient ; le coût réel se
 * débite avec la clé du travail, une seule fois (`jobDebitKey`).
 *
 * Si le serveur ne prend pas la demande (refus, ou pas prise en 45 secondes), elle part comme avant,
 * sur l'appareil. Une demande arrêtée par la personne est quand même suivie jusqu'au bout, sans rien
 * appliquer, pour débiter ce que le serveur a vraiment coûté.
 */
import { inNativeShell } from '../bridge/native'
import { jobDebitKey, type AiApi, type AiOperation, type AskBody, type AskResult } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { messages } from '../i18n'
import type { DataApi } from '../gateway/data'
import { T } from '../model/repo'
import type { ServerJob } from '../model/types'
import { jobOutcome } from './serverJob'

/** Tant que l'app est à l'écran, le travail se relit toutes les 2 secondes. */
export const DURABLE_POLL_MS = 2_000
/** Un travail que le serveur n'a pas pris en 45 secondes : la demande part sur l'appareil. */
export const DURABLE_PICKUP_MS = 45_000
/** Une demande arrêtée se suit au plus 30 minutes, pour son coût. */
const SETTLE_LIMIT_MS = 30 * 60_000

const isRefusal = (e: unknown) => e instanceof ApiError && (e.status === 402 || e.status === 403 || e.code === 'insufficient_credits' || e.code === 'not_entitled')

/**
 * Un appareil que l'arrière-plan suspend : l'app (iPhone, iPad, Android), ou Safari sur iPhone et
 * iPad. Au bureau, un onglet caché continue ses requêtes : rien à changer.
 */
export function suspendsInBackground(): boolean {
  if (inNativeShell()) return true
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * La génération part-elle au serveur ? Le choix de l'usine d'abord (Réglages › Usine) ; sans choix,
 * au serveur sur un appareil que l'arrière-plan suspend (toggle `backgroundAi`), sur l'appareil ailleurs.
 */
export function generatesOnServer(choice: boolean | undefined, serverToggle: boolean, backgroundAi: boolean): boolean {
  if (!serverToggle) return false
  if (choice !== undefined) return choice
  return backgroundAi && suspendsInBackground()
}

/** Attend `ms`, ou moins : le retour de l'app à l'écran (ses minuteries ont pu dormir) ou un arrêt. */
function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
    const done = () => {
      clearTimeout(timer)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    const onVisibility = () => visible() && done()
    const timer = setTimeout(done, ms)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    signal?.addEventListener('abort', done)
  })
}

type Deps = { ai: Pick<AiApi, 'ask' | 'startJob' | 'chargeCost'>; data: Pick<DataApi, 'get' | 'patch'> }

const abortError = () => new DOMException('Aborted', 'AbortError')

export async function durableAsk<T>(deps: Deps, operation: AiOperation, ask: AskBody, opts: { instructionId: string; scope?: string; timeoutMs?: number; signal?: AbortSignal; pollMs?: number; now?: () => number }): Promise<AskResult<T>> {
  const now = opts.now ?? Date.now
  const direct = () => deps.ai.ask<T>(operation, ask, { scope: opts.scope, timeoutMs: opts.timeoutMs, signal: opts.signal })
  let jobId: string
  try {
    jobId = await deps.ai.startJob({ operation, instructionId: opts.instructionId, ask })
  } catch (e) {
    // Un refus de facturation se montre tel quel ; un serveur qui ne prend pas la demande la laisse ici.
    if (isRefusal(e)) throw e
    return direct()
  }
  const started = now()
  const finalize = () => void deps.data.patch(T.serverJob, jobId, { finalizedAt: new Date(now()).toISOString() }).catch(() => undefined)
  for (;;) {
    if (opts.signal?.aborted) {
      void settleLater(deps, operation, jobId, opts.pollMs, now)
      throw abortError()
    }
    // Une lecture ratée (réseau au retour de l'arrière-plan) se refait au tour suivant.
    const doc = await deps.data.get<ServerJob>(T.serverJob, jobId).then(
      (d) => d,
      () => undefined,
    )
    if (doc !== undefined) {
      const out = jobOutcome(doc?.json_data ?? null, now())
      if (out.kind === 'completed') {
        const charged = await deps.ai.chargeCost(operation, out.costCad, jobDebitKey(operation, jobId), { model: out.model, ok: true })
        finalize()
        return { text: '', json: (out.json ?? null) as T | null, model: out.model, usage: null, charged }
      }
      if (out.kind === 'failed') {
        if (out.costCad !== null) await deps.ai.chargeCost(operation, out.costCad, jobDebitKey(operation, jobId), { model: null, ok: false })
        finalize()
        // Jamais pris (ou perdu) : la demande part comme avant ; une vraie erreur de l'IA se dit.
        if (out.reason !== 'error') return direct()
        throw new ApiError(out.message, 502)
      }
      // Déjà terminé ailleurs (ne devrait pas arriver : ce travail n'appartient qu'à cette demande).
      if (out.kind === 'done') throw new ApiError(messages().capture.progress.serverLost, 502)
      // Pas encore pris par le serveur : on n'attend pas les 3 minutes de la génération.
      if (doc?.json_data.stage === 'start' && now() - started > DURABLE_PICKUP_MS) {
        finalize()
        return direct()
      }
    }
    await pause(opts.pollMs ?? DURABLE_POLL_MS, opts.signal)
  }
}

/** Une demande arrêtée : on suit son travail jusqu'au bout, sans rien appliquer, pour en débiter le coût. */
async function settleLater(deps: Deps, operation: AiOperation, jobId: string, pollMs = DURABLE_POLL_MS, now: () => number = Date.now) {
  const until = now() + SETTLE_LIMIT_MS
  while (now() < until) {
    const doc = await deps.data.get<ServerJob>(T.serverJob, jobId).catch(() => undefined)
    if (doc !== undefined) {
      const out = jobOutcome(doc?.json_data ?? null, now())
      if (out.kind === 'completed' || out.kind === 'failed') {
        if (out.costCad !== null) await deps.ai.chargeCost(operation, out.costCad, jobDebitKey(operation, jobId), { model: out.kind === 'completed' ? out.model : null, ok: out.kind === 'completed' }).catch(() => undefined)
        void deps.data.patch(T.serverJob, jobId, { finalizedAt: new Date(now()).toISOString() }).catch(() => undefined)
        return
      }
      if (out.kind === 'done') return
    }
    await pause(Math.max(pollMs, 5_000))
  }
}
