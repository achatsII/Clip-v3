/** Les pages publiques (tablette, code QR, lien direct). */
export const publicLinks = {
  loading: 'Chargement…',
  deadLink: 'Ce lien ne fonctionne plus',
  /** La tablette d’un poste (code QR du poste). */
  kiosk: {
    /** « Qui êtes-vous ? » : le nom, puis le code à 4 chiffres. */
    who: {
      title: 'Qui êtes-vous ?',
      hint: 'Touchez votre nom, puis tapez votre code.',
      others: 'Autres personnes',
      pinTitle: (name: string) => `Bonjour ${name}`,
      pinHint: 'Tapez votre code à 4 chiffres.',
      notMe: 'Ce n’est pas moi',
      erase: 'Effacer',
      checking: 'Vérification…',
      wrong: 'Code incorrect. Réessayez.',
      locked: 'Trop d’essais. Réessayez dans quelques minutes, ou demandez à votre superviseur.',
      noPin: 'Vous n’avez pas encore de code : demandez-le à votre superviseur.',
      unavailable: 'L’identification ne répond pas. Vous pouvez continuer sans vous identifier.',
      outdated: 'Ce poste doit être mis à jour par un responsable pour identifier les personnes.',
      continueWithout: 'Continuer sans m’identifier',
      empty: 'Personne n’est inscrit à ce poste. Demandez à votre superviseur de vous ajouter.',
      change: 'Changer de personne',
    },
    deadLinkHint: 'Le code QR a peut-être été remplacé. Demandez le nouveau code à votre superviseur.',
    replacedHint: 'Le code QR de ce poste a été remplacé. Demandez le nouveau code à votre superviseur.',
    station: 'Poste',
    fullscreen: 'Plein écran',
    searchPlaceholder: 'Chercher une instruction, une pièce, un numéro…',
    search: 'Chercher',
    searchByVoice: 'Chercher en parlant',
    clear: 'Effacer',
    noMatch: 'Rien trouvé à ce poste',
    noMatchHint: 'Essayez un autre mot.',
    empty: 'Aucune instruction pour ce poste',
    emptyHint: 'Les instructions publiées pour ce poste apparaîtront ici automatiquement.',
    showOtherStations: 'Voir les instructions des autres postes',
    otherStations: 'Autres postes',
    nothingElse: 'Rien d’autre à afficher.',
    onlyThisStation: 'Cette tablette montre seulement les instructions de ce poste.',
    /** Sous le titre d’une carte : le nombre d’étapes et la durée, s’il y en a une. */
    cardMeta: (steps: number, minutes?: number | null) => `${steps.toLocaleString('fr-CA')} étape${steps > 1 ? 's' : ''}${minutes ? ` · ${minutes.toLocaleString('fr-CA')} min` : ''}`,
  },
  /** Le lien direct vers une instruction. */
  shared: {
    deadLinkHint: 'Demandez un nouveau lien à la personne qui vous l’a envoyé.',
    unavailable: 'Instruction indisponible',
    unavailableHint: 'Elle a peut-être été retirée ou archivée.',
    thanks: 'Merci ! Vous pouvez fermer cette page.',
  },
  /** La création d’un lien public (src/lib/share.ts) : la route rend un code, traduit ici. */
  share: {
    noConnection: 'Pas de connexion au serveur',
    errors: {
      authRequired: 'Connexion requise',
      badRequest: 'Requête invalide',
      unknownLink: 'Lien inconnu',
      gatewayDown: 'La Gateway ne répond pas',
      linkFailed: 'Le lien n’a pas pu être créé',
    },
  },
  /**
   * Les commandes des médias d’une étape (vidéo, page de document, schéma, zoom) dans l’outil ; le
   * lecteur des opérateurs fournit les mêmes dans la langue choisie au poste (player/i18n.ts).
   */
  media: {
    play: 'Lire',
    pause: 'Pause',
    playClip: 'Lire l’extrait',
    replayClip: 'Revoir l’extrait',
    restartClip: 'Reprendre l’extrait',
    unmute: 'Activer le son',
    mute: 'Couper le son',
    close: 'Fermer',
    videoPlayback: 'Lecture des vidéos',
    playbackMode: (mode: string) => `Lecture : ${mode}`,
    savedOnDevice: 'Retenu sur cet appareil.',
    videoModes: {
      loop: { label: 'En boucle', hint: 'Démarre seule et recommence' },
      once: { label: 'Une fois', hint: 'Démarre seule, joue une fois' },
      tap: { label: 'Au toucher', hint: 'Attend qu’on touche Lecture' },
    },
    page: (page: number) => `Page ${page.toLocaleString('fr-CA')}`,
    documentPage: (name: string, page: number) => `${name} · page ${page.toLocaleString('fr-CA')}`,
    document: 'Document',
    openPage: 'Ouvrir la page',
    diagram: 'Schéma',
    zoomHint: 'Pincez ou touchez deux fois pour zoomer',
    zoomLevel: (percent: number) => `${percent.toLocaleString('fr-CA')} %`,
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
  },
}
