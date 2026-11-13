/** La liste des instructions, les cartes, la création et le suivi des créations. */
export const instructions = {
  /** La bibliothèque des instructions. */
  list: {
    title: 'Instructions',
    count: (shown: number, total: number) => `${shown.toLocaleString('fr-CA')} sur ${total.toLocaleString('fr-CA')}`,
    total: (n: number) => (n > 1 ? `${n.toLocaleString('fr-CA')} instructions` : n === 1 ? '1 instruction' : 'Aucune instruction'),
    import: 'Importer',
    new: 'Nouvelle',
    searchPlaceholder: 'Chercher un titre, un numéro, un poste, un mot d’une étape…',
    search: 'Chercher',
    searchByVoice: 'Chercher en parlant',
    clear: 'Effacer',
    scope: { mine: 'Pour moi', all: 'Tout' },
    filters: { all: 'Toutes', published: 'Publiées', draft: 'Brouillons', review: 'À approuver', renew: 'À revoir' },
    tiles: 'Tuiles',
    rows: 'Liste',
    emptyTitle: 'Créez votre première instruction',
    emptyText: 'Filmez un expert qui montre la tâche, ajoutez une note vocale : l’IA rédige les étapes en quelques minutes.',
    newInstruction: 'Nouvelle instruction',
    noMatchTitle: 'Rien ne correspond',
    noMatchText: 'Essayez un autre mot, ou retirez un filtre.',
    showAll: 'Tout afficher',
    more: 'Voir plus',
    loadingMore: 'Chargement…',
    /** « Où ? » : un secteur (les postes regroupés) ou un poste. */
    place: {
      all: 'Tous les lieux',
      title: 'Où ?',
      search: 'Chercher un secteur ou un poste',
      everywhere: 'Partout',
      sector: (n: number) => `${n.toLocaleString('fr-CA')} poste${n > 1 ? 's' : ''}`,
      noSector: 'Sans secteur',
      none: 'Aucun secteur ni poste ne correspond.',
    },
  },
  /** Les tuiles et les lignes de la bibliothèque. */
  /** La relecture périodique : « à revoir dans 1 an ». */
  renewal: {
    choice: (months: number | null) => (months === null ? 'Jamais' : months === 12 ? '1 an' : months === 24 ? '2 ans' : `${months.toLocaleString('fr-CA')} mois`),
    soon: 'À revoir',
    late: 'Révision en retard',
  },
  card: {
    lockout: 'Cadenassage',
    noStation: 'Aucun poste',
    steps: (n: number) => `${n.toLocaleString('fr-CA')} étape${n > 1 ? 's' : ''}`,
  },
  /** La pastille d'état d'une instruction. */
  status: {
    creating: 'En création',
    interrupted: 'Interrompue',
    review: 'À approuver',
    empty: 'Vide',
    toGenerate: 'À générer',
    edited: (version: number) => `v${version.toLocaleString('fr-CA')} · modifiée`,
    published: (version: number) => `Publiée · v${version.toLocaleString('fr-CA')}`,
    draft: 'Brouillon',
  },
  /** Les instructions en création, sur cet appareil ou un autre. `from` : « lancée depuis l’app mobile par Mélanie ». */
  creations: {
    title: 'En création',
    hint: 'Elles s’ouvrent dès qu’elles sont prêtes.',
    inProgress: 'En cours',
    running: (stage: string, from: string, ago: string) => `${stage} · ${from} ${ago}`,
    interrupted: 'Interrompue : l’appareil qui la créait ne répond plus',
    /** Celles qui viennent d'être créées : elles restent à l'accueil jusqu'à ce qu'on les ouvre. */
    readyTitle: 'Viennent d’être créées',
    readyHint: 'Ouvrez-les pour les relire et les publier.',
    ready: (ago: string, steps: number) => `Créée ${ago}${steps ? ` · ${steps.toLocaleString('fr-CA')} étape${steps > 1 ? 's' : ''}` : ''}`,
    readyChip: 'Prête',
    dismiss: (title: string) => `Ne plus proposer « ${title} » ici`,
    dismissShort: 'Ne plus proposer',
  },
  /** L'annonce d'une création finie sur un autre appareil. */
  watcher: {
    untitled: 'L’instruction',
    failed: (title: string) => `« ${title} » n’a pas pu être créée`,
    ready: (title: string) => `« ${title} » est prête`,
    readyText: 'Créée sur un autre appareil.',
  },
  /** La page d'une instruction. `from` : « lancée depuis l’app mobile par Mélanie ». */
  detail: {
    notFoundTitle: 'Instruction introuvable',
    notFoundText: 'Elle a peut-être été archivée, ou le lien est incomplet.',
    seeAll: 'Voir les instructions',
    back: 'Instructions',
    completeTitle: 'Compléter les médias',
    completeSubtitle: 'Ajoutez ce qui manque, puis lancez la génération.',
    newVersion: (from: string) => `Une nouvelle version est en création (${from}) : elle remplacera ce brouillon dès qu’elle sera prête.`,
  },
  /** Une création dont l'appareil ne répond plus. `from` : « Lancée depuis l’app mobile par Mélanie ». */
  interrupted: {
    title: 'La création s’est interrompue',
    text: (from: string) => `${from}, mais l’appareil ne répond plus : l’app a sans doute été fermée, ou le téléphone s’est mis en veille.`,
    kept: 'Vos médias sont gardés : rien n’est perdu.',
    reviewMedia: 'Revoir les médias',
    relaunch: 'Relancer la création ici',
  },
  /** Le lecteur ouvert depuis l'app. */
  read: {
    notPublishedTitle: 'Pas encore publiée',
    notPublishedText: 'Les opérateurs verront cette instruction une fois publiée. Vous pouvez la prévisualiser.',
    previewDraft: 'Prévisualiser le brouillon',
    backToEditor: 'Retour à l’éditeur',
  },
  /** L'aperçu avant impression. */
  printPreview: {
    hint: 'Aperçu du PDF — choisissez « Enregistrer en PDF » dans la fenêtre d’impression.',
    print: 'Imprimer ou enregistrer en PDF',
    frame: 'Aperçu du PDF',
  },
  /**
   * Le document imprimé (PDF), dans la langue de l'instruction. Les titres que le lecteur des
   * opérateurs a déjà (EPI, outils, mises en garde, énergies…) viennent de ses propres mots.
   * Les noms insérés arrivent déjà échappés pour le HTML.
   */
  print: {
    /** La langue du document. */
    locale: 'fr-CA',
    date: (iso: string) => new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }),
    today: () => new Date().toLocaleDateString('fr-CA'),
    draft: 'Brouillon — non publié',
    version: (n: number, date: string) => `Version ${n.toLocaleString('fr-CA')} du ${date}`,
    printedOn: (date: string) => `Imprimé le ${date}`,
    approvedBy: (name: string) => `Approuvée par ${name}`,
    stations: (names: string) => `Poste : ${names}`,
    minutes: (n: number) => `${n.toLocaleString('fr-CA')} min`,
    upToDate: 'Version à jour',
    liveUrl: (url: string) => `Version à jour : ${url}`,
    mayBeStale: 'Toute copie imprimée peut être périmée : vérifiez la version dans l’app.',
    madeWithClip: 'Créé avec CLIP',
    videoClip: '▶ extrait vidéo dans l’app',
    visual: '◇ Schéma interactif',
    visualHint: 'à voir dans l’app',
    warning: (label: string) => `${label} :`,
    tag: 'Repère',
    energy: 'Énergie',
    isolationDevice: 'Dispositif d’isolement',
    verification: 'Vérification',
    material: 'Matériel :',
    restart: 'Retrait des cadenas et remise en marche',
  },
  /** Une nouvelle instruction. */
  create: {
    readOnly: 'Votre rôle permet de consulter les instructions, pas d’en créer.',
    title: 'Nouvelle instruction',
    subtitle: 'Montrez et expliquez comme à un nouvel employé. L’IA s’occupe de la rédaction.',
  },
  /** Les médias d'une étape : dispositions, verdicts et noms courts. */
  media: {
    layouts: {
      focus: { label: 'Un à la fois', hint: 'Un grand média, les autres au choix' },
      compare: { label: 'À faire / À éviter', hint: 'Deux médias côte à côte' },
      grid: { label: 'Grille', hint: 'Tous les médias en même temps' },
    },
    verdicts: { do: 'À faire', dont: 'À éviter' },
    clip: 'Extrait',
    page: (n: number) => `Page ${n.toLocaleString('fr-CA')}`,
    visual: 'Schéma',
    image: 'Image',
    illustration: 'Illustration',
    photo: 'Photo',
  },
  /** Le résumé des changements d'une version, écrit à la publication. */
  changes: {
    first: 'Première version.',
    title: 'titre modifié',
    edited: (n: number) => `${n.toLocaleString('fr-CA')} étape${n > 1 ? 's' : ''} modifiée${n > 1 ? 's' : ''}`,
    added: (n: number) => `${n.toLocaleString('fr-CA')} étape${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`,
    removed: (n: number) => `${n.toLocaleString('fr-CA')} étape${n > 1 ? 's' : ''} retirée${n > 1 ? 's' : ''}`,
    ppe: 'EPI modifiés',
    safety: 'mises en garde modifiées',
    lockout: 'points de cadenassage modifiés',
    quiz: 'questions de formation modifiées',
    formatting: 'Mise en forme.',
    /** Les changements à la suite, en une phrase. */
    sentence: (parts: string[]) => {
      const text = parts.join(', ')
      return text.charAt(0).toUpperCase() + text.slice(1) + '.'
    },
  },
  /** Ce qui s'écrit par défaut dans un document neuf : titre, copie, nom de l'usine, standard de rédaction. */
  defaults: {
    title: 'Nouvelle instruction',
    copy: (title: string) => `${title} (copie)`,
    orgName: 'Mon usine',
    rules: [
      'Une seule action par étape, qui commence par un verbe à l’infinitif.',
      'Des mots simples et courts ; un terme technique est expliqué la première fois.',
      'Une mise en garde apparaît à l’étape où le danger se présente, pas seulement au début.',
      'Chaque point clé dit pourquoi il compte : sécurité, qualité ou efficacité.',
      'Les valeurs exactes (couple, température, quantité, pression) sont écrites avec leur unité.',
    ],
  },
  errors: {
    publishWithoutSteps: 'Une instruction publiée a au moins une étape.',
  },
}
