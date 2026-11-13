/** L’accueil. */
export const home = {
  /** La salutation selon l’heure, avec le prénom. */
  greeting: {
    night: (name: string) => `Bonne nuit, ${name}`,
    morning: (name: string) => `Bonjour, ${name}`,
    afternoon: (name: string) => `Bon après-midi, ${name}`,
    evening: (name: string) => `Bonsoir, ${name}`,
  },
  /** La grande carte qui lance une nouvelle instruction. */
  hero: {
    eyebrow: 'Nouvelle instruction',
    line1: 'Filmez. Parlez.',
    line2: 'L’IA rédige.',
    video: 'Vidéo',
    voiceNote: 'Note vocale',
    document: 'PDF ou Word',
  },
  /** Ce que voit une personne qui lit sans rédiger. */
  reader: {
    find: 'Trouver une instruction',
    myStations: 'Mes postes',
  },
  setup: {
    title: 'Mettez votre usine en route',
    hint: 'Quelques minutes, une étape à la fois.',
    publish: 'Publier une première instruction',
    station: 'Créer un poste et son code QR',
    logo: 'Ajouter le logo de l’usine',
    invite: 'Inviter un collègue',
    standard: 'Ajuster votre standard de rédaction',
    hide: 'Masquer la mise en route',
    hideShort: 'Masquer',
    show: 'Afficher',
    compact: (done: number, total: number) => `Mise en route : ${done} sur ${total}`,
  },
  tiles: {
    published: 'Publiées',
    coverage: (percent: number) => `${percent.toLocaleString('fr-CA')} % des postes couverts`,
    noStation: 'Aucun poste encore',
    views: 'Consultations · 7 jours',
    viewsHint: 'Tablettes, codes QR et liens',
    stations: 'Postes',
    stationsHint: 'Avec leurs instructions',
    streak: 'Série',
    /** Sous le nombre de semaines, qui s’affiche en grand. */
    streakWeeks: (weeks: number) => `semaine${weeks > 1 ? 's' : ''} de suite avec une publication`,
    streakStart: 'Publiez cette semaine pour lancer votre série',
  },
  /** Les instructions qui arrivent à leur date de relecture. */
  renewal: {
    title: (count: number) => `À revoir (${count.toLocaleString('fr-CA')})`,
    hint: 'Elles arrivent à leur date de relecture. Rien n’a changé ? Confirmez-le d’un geste.',
  },
  review: {
    title: (count: number) => `À approuver (${count.toLocaleString('fr-CA')})`,
    hint: 'Les étapes modifiées sont marquées dans l’éditeur.',
  },
  feedback: {
    title: 'Retours des opérateurs',
    seeAll: 'Tout voir',
    quote: (comment: string) => `« ${comment} »`,
    /** L’étape visée (s’il y en a une) et le moment du retour. */
    when: (step: number | null, ago: string) => (step === null ? ago : `Étape ${step.toLocaleString('fr-CA')} · ${ago}`),
    none: 'Aucun retour à traiter.',
  },
  drafts: { title: 'Reprendre', hint: 'Vos brouillons en cours' },
  forYou: { title: 'Pour vous', hint: 'Selon vos responsabilités' },
  library: {
    count: (n: number) => `${n.toLocaleString('fr-CA')} ${n > 1 ? 'instructions publiées' : 'instruction publiée'}`,
    hint: 'Votre plancher a sa bibliothèque vivante. Gardez-la à jour avec les retours des opérateurs.',
  },
}
