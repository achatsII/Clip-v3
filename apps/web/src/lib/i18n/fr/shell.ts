/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell = {
  opening: 'Ouverture de CLIP…',
  mainNav: 'Navigation principale',
  nav: {
    home: 'Accueil',
    instructions: 'Instructions',
    stations: 'Postes',
    feedback: 'Retours',
    stats: 'Statistiques',
    team: 'Équipe',
    import: 'Importer des documents',
    billing: 'Abonnement et crédits',
    settings: 'Réglages',
    more: 'Plus',
  },
  newInstruction: 'Nouvelle instruction',
  account: 'Mon compte',
  appearance: 'Apparence',
  signOut: 'Se déconnecter',
  /** L'accord avant le premier envoi à l'IA (exigence d'Apple). */
  aiConsent: {
    title: 'Avant d’utiliser l’IA',
    body: 'Pour rédiger et modifier vos instructions, CLIP envoie vos photos, vidéos, notes vocales et textes à des services d’intelligence artificielle de Google et d’OpenAI, par la plateforme d’Intelligence Industrielle.',
    more: 'Rien n’est envoyé sans votre accord. Vous pourrez le retirer dans Réglages › Données.',
    privacy: 'Politique de confidentialité',
    accept: 'J’accepte',
    refuse: 'Pas maintenant',
  },
  /** Vos modifications sur un autre appareil, pendant que celui-ci est ailleurs dans l'app. */
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Vous modifiez ${title ? `« ${title} »` : 'une instruction'} sur ${device === 'app' ? 'l’app mobile' : 'un autre ordinateur'}`,
  },
  scan: {
    title: 'Scanner un code',
    prompt: 'Scannez le code du poste ou de la pièce',
    failed: 'Le lecteur de code ne s’est pas ouvert',
    aim: 'Visez le code QR ou le code-barres',
    noCamera: 'La caméra n’est pas accessible. Autorisez-la dans votre navigateur, ou tapez le code dans la recherche.',
  },
}
