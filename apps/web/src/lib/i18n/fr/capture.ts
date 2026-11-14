/** La capture des médias et la génération. */
export const capture = {
  /** L'écran de capture : les gestes, les notes, le lancement de la génération. */
  board: {
    recoveredMany: (n: number) => `${n.toLocaleString('fr-CA')} médias choisis sur le téléphone n’ont pas été ajoutés : la page s’est rechargée pendant leur préparation.`,
    recoveredOne: (kind: 'video' | 'photo' | 'audio' | 'document', name: string) =>
      `${{ video: 'La vidéo', photo: 'La photo', audio: 'La note vocale', document: 'Le document' }[kind]} « ${name} » n’a pas été ajouté${kind === 'document' ? '' : 'e'} : la page s’est rechargée pendant sa préparation.`,
    ignore: 'Ignorer',
    intent: 'De quoi s’agit-il ?',
    optional: '(facultatif)',
    intentPlaceholder: 'Ex. : nettoyage des rails de la machine 1234, une fois par mois',
    actions: {
      video: { label: 'Vidéo', hint: 'Filmez le geste' },
      photo: { label: 'Photos', hint: 'Pièces, réglages' },
      audio: { label: 'Note vocale', hint: 'Expliquez à voix haute' },
      note: { label: 'Note', hint: 'Une précision écrite' },
      file: { label: 'Fichiers', hint: 'PDF, Word, vidéos' },
    },
    dropHint: 'Vous pouvez aussi glisser des fichiers ici : vidéos d’une autre caméra, photos, anciennes instructions en PDF ou Word.',
    notes: 'Vos notes',
    options: 'Options',
    auto: 'Automatique',
    autoHint: 'L’IA choisit le format',
    procedureHint: 'Étape par étape',
    lockoutHint: 'Énergies et isolement',
    empty: 'Ajoutez une vidéo, des photos ou une note pour commencer.',
    uploading: 'Envoi en cours… vous pouvez continuer à capturer.',
    tooBig: 'C’est beaucoup pour une seule instruction : séparez-la en plusieurs.',
    ready: (n: number) => `${n.toLocaleString('fr-CA')} note${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''}. L’IA va les analyser.`,
    generate: 'Générer l’instruction',
    dropFiles: 'Déposez vos fichiers',
    noteTitle: 'Note écrite',
    addNote: 'Ajouter la note',
    notePlaceholder: 'Ex. : serrer à 25 N·m ; toujours vérifier le niveau d’huile avant.',
    pickTitle: 'Importer',
    pickMedia: 'Photos et vidéos',
    pickMediaHint: 'De la galerie du téléphone (réduites automatiquement)',
    pickDocs: 'Documents',
    pickDocsHint: 'PDF ou Word',
    phoneMedia: 'Photos et vidéos du téléphone',
    phoneDocs: 'Documents du téléphone',
    denied: 'Accès refusé',
    deniedText: 'Autorisez la caméra et le micro dans les réglages du téléphone.',
    captureFailed: 'La capture n’a pas pu s’ouvrir',
    tooLarge: 'Fichier trop lourd',
    galleryFailed: 'La galerie n’a pas pu s’ouvrir',
    filesFailed: 'Les fichiers n’ont pas pu s’ouvrir',
    notSaved: 'Les médias ne sont pas encore enregistrés',
    notSavedText: 'Réessayez dans un instant.',
  },
  /** La note vocale enregistrée dans le navigateur. */
  recorder: {
    title: 'Note vocale',
    noMic: 'Le micro n’est pas accessible. Autorisez-le dans le navigateur.',
    explain: 'Expliquez à voix haute : les gestes, les pièges, les valeurs à respecter.',
    stop: 'Arrêter et garder',
    start: 'Commencer',
    tapToStop: 'Touchez pour arrêter et garder',
    tapToStart: 'Touchez pour commencer',
    /** Le début du nom du fichier, montré sur la carte de la note. */
    fileName: 'note-vocale',
  },
  /** La caméra du navigateur. */
  camera: {
    noCamera: 'La caméra n’est pas accessible. Autorisez-la dans le navigateur, ou importez un fichier.',
    takePhotos: 'Prendre des photos',
    film: 'Filmer',
    photo: 'Photo',
    video: 'Vidéo',
    switchCamera: 'Changer de caméra',
    videoHint: (maxMinutes: number) => `720p · environ 19 Mo la minute · ${maxMinutes.toLocaleString('fr-CA')} min au plus`,
    takePhoto: 'Prendre la photo',
    stop: 'Arrêter',
  },
  /** Les cartes des médias capturés et des envois en cours. */
  source: {
    stages: {
      import: 'Préparation sur le téléphone (téléchargement d’iCloud au besoin)…',
      prepare: 'Préparation…',
      upload: 'Envoi…',
      optimize: 'Optimisation de la vidéo…',
      transcribe: 'Transcription…',
      convert: 'Conversion en PDF…',
      error: 'Échec',
    },
    kinds: { photo: 'Photo', video: 'Vidéo', audio: 'Note vocale', note: 'Note', document: 'Document' },
    pages: (n: number) => `${n.toLocaleString('fr-CA')} page${n > 1 ? 's' : ''}`,
    writtenNote: 'Note écrite',
    quote: (text: string) => `« ${text} »`,
    noTranscript: 'Sans transcription : l’IA écoutera l’enregistrement.',
    percent: (n: number) => `${n.toLocaleString('fr-CA')} %`,
  },
  /** La génération en cours, ici ou sur un autre appareil. */
  /** Les médias déjà pris : ceux des instructions précédentes, à reprendre. */
  library: {
    open: 'Médias déjà pris',
    title: 'Médias déjà pris',
    intro: 'Reprenez des vidéos, photos, notes et documents de vos instructions précédentes. Rien n’est téléversé de nouveau.',
    search: 'Chercher une instruction, un fichier, un mot',
    kinds: { all: 'Tout', video: 'Vidéos', photo: 'Photos', audio: 'Notes vocales', note: 'Notes', document: 'Documents' },
    empty: 'Aucun média pour l’instant : ceux de vos instructions apparaîtront ici.',
    noMatch: 'Rien ne correspond. Essayez un autre mot ou un autre type.',
    add: (n: number) => (n ? `Ajouter ${n.toLocaleString('fr-CA')} média${n > 1 ? 's' : ''}` : 'Ajouter'),
    added: (n: number) => `${n.toLocaleString('fr-CA')} média${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`,
    pages: (n: number) => `${n.toLocaleString('fr-CA')} page${n > 1 ? 's' : ''}`,
    already: 'Ces médias sont déjà dans cette capture.',
    selected: 'Choisi',
  },
  /** Le choix des annotations automatiques, dans les options de génération. */
  autoAnnotate: {
    label: 'Annoter les images automatiquement',
    hint: 'L’IA encercle ce qu’il faut regarder sur chaque image figée ou photo qui en a besoin, sur l’image elle-même. Jamais sur un extrait vidéo.',
  },
  progress: {
    /** Les étapes : leur clé s'écrit dans l'instruction, leur libellé se lit sur chaque appareil. */
    stages: {
      prepare: 'Préparation des médias',
      analyze: 'L’IA regarde et écoute vos notes',
      finish: 'Mise en forme des étapes',
      annotate: 'Annotation des images',
    },
    /** Le détail d'une étape : la source préparée sur le total, les vignettes. */
    sourceOf: (index: number, total: number) => `${index.toLocaleString('fr-CA')} sur ${total.toLocaleString('fr-CA')}`,
    thumbnails: 'Vignettes des extraits',
    /** D'où vient une création : « Lancée depuis l’app mobile par Mélanie » ; `inline` : au fil d'une phrase. */
    launchedFrom: (device: 'app' | 'web', byName: string | null | undefined, inline: boolean) =>
      `${inline ? 'lancée' : 'Lancée'} depuis ${device === 'app' ? 'l’app mobile' : 'un navigateur'}${byName ? ` par ${byName}` : ''}`,
    tips: [
      'Vous pourrez corriger chaque étape d’un mot : « simplifie », « ajoute les gants »…',
      'Chaque étape garde le bon extrait de votre vidéo, à la seconde près.',
      'Une fois publiée, l’instruction s’ouvre au poste par un code QR, sans compte.',
      'Les opérateurs peuvent signaler une étape pas claire : vous la corrigez en un geste.',
      'Votre standard de rédaction (réglages) guide chaque génération.',
    ],
    failedTitle: 'La génération n’a pas abouti',
    kept: 'Vos médias sont gardés : rien n’est perdu.',
    reviewMedia: 'Revoir les médias',
    writing: 'L’IA rédige votre instruction',
    elapsed: (clock: string) => `${clock} · d’habitude moins de 2 minutes`,
    remote: (from: string) => `${from}. Elle s’affichera ici dès qu’elle sera prête.`,
    keepAppOpen: 'Laissez l’app ouverte jusqu’à la fin : l’écran reste allumé. Vous pouvez suivre sur l’ordinateur, elle s’y affichera dès qu’elle sera prête.',
    canLeave: 'Vous pouvez quitter cet écran : l’instruction s’enregistre toute seule tant que l’onglet reste ouvert, et se voit sur vos autres appareils.',
    failed: 'La génération a échoué.',
  },
  /** La taille d'une génération (`generationTier`). */
  tiers: { short: 'courte', medium: 'moyenne', long: 'longue' },
  /** Les erreurs de la génération, montrées à la personne. */
  generate: {
    noSources: 'Ajoutez au moins une photo, une vidéo, une note ou un document.',
    tooBig: 'C’est beaucoup pour une seule instruction : gardez au plus 30 minutes de vidéo, ou séparez-la en plusieurs instructions.',
    noInstruction: "L'IA n'a pas rendu d'instruction. Réessayez ; rien n'a été perdu.",
    noSteps: "L'IA n'a trouvé aucune étape dans ces sources. Ajoutez une vidéo ou une note qui décrit les gestes.",
    unreadableDocument: "L'IA n'a pas pu lire ce document.",
  },
  /** L'envoi d'un média (navigateur ou coquille). */
  upload: {
    failed: 'Envoi impossible',
    unsupported: 'Ce type de fichier n’est pas pris en charge.',
    refused: (first: number | string, then: number) => `L’envoi a été refusé (${first} puis ${then}). Réessayez ; si ça revient, signalez-le.`,
  },
  /** La dictée des champs de texte. */
  dictation: {
    nothingHeard: 'Rien entendu',
    nothingHeardText: 'Parlez un peu plus près du micro.',
    failed: 'La dictée n’a pas fonctionné',
    failedText: 'Réessayez ou tapez le texte.',
    noMic: 'Le micro n’est pas accessible',
    noMicSite: 'Autorisez le micro pour ce site.',
    noMicDevice: 'Autorisez le micro dans les réglages du téléphone ou du navigateur.',
  },
}
