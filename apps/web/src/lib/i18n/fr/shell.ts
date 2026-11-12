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
    import: 'Importer des documents',
    billing: 'Abonnement et crédits',
    settings: 'Réglages',
    more: 'Plus',
  },
  newInstruction: 'Nouvelle instruction',
  account: 'Mon compte',
  appearance: 'Apparence',
  signOut: 'Se déconnecter',
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
