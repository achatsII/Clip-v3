import type { VideoId, VideoLevel } from '@/lib/decouvrir/catalog'
import { lastDay } from '@/lib/decouvrir/contract'

const num = (n: number) => n.toLocaleString('fr-CA')

/**
 * L'espace Découvrir : ce qu'un prospect voit de Clip sans vendeur à côté (vidéos, conseiller), et son
 * entrée quand l'espace est relié à Sandboxes. Les messages d'accès, l'annonce du suivi et « Ajouté à nos
 * propositions d'ajout » sont ceux du contrat de Sandboxes (docs/INTEGRATION.md), mot pour mot.
 */
export const decouvrir = {
  shell: {
    home: 'Découvrir Clip',
    /** Sous le logo. */
    brand: 'Découvrir',
    nav: 'Espace Découvrir',
    videos: 'Vidéos',
    advisor: 'Conseiller',
    signOut: 'Se déconnecter',
    /** « Accès jusqu’au 15 déc. » : le dernier jour d’accès d’un prospect. */
    until: (fin: number) => `Accès jusqu’au ${lastDay(fin, 'fr-CA', 'short')}`,
    by: 'Clip, par Intelligence Industrielle',
    fictional: 'Les personnes et l’usine des vidéos sont fictives.',
    language: 'Langue',
  },
  /** Les étapes du parcours, telles que le suivi les envoie à Sandboxes (toujours en français). */
  tracking: {
    levelDone: (level: string) => `${level} : terminé`,
    complete: 'Parcours complet',
  },
  /** Les trois niveaux du parcours. */
  levels: {
    1: { title: 'Commencer ici', subtitle: 'Le film, puis la visite complète' },
    2: { title: 'Les fonctions, une à une', subtitle: 'Chaque fonction en détail, à l’écran' },
    3: { title: 'Aller plus loin', subtitle: 'Les postes, l’équipe et le suivi' },
  } satisfies Record<VideoLevel, { title: string; subtitle: string }>,
  /** Le catalogue : titre, résumé (une phrase) et « Pour qui » de chaque vidéo. */
  videos: {
    '00-film': { title: 'Clip en 75 secondes', summary: 'Capturer le savoir-faire d’un expert, l’IA qui rédige, l’instruction au poste.', forWho: 'Tout le monde' },
    '01-survol': { title: 'La visite complète', summary: 'Clip de bout en bout, dans le vrai logiciel.', forWho: 'Tout le monde' },
    '02-capturer': { title: 'Capturer : vidéo, photos, notes vocales', summary: 'Filmer l’expert au téléphone, ajouter photos, notes et documents.', forWho: 'Méthodes, maintenance' },
    '03-generer': { title: 'Générer l’instruction avec l’IA', summary: 'Une action par étape, le bon extrait vidéo, les mises en garde.', forWho: 'Méthodes, maintenance' },
    '04-retoucher': { title: 'Retoucher, annoter, illustrer', summary: 'L’assistant d’édition, les flèches et cercles, les schémas.', forWho: 'Méthodes' },
    '05-traduire': { title: 'Traduire, médias compris', summary: 'Une instruction dans la langue de chaque opérateur.', forWho: 'Méthodes, supervision' },
    '06-moderniser': { title: 'Moderniser vos anciennes procédures', summary: 'Importer des PDF et des Word par dizaines.', forWho: 'Méthodes, qualité' },
    '07-approuver': { title: 'Approuver et publier', summary: 'Le circuit d’approbation et l’historique.', forWho: 'Qualité, SST, supervision' },
    '08-au-poste': { title: 'Au poste, sans compte', summary: 'Le lecteur pas à pas, l’écoute à voix haute, signaler.', forWho: 'Opérateurs, supervision' },
    '09-postes': { title: 'Postes, codes QR et étiquettes', summary: 'Mettre chaque instruction au bon poste.', forWho: 'Administration, supervision' },
    '10-equipe': { title: 'L’équipe et ses rôles', summary: 'Rédacteurs, approbateurs, lecteurs.', forWho: 'Administration' },
    '11-statistiques': { title: 'Retours, registre et statistiques', summary: 'Savoir ce qui est consulté et ce qui bloque.', forWho: 'Direction, amélioration continue' },
  } satisfies Record<VideoId, { title: string; summary: string; forWho: string }>,
  /** La bibliothèque. */
  library: {
    badge: 'Vidéos et conseiller IA',
    title: 'Découvrez Clip,',
    titleAccent: 'à votre rythme.',
    intro:
      'Clip fait passer le savoir-faire d’un expert, de son téléphone au poste : on filme, on parle, et l’IA rédige l’instruction de travail. Commencez par le film, puis chaque fonction, une à une. Une question sur votre usine ? Le conseiller vous répond.',
    count: (n: number) => `${num(n)} vidéo${n > 1 ? 's' : ''}`,
    total: (duration: string) => `${duration} en tout`,
    seen: (n: number) => `${num(n)} vue${n > 1 ? 's' : ''}`,
    player: 'Lecteur',
    emptyTitle: 'Les vidéos arrivent',
    emptyText: 'En attendant, posez vos questions au conseiller.',
    watch: 'Regarder',
    playing: 'En lecture',
    soon: 'Bientôt',
    seenBadge: 'Vue',
    chapters: (n: number) => `${num(n)} chapitre${n > 1 ? 's' : ''}`,
    /** L'appel au conseiller, en fin de page. */
    advisor: {
      badge: 'Conseiller Clip',
      title: '« Est-ce que Clip peut faire ça, chez nous ? »',
      text: 'Posez la question au conseiller : il sait ce que Clip fait aujourd’hui, vous explique comment, et note ce qui vous manque.',
      linked: ['Des réponses précises, fonction par fonction', 'L’analyse de vos documents (PDF, photo, texte)', 'Une idée de fonction ? Elle va à l’équipe produit'],
      open: ['Des réponses tirées de la documentation de Clip', 'Ce qui n’existe pas encore, dit franchement', 'Votre besoin, noté au fil de la conversation'],
      action: 'Parler au conseiller',
    },
  },
  /** Le lecteur. */
  player: {
    forWho: (who: string) => `Pour : ${who}`,
    next: 'Vidéo suivante',
    chapters: (duration: string) => `Chapitres · ${duration}`,
    transcript: 'Lire la transcription',
    /** Le nom de la piste de sous-titres, dans sa langue. */
    subtitles: 'Français',
    failed: 'La vidéo ne se charge pas. Vérifiez votre connexion, puis réessayez.',
    retry: 'Réessayer',
  },
  /** L'écran d'entrée, quand l'espace est relié à Sandboxes. */
  login: {
    eyebrow: 'Espace Découvrir',
    title: 'Découvrir Clip',
    subtitle: 'Les vidéos et le conseiller.',
    email: 'Courriel',
    emailHint: 'L’accès reçu d’Intelligence Industrielle.',
    emailHintClients: 'Votre compte Clip, ou l’accès reçu d’Intelligence Industrielle.',
    password: 'Mot de passe',
    submit: 'Entrer',
    required: 'Entrez votre courriel et votre mot de passe.',
    network: 'Impossible de joindre le service. Vérifiez votre connexion.',
    /** L'annonce du suivi, telle quelle. */
    notice: "Ce que vous regardez et demandez ici est enregistré pour mieux vous servir.",
    openTitle: 'Cet espace est ouvert',
    openText: 'Pas besoin d’entrer : les vidéos et le conseiller sont à vous.',
    goVideos: 'Voir les vidéos',
  },
  /** Les messages d'accès du contrat, mot pour mot. */
  access: {
    wrongCredentials: 'Courriel ou mot de passe incorrect.',
    unavailable: 'La connexion ne répond pas pour le moment. Réessayez dans un instant.',
    noAccess: "Votre accès à cet espace n'est pas encore ouvert. Votre contact chez Intelligence Industrielle peut l'ouvrir.",
    ended: (fin: number | null) =>
      fin
        ? `Votre accès a pris fin le ${lastDay(fin, 'fr-CA', 'long')}. Votre contact chez Intelligence Industrielle peut le prolonger.`
        : 'Votre accès a pris fin. Votre contact chez Intelligence Industrielle peut le prolonger.',
    session: 'Votre session a pris fin. Entrez de nouveau pour continuer.',
  },
  /** Le conseiller. */
  advisor: {
    title: 'Conseiller Clip',
    subtitle: 'Ce que Clip fait aujourd’hui, et ce qui vous manque',
    subtitleDemo: 'Démonstration : des réponses tirées de la documentation',
    hello: 'Bonjour ! Demandez-moi si Clip fait ce dont vous avez besoin. Par exemple :',
    starters: [
      'Est-ce que je peux transformer nos vieilles procédures en PDF ?',
      'Comment l’opérateur trouve-t-il la bonne instruction au poste ?',
      'Nos opérateurs parlent espagnol et arabe : est-ce un problème ?',
      'Qui approuve une instruction avant qu’elle arrive au poste ?',
      'Est-ce que Clip fait les fiches de cadenassage ?',
      'Combien de temps faut-il pour une première instruction ?',
    ],
    thinking: 'Le conseiller réfléchit…',
    placeholder: 'Votre question, votre idée, votre façon de faire…',
    inputLabel: 'Votre message',
    send: 'Envoyer',
    attach: 'Joindre un document',
    attachHint: 'PDF, image ou texte, 4 Mo au plus',
    removeFile: 'Retirer le document',
    fileTooBig: 'Ce document est trop lourd pour le conseiller (4 Mo au plus).',
    fileUnsupported: 'Ce type de document ne se lit pas ici : joignez un PDF, une image ou un fichier texte.',
    /** Le message envoyé quand la personne joint un document sans rien écrire. */
    documentOnly: (name: string) => `Voici un document : ${name}`,
    /** La ligne qui accompagne un document dans la conversation enregistrée. */
    attached: (names: string) => `[Document joint : ${names}]`,
    retained: 'Ce que je retiens',
    needs: 'Vos besoins',
    needsEmpty: 'Ils s’ajoutent au fil de la conversation.',
    ideas: 'Vos idées de fonctions',
    ideasEmpty: 'Une idée ? Dites-la : elle est notée.',
    modules: 'Ce qui vous intéresse',
    recorded: 'Cette conversation est enregistrée pour l’équipe d’Intelligence Industrielle.',
    local: 'Rien n’est enregistré : la conversation reste dans cet onglet.',
    needSending: 'Envoi à l’équipe produit…',
    /** Le besoin enregistré dans Sandboxes, mot pour mot. */
    needSaved: "Ajouté à nos propositions d'ajout",
    needNoted: 'Noté dans ce que je retiens',
    needFailed: 'Le besoin n’a pas pu être transmis',
    needFailedText: 'Il reste dans cette conversation.',
    saveFailed: 'La conversation n’a pas pu être enregistrée',
    saveFailedText: 'Vos réponses restent à l’écran ; l’échange suivant la renverra.',
    failed: 'Le conseiller n’a pas pu répondre',
    errors: {
      network: 'Impossible de joindre le service. Vérifiez votre connexion.',
      timeout: 'Le conseiller met trop de temps à répondre. Réessayez.',
      credits: 'Le conseiller a atteint sa limite pour le moment. Réessayez plus tard.',
      forbidden: 'Le conseiller n’est pas ouvert pour votre accès. Votre contact chez Intelligence Industrielle peut l’ouvrir.',
      upload: 'Le document n’a pas pu être envoyé.',
      other: 'Réessayez dans un instant.',
    },
    /** La réponse de démonstration (interrupteur éteint), sans IA : la même conduite que le vrai conseiller. */
    demo: {
      notYet: "Pas encore dans Clip aujourd'hui.",
      planned: "C'est dans ce qu'on prévoit ensuite.",
      invite: 'Voulez-vous me l’expliquer davantage ? Je le noterai dans ce que je retiens.',
      questions: [
        'Que se passe-t-il aujourd’hui, concrètement, quand ça arrive ?',
        'À quelle fréquence est-ce que ça arrive, et qui est touché ?',
        'Qu’est-ce que ça vous coûte aujourd’hui, et qu’est-ce qui serait idéal ?',
      ],
      note: '*Réponse de démonstration, tirée de la documentation du produit.*',
      discovery: 'Pour mieux vous conseiller : combien de postes avez-vous, et comment vos instructions sont-elles faites aujourd’hui ?',
      closest: (what: string) => `Ce qui s’en approche déjà : ${what}.`,
      prices: 'Les prix, un conseiller d’Intelligence Industrielle vous les donnera. Voici les forfaits :',
      today: (topic: string) => `Voici ce que fait Clip aujourd’hui (${topic}) :`,
      see: (title: string) => `À voir : la vidéo « ${title} ».`,
      seeChapter: (chapter: string, video: string, at: string) => `À voir : le chapitre « ${chapter} » de la vidéo « ${video} », à ${at}.`,
      thanks: 'Merci, c’est clair.',
      ok: 'D’accord.',
      declined: 'Pas de souci. Posez-moi une autre question quand vous voulez : ce que fait Clip, ou une façon de faire chez vous.',
      needIntro: 'Merci, c’est noté. Votre besoin, en trois lignes :',
      todayLine: (what: string) => `Aujourd’hui : ${what}`,
      toSpecify: 'à préciser.',
      frequencyLine: (what: string) => `Fréquence et personnes touchées : ${what}.`,
      idealLine: (what: string) => `L’enjeu et l’idéal : ${what}.`,
      rest: 'Le reste, à préciser avec l’équipe produit.',
      untitled: 'Un besoin à préciser',
      /** Le début d'une réponse par la négative : la personne décline. */
      no: /^(non|pas besoin|pas maintenant|ça va|ca va|non merci)\b/i,
    },
  },
}
