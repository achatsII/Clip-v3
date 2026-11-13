const num = (n: number) => n.toLocaleString('fr-CA')

/** L’Académie (module) : qualifier chaque personne, poste par poste, et la garder qualifiée. */
export const academy = {
  views: { matrix: 'Qualifications', coverage: 'Couverture par quart' },
  /** L’état d’une personne à un poste. */
  levels: { none: 'Pas formé', learning: 'En formation', qualified: 'Qualifié', trainer: 'Peut former', expired: 'À revalider' },
  /** Une signature du registre. */
  signatures: { qualified: 'Qualifié', trainer: 'Peut former', none: 'Qualification retirée' },
  dueSoon: (date: string) => `À revalider avant le ${date}`,
  dueSoonLegend: 'À revalider bientôt',
  validUntil: (date: string) => `Valide jusqu’au ${date}`,
  expiredOn: (date: string) => `Échue le ${date}`,
  noExpiry: 'Sans échéance',
  signedBy: (who: string, date: string) => `Validé sur le terrain par ${who}, le ${date}`,
  retrain: 'Une instruction du poste a changé : sa formation est à refaire.',
  cellLabel: (person: string, station: string, level: string) => `${person}, ${station} : ${level}`,
  /** Le parcours du poste. */
  path: 'Le parcours du poste',
  pathHint: 'Les instructions publiées à ce poste. Leurs questions se valident au poste, à la fin.',
  noQuestions: 'Aucune question à ce poste : la validation se fait sur le terrain.',
  questions: (done: number, total: number) => `${num(done)} sur ${num(total)} validées`,
  /** Valider sur le terrain. */
  signTitle: 'Valider sur le terrain',
  signHint: 'Vous l’avez vu tenir ce poste : il peut le faire seul.',
  asQualified: 'Qualifié',
  asTrainer: 'Peut former',
  note: 'Note (facultatif)',
  notePlaceholder: 'Observé pendant le quart de jour',
  sign: 'Valider',
  revalidate: 'Revalider',
  signed: 'Validation enregistrée',
  signFailed: 'La validation n’a pas été enregistrée',
  revoke: 'Retirer la qualification',
  revokeConfirm: {
    title: 'Retirer la qualification ?',
    description: 'Elle reste au registre, avec la date et votre nom. La personne devra être validée de nouveau.',
    confirm: 'Retirer',
  },
  revoked: 'Qualification retirée',
  /** La couverture par quart. */
  coverageHint: 'Combien de personnes qualifiées tiennent chaque poste, quart par quart. Touchez une case pour voir qui.',
  shifts: { jour: 'Jour', soir: 'Soir', nuit: 'Nuit', fds: 'Fin de semaine', rotation: 'Rotation', none: 'Sans quart' },
  tones: { none: 'Personne', fragile: 'Une seule personne', ok: 'Au moins deux' },
  coverTitle: (station: string, shift: string) => `${station} · ${shift}`,
  nobody: 'Personne n’est qualifié à ce poste pour ce quart.',
  /** Le réglage de la revalidation. */
  revalidateEvery: 'Revalider',
  every: (months: number) => (months ? `tous les ${num(months)} mois` : 'jamais'),
  /** Le registre et l’attestation. */
  register: 'Registre (CSV)',
  registerHead: ['Personne', 'Poste', 'Niveau', 'Validé par', 'Le', 'Valide jusqu’au', 'Questions validées', 'Questions du poste', 'Note'],
  registerFile: (date: string) => `registre-qualifications-${date}.csv`,
  registerEmpty: 'Aucune validation au registre pour l’instant.',
  attestation: 'Imprimer l’attestation',
  attestationTitle: 'Attestation de qualification',
  attestationIntro: (org: string, person: string) => `${org} atteste que ${person} a été validé sur le terrain aux postes suivants.`,
  attestationHead: ['Poste', 'Niveau', 'Validé par', 'Le', 'Valide jusqu’au'],
  attestationNone: 'Aucune qualification en cours.',
  printedOn: (date: string) => `Imprimée le ${date}`,
  print: 'Imprimer',
  signature: 'Signature du responsable',
  /** Une personne (sa ligne). */
  personTitle: (name: string) => name,
  qualifiedAt: (n: number) => (n ? `Qualifié à ${num(n)} poste${n > 1 ? 's' : ''}` : 'Pas encore qualifié'),
  /** Sans le module : l’invitation à l’essayer. */
  teaser: {
    title: 'Allez plus loin avec l’Académie',
    text: 'Validation sur le terrain, revalidation avant l’échéance, couverture par quart et registre pour l’audit.',
    cta: 'Voir l’offre',
  },
  /** « À voir » : les qualifications à revalider. */
  inbox: {
    kind: 'À revalider',
    due: (station: string, date: string) => `${station} : avant le ${date}`,
    expired: (station: string, date: string) => `${station} : échue le ${date}`,
  },
  dueCount: (n: number) => (n ? `${num(n)} qualification${n > 1 ? 's' : ''} à revalider` : 'Toutes les qualifications sont à jour'),
  revalidateSaved: 'Règle de revalidation enregistrée',
  revalidateHint: 'S’applique aux prochaines validations.',
  noPath: 'Aucune instruction publiée à ce poste.',
  withoutQuestions: 'Sans questions',
  empty: 'Aucun poste n’a encore d’instruction publiée',
  emptyHint: 'Le parcours d’un poste, ce sont ses instructions publiées : publiez-en une à un poste.',
}
