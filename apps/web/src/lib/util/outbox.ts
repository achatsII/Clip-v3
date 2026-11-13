/**
 * Ce qui doit s'écrire même sans réseau (le travail fait, une formation validée) : on essaie tout
 * de suite ; sinon, ça attend dans l'appareil et repart à la prochaine occasion. Au plus `max`
 * éléments, gardés `keepMs` ; une seule reprise à la fois.
 */
export interface Outbox<T, C> {
  /** Écrit l'élément ; s'il ne part pas, il attend dans l'appareil. */
  save: (item: T, ctx: C) => Promise<'saved' | 'queued'>
  /** Renvoie ce qui attend ; rend le nombre parti. */
  flush: (ctx: C) => Promise<number>
  /** Le nombre d'éléments qui attendent. */
  pending: () => number
}

/** `C` : ce qu'il faut pour écrire (le client de la page), donné à chaque appel. */
export function outbox<T, C>(opts: { storageKey: string; send: (item: T, ctx: C) => Promise<unknown>; at: (item: T) => string; keyOf: (item: T) => string; max?: number; keepMs?: number }): Outbox<T, C> {
  const max = opts.max ?? 50
  const keepMs = opts.keepMs ?? 30 * 86400_000

  function read(): T[] {
    try {
      const raw = JSON.parse(localStorage.getItem(opts.storageKey) ?? '[]') as unknown
      return Array.isArray(raw) ? (raw as T[]) : []
    } catch {
      return []
    }
  }

  function write(list: T[], now = Date.now()) {
    try {
      const kept = list.filter((x) => now - Date.parse(opts.at(x)) < keepMs).slice(-max)
      if (kept.length) localStorage.setItem(opts.storageKey, JSON.stringify(kept))
      else localStorage.removeItem(opts.storageKey)
    } catch {
      /* sans stockage, rien ne peut attendre */
    }
  }

  let flushing: Promise<number> | null = null

  return {
    async save(item, ctx) {
      try {
        await opts.send(item, ctx)
        return 'saved'
      } catch {
        write([...read(), item])
        return 'queued'
      }
    },
    flush(ctx) {
      if (flushing) return flushing
      flushing = (async () => {
        const sent = new Set<string>()
        for (const x of read()) {
          try {
            await opts.send(x, ctx)
            sent.add(opts.keyOf(x))
          } catch {
            /* il attend la prochaine fois */
          }
        }
        // Relue à la fin : ce qui s'est ajouté pendant l'envoi reste dans la file.
        if (sent.size) write(read().filter((x) => !sent.has(opts.keyOf(x))))
        return sent.size
      })().finally(() => {
        flushing = null
      })
      return flushing
    },
    pending: () => read().length,
  }
}
