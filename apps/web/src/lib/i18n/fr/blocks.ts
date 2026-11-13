const num = (n: number) => n.toLocaleString('fr-CA')
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)

/** Les blocs communs : des étapes rédigées une fois, réutilisées dans plusieurs instructions. */
export const blocks = {
  make: 'Faire un bloc commun',
  insert: 'Insérer un bloc commun',
  /** La fenêtre « Faire un bloc commun ». */
  makeIntro: 'Les étapes choisies deviennent un bloc : rédigé une fois, il se réutilise dans d’autres instructions et se met à jour partout.',
  name: 'Nom du bloc',
  namePlaceholder: 'Cadenasser la presse P-12',
  pick: 'Les étapes du bloc',
  makeConfirm: 'Faire le bloc',
  made: (title: string) => `Bloc « ${title} » créé`,
  madeHint: 'Ses étapes se modifient maintenant dans le bloc.',
  makeFailed: 'Le bloc n’a pas été créé',
  /** La fenêtre « Insérer un bloc commun ». */
  search: 'Chercher un bloc',
  empty: 'Aucun bloc commun pour l’instant',
  emptyHint: 'Faites-en un à partir des étapes d’une instruction (menu « … »).',
  already: 'Déjà dans cette instruction',
  inserted: (title: string) => `Bloc « ${title} » inséré`,
  insertFailed: 'Le bloc n’a pas été inséré',
  steps: (n: number) => `${num(n)} ${plural(n, 'étape', 'étapes')}`,
  /** Une étape d'un bloc, dans l'éditeur d'une instruction. */
  stepNotice: (title: string, version: number) => `Étape du bloc commun « ${title} » (v${num(version)}) : elle se modifie dans le bloc, partout à la fois.`,
  more: 'Autres actions du bloc',
  open: 'Ouvrir le bloc',
  detach: 'Détacher',
  detachConfirm: { title: 'Détacher ces étapes du bloc ?', description: 'Elles deviennent celles de cette instruction : vous pourrez les modifier ici, mais elles ne suivront plus le bloc.', confirm: 'Détacher' },
  remove: 'Retirer le bloc',
  removeConfirm: { title: 'Retirer le bloc de cette instruction ?', description: 'Ses étapes partent de cette instruction ; le bloc reste pour les autres.', confirm: 'Retirer' },
  thumb: 'Bloc',
  /** Un bloc, dans son propre éditeur. */
  chip: 'Bloc commun',
  editing: (n: number) => (n ? `Bloc commun utilisé dans ${num(n)} ${plural(n, 'instruction', 'instructions')} : sa publication les met à jour.` : 'Bloc commun : il n’est encore dans aucune instruction. Insérez-le depuis une instruction, menu « … ».'),
  info: 'Titre et infos',
  infoOpen: 'Modifier le titre et les infos',
  infoTitle: 'Infos du bloc',
  summaryPlaceholder: 'À quoi sert ce bloc, en une phrase',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Il quitte la liste des blocs. Ses versions restent conservées.'
      : n === 1
        ? 'L’instruction qui l’utilise garde ses étapes telles quelles ; pour les modifier, il faudra les y détacher.'
        : `Les ${num(n)} instructions qui l’utilisent gardent ses étapes telles quelles ; pour les modifier, il faudra les détacher dans chacune.`,
  archived: 'Bloc archivé',
  publishImpact: (n: number) => (n ? `La publication met à jour ${num(n)} ${plural(n, 'instruction', 'instructions')} : celles qui sont à jour sont republiées, les autres reçoivent le bloc dans leur brouillon.` : 'Aucune instruction ne l’utilise encore : insérez-le dans une instruction, menu « … ».'),
  propagating: (done: number, total: number) => `Mise à jour des instructions… ${num(done)} sur ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instruction republiée', 'instructions republiées')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'brouillon mis à jour', 'brouillons mis à jour')}` : ''].filter(Boolean).join(' · ') || 'Aucune instruction à mettre à jour',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instruction n’a pas été mise', 'instructions n’ont pas été mises')} à jour : republiez le bloc pour réessayer.`,
  /** La liste. */
  filter: 'Blocs communs',
  newBlock: 'Nouveau bloc',
  newTitle: 'Nouveau bloc commun',
  total: (n: number) => (n > 1 ? `${num(n)} blocs communs` : n === 1 ? '1 bloc commun' : 'Aucun bloc commun'),
  emptyList: 'Les étapes qui reviennent partout (cadenassage, démarrage, EPI) : rédigées une fois, à jour dans toutes les instructions. Créez-en un ici, ou à partir des étapes d’une instruction (menu « … »).',
  /** Le résumé de la version d'une instruction mise à jour par son bloc. */
  changelog: (title: string, version: number) => `Bloc commun « ${title} » v${num(version)}.`,
  errors: {
    noSteps: 'Choisissez au moins une étape.',
    locked: (title: string) => `Cette étape vient du bloc commun « ${title} » : elle se modifie dans le bloc.`,
  },
}
