/** Une marque par entreprise, et les liens entre l'ordinateur et le téléphone (`src/components/devices`). */
export const devices = {
  /** Connecté à une entreprise de l'autre marque : `{app}` devient son nom, `{host}` son adresse, à l'affichage. */
  elsewhere: {
    title: 'Votre entreprise utilise {app}',
    body: 'Ce compte appartient à une entreprise qui travaille avec {app} : ses instructions et ses postes vous y attendent.',
    open: 'Ouvrir {app}',
    install: 'Installer {app}',
    noStore: 'L’équipe de votre entreprise vous donnera le lien de l’app {app}.',
    computer: 'À l’ordinateur : {host}',
  },
  /** Sur le web : installer l'app mobile (code QR vers /app, liens des magasins). */
  getApp: {
    title: 'CLIP sur votre téléphone',
    why: 'Filmez le geste au poste et ouvrez les instructions par leur code QR.',
    scan: 'Visez ce code avec l’appareil photo du téléphone : il ouvre l’App Store ou Google Play.',
    ask: 'Pas de lien pour ce téléphone ? L’équipe de votre entreprise vous le donnera.',
    menu: 'L’app mobile',
    later: 'Plus tard',
    pageTitle: 'Installer CLIP',
    pageBack: 'Continuer dans le navigateur',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  /** Dans l'app mobile : l'outil à l'ordinateur (`{host}` : l'adresse du site). */
  computer: {
    title: 'Sur votre ordinateur',
    body: 'Rédigez sur un grand écran : ouvrez {host} dans votre navigateur et connectez-vous avec le même compte.',
    copy: 'Copier l’adresse',
    copied: 'Adresse copiée',
    send: 'Envoyer le lien',
    later: 'Plus tard',
  },
}
