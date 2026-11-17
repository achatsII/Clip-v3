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
    records: 'Registre',
    import: 'Importer des documents',
    billing: 'Abonnement et crédits',
    settings: 'Réglages',
    more: 'Plus',
  },
  newInstruction: 'Nouvelle instruction',
  account: 'Mon compte',
  appearance: 'Apparence',
  signOut: 'Se déconnecter',
  /** La version de CLIP (2.0.x) : le dernier chiffre augmente à chaque mise à jour. */
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Version ${v}`,
    built: (date: string) => `mise en ligne le ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `App ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'À propos de CLIP',
    hint: 'Le dernier chiffre augmente à chaque mise à jour : comparez-le à celui qu’on vous annonce.',
  },
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
