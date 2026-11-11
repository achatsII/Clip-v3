/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth = {
  /** La page de connexion (aussi l’inscription et le mot de passe oublié). */
  login: {
    tagline: 'Instructions de travail',
    hero: {
      film: 'Filmez.',
      aiWrites: 'L’IA rédige.',
      floorFollows: 'Le plancher suit.',
      pitch: 'Une instruction de travail claire et visuelle en quelques minutes, trouvée au bon poste par chaque opérateur, sans compte.',
      inputs: 'Vidéos, photos, notes vocales ou vieux PDF',
      generated: 'Étapes, extraits vidéo et mises en garde générés',
      qrAndTablet: 'Code QR et tablette de poste, sans compte',
    },
    titles: { login: 'Bon retour', signup: 'Créez votre compte', forgot: 'Mot de passe oublié' },
    intros: {
      login: 'Connectez-vous pour créer et gérer vos instructions.',
      signup: 'Gratuit pour commencer. Aucune carte requise.',
      forgot: 'Nous vous envoyons un lien pour choisir un nouveau mot de passe.',
    },
    sent: {
      title: 'Courriel envoyé',
      body: (email: string) => `Si un compte existe pour ${email}, vous recevrez un lien dans quelques minutes.`,
      back: 'Retour à la connexion',
    },
    fullname: 'Votre nom',
    fullnamePlaceholder: 'Mélanie Tremblay',
    company: 'Usine ou entreprise',
    optional: 'facultatif',
    companyPlaceholder: 'Usine Bellechasse',
    email: 'Courriel',
    emailPlaceholder: 'vous@usine.com',
    password: 'Mot de passe',
    forgotLink: 'Oublié ?',
    submit: { login: 'Se connecter', signup: 'Créer mon compte', forgot: 'Envoyer le lien' },
    errors: {
      email: 'Entrez un courriel valide.',
      passwordTooShort: 'Le mot de passe doit avoir au moins 8 caractères.',
      passwordMissing: 'Entrez votre mot de passe.',
    },
    newHere: 'Nouveau ?',
    createFreeAccount: 'Créer un compte gratuit',
    askForInvitation: 'Pas encore de compte ? Demandez une invitation à votre administrateur.',
    haveAccount: 'J’ai déjà un compte',
    /** Le nom du choix de langue (chaque langue s’y écrit dans sa propre langue). */
    language: 'Langue',
  },
  /** La configuration guidée de la première ouverture. */
  welcome: {
    setup: 'Configuration',
    progress: (step: number, total: number) => `${step.toLocaleString('fr-CA')} sur ${total.toLocaleString('fr-CA')}`,
    name: {
      title: 'Comment s’appelle votre usine ?',
      hint: 'Il apparaîtra sur les tablettes de poste et les PDF.',
      placeholder: 'Usine Bellechasse',
    },
    goals: {
      title: 'Que voulez-vous documenter en premier ?',
      hint: 'Choisissez-en autant que vous voulez. Votre accueil s’organise autour.',
      sstAndLockout: 'SST et cadenassage',
    },
    approval: {
      title: 'Qui approuve les instructions ?',
      hint: 'Vous pourrez changer d’idée dans les réglages.',
      none: 'Personne : on publie directement',
      noneHint: 'La personne qui écrit en est responsable.',
      one: 'Un approbateur valide avant',
      oneHint: 'Superviseur, qualité ou SST : il voit ce qui a changé et publie.',
    },
    ready: {
      title: (plant: string) => `C’est prêt, ${plant} !`,
      hint: 'Votre première instruction prend quelques minutes : filmez quelqu’un qui fait la tâche en l’expliquant.',
      create: 'Créer ma première instruction',
      import: 'Importer mes anciens PDF',
      later: 'Plus tard',
    },
    finish: 'Terminer',
    nothingPublished: 'Rien n’est publié sans vous.',
  },
  /** L’ouverture de la session. */
  session: {
    /** Le nom donné à l’usine qu’on crée quand le compte n’en dit aucun. */
    defaultOrgName: 'Mon usine',
    /** Le nom affiché quand le compte n’en a pas. */
    me: 'Moi',
    openFailed: 'Impossible d’ouvrir CLIP',
    serverDown: 'Le serveur ne répond pas pour le moment. Vérifiez votre connexion, puis réessayez.',
  },
  /** Les refus du pont avec la coquille native, côté web. */
  native: {
    unavailable: 'Fonction native indisponible',
    noResponse: 'La coquille native ne répond pas',
  },
}
