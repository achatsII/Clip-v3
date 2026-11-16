const num = (n: number) => n.toLocaleString('fr-CA')

/** L’Académie (module) : qualifier chaque personne, poste par poste, et la garder qualifiée. */
export const academy = {
  views: { todo: 'À faire', matrix: 'Qualifications', paths: 'Parcours', coverage: 'Couverture par quart' },
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
    late: (station: string, date: string) => `${station} : formation prévue d’ici le ${date}`,
  },
  onlyDue: 'Ne montrer que les personnes à revalider',
  dueCount: (n: number) => (n ? `${num(n)} qualification${n > 1 ? 's' : ''} à revalider` : 'Toutes les qualifications sont à jour'),
  revalidateSaved: 'Règle de revalidation enregistrée',
  revalidateHint: 'S’applique aux prochaines validations.',
  noPath: 'Aucune instruction publiée à ce poste.',
  withoutQuestions: 'Sans questions',
  empty: 'Aucun poste n’a encore d’instruction publiée',
  emptyHint: 'Le parcours d’un poste, ce sont ses instructions publiées : publiez-en une à un poste.',
  /** Le guide : l’Académie en trois gestes (masquable, retenu sur l’appareil). */
  guide: {
    title: 'L’Académie en trois gestes',
    steps: [
      { title: 'Le parcours de chaque poste', text: 'Ce sont ses instructions publiées. Donnez-leur des questions : l’IA les prépare, vous les retouchez.' },
      { title: 'Qui doit être formé', text: 'Un poste, des personnes, une date. Les postes habituels de chacun comptent déjà.' },
      { title: 'Au poste, puis sur le terrain', text: 'La personne suit les instructions à la tablette et répond aux questions à la fin ; vous la validez en la voyant faire.' },
    ],
    pathsState: (n: number) => (n ? `${num(n)} instruction${n > 1 ? 's ont' : ' a'} des questions` : 'Aucune instruction n’a encore de questions'),
    peopleState: (n: number) => (n ? `${num(n)} à former` : 'Personne à former pour l’instant'),
    signedState: (n: number) => (n ? `${num(n)} validation${n > 1 ? 's' : ''} sur le terrain` : 'Aucune validation pour l’instant'),
    seePaths: 'Voir les parcours',
    hide: 'Compris',
    show: 'Comment ça marche',
  },
  /** Envoyer des personnes se former à un poste. */
  assign: {
    open: 'Former quelqu’un',
    title: 'Former quelqu’un',
    station: 'Au poste',
    pickStation: 'Choisissez un poste',
    people: 'Qui',
    due: 'D’ici le',
    noDue: 'Sans date',
    submit: (n: number) => (n > 1 ? `Former ces ${num(n)} personnes` : n ? 'Former cette personne' : 'Former'),
    done: (n: number, station: string) => `${num(n)} personne${n > 1 ? 's' : ''} à former au poste ${station}`,
    doneHint: 'Chacune paraît dans « À faire » jusqu’à sa validation sur le terrain.',
    failed: 'L’affectation n’a pas été enregistrée',
    qualified: 'Déjà qualifiée',
    noPeople: 'Ajoutez d’abord les personnes de l’équipe.',
  },
  /** « À faire » : chaque personne à former, la plus pressée d’abord. */
  todo: {
    empty: 'Personne à former',
    emptyHint: 'Dites qui doit être formé à quel poste : la liste suit chacun jusqu’à sa validation sur le terrain.',
    progress: (done: number, total: number) => `${num(done)} instruction${done > 1 ? 's' : ''} sur ${num(total)} répondue${done > 1 ? 's' : ''}`,
    noQuestions: 'Pas de questions à ce poste',
    ready: 'Prêt à valider',
    usual: 'Poste habituel',
    due: (date: string) => `D’ici le ${date}`,
    overdue: (date: string) => `En retard : prévu le ${date}`,
    validate: 'Valider',
    open: 'Voir',
  },
  /** Les parcours : chaque poste et ses instructions. */
  paths: {
    hint: 'Le parcours d’un poste, ce sont ses instructions publiées ; leurs questions se répondent au poste, à la fin. Touchez un poste pour voir ses instructions.',
    summary: (total: number, withQuestions: number) => `${num(total)} instruction${total > 1 ? 's' : ''} · ${num(withQuestions)} avec questions`,
    questions: (n: number) => `${num(n)} question${n > 1 ? 's' : ''}`,
    prepare: 'Préparer les questions',
    learners: (n: number) => `${num(n)} à former`,
  },
  /** Une personne à un poste : l’affectation. */
  cell: {
    assigned: (date: string | null) => (date ? `À former d’ici le ${date}` : 'À former'),
    usual: 'C’est un de ses postes habituels.',
    assign: 'Mettre à former',
    unassign: 'Retirer de « À faire »',
    assignedToast: 'Ajouté à « À faire »',
    removedToast: 'Retiré de « À faire »',
  },
  notRequired: 'Non attendu',
}
