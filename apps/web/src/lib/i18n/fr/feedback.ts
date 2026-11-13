/** Les retours des opérateurs. */
export const feedback = {
  /** La liste des retours à traiter. */
  list: {
    search: 'Chercher une instruction, un mot, une personne, un poste',
    title: 'Retours des opérateurs',
    subtitle: 'Ce que le plancher signale : corrigez l’étape en un geste, l’opérateur verra la nouvelle version.',
    open: (n: number) => `À traiter${n ? ` (${n.toLocaleString('fr-CA')})` : ''}`,
    handled: 'Traités',
    all: 'Tous',
    emptyOpenTitle: 'Rien à traiter',
    emptyOpenDescription: 'Les opérateurs signalent une étape pas claire depuis le lecteur, en deux touchers. Leurs retours arriveront ici.',
    emptyHandledTitle: 'Aucun retour traité',
    emptyHandledDescription: 'Les retours que vous traitez s’affichent ici.',
    untitled: 'Instruction',
    step: (n: number) => `étape ${n.toLocaleString('fr-CA')}`,
    comment: (text: string) => `« ${text} »`,
    operator: 'Opérateur',
    station: 'poste',
    /** D'où vient le retour. */
    sources: { kiosk: 'tablette', link: 'lien', app: 'app' },
    photo: 'Photo jointe',
    fix: 'Corriger',
    markHandled: 'Traité',
    dismiss: 'Écarter',
    /** La mention gardée sur le retour, dans la langue de la personne qui le traite. */
    handledBy: (name: string) => `Traité par ${name}`,
    dismissedBy: (name: string) => `Écarté par ${name}`,
    markedHandled: 'Retour marqué comme traité',
    dismissed: 'Retour écarté',
    updateFailed: 'Le retour n’a pas été mis à jour',
  },
}
