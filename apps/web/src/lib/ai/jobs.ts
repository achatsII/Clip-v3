/**
 * Les générations en cours, hors des composants : une génération lancée va au bout et
 * s'enregistre même si l'on quitte l'écran (tant que l'onglet reste ouvert).
 */
export type JobState =
  | { status: 'running'; stage: string; detail?: string; startedAt: number }
  | { status: 'done'; finishedAt: number }
  | { status: 'error'; message: string }

const jobs = new Map<string, JobState>()
const listeners = new Set<() => void>()
/** Les instructions générées dans cet onglet : leur fin ne s'annonce pas comme venue d'ailleurs. */
const here = new Set<string>()

export function ranHere(id: string): boolean {
  return here.has(id)
}

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeJobs(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function jobOf(id: string): JobState | undefined {
  return jobs.get(id)
}

export function runJob(id: string, fn: (setStage: (stage: string, detail?: string) => void) => Promise<void>): Promise<void> {
  const current = jobs.get(id)
  if (current?.status === 'running') return Promise.resolve()
  const startedAt = Date.now()
  here.add(id)
  jobs.set(id, { status: 'running', stage: 'prepare', startedAt })
  emit()
  return fn((stage, detail) => {
    jobs.set(id, { status: 'running', stage, detail, startedAt })
    emit()
  })
    .then(() => {
      jobs.set(id, { status: 'done', finishedAt: Date.now() })
      emit()
    })
    .catch((e: unknown) => {
      jobs.set(id, { status: 'error', message: e instanceof Error ? e.message : 'La génération a échoué.' })
      emit()
    })
}

export function clearJob(id: string) {
  jobs.delete(id)
  emit()
}
