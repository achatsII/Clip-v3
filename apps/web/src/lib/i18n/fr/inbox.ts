const num = (n: number) => n.toLocaleString('fr-CA')

/** « À voir » : ce qui attend la personne (toggle `notify`). */
export const inbox = {
  title: 'À voir',
  open: (n: number) => (n ? `À voir : ${num(n)} nouveau${n > 1 ? 'x' : ''}` : 'À voir'),
  empty: 'Rien à voir pour l’instant',
  emptyHint: 'Les approbations à faire, les dangers signalés et les écarts relevés arriveront ici.',
  kinds: {
    review: 'À approuver',
    changes: 'Changements demandés',
    danger: 'Danger signalé',
    deviation: 'Écart relevé',
    request: 'Demandé',
  },
  by: (name: string) => `par ${name}`,
  /** Une demande à l’administrateur : ce qui ouvrirait la fonction. */
  comesWith: (name: string) => `Avec ${name}`,
  isNew: 'Nouveau',
}
