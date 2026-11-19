/** Feature toggles : noms, valeurs servies par défaut, et valeurs de repli sans serveur. */
export type ToggleName = 'nativeCapture' | 'voiceAssistant' | 'tvCast' | 'bulkImport' | 'aiIllustration' | 'translations' | 'valueReport' | 'storePurchases' | 'liveEditing' | 'draftHistory' | 'previewAgent' | 'stepReel' | 'sections' | 'aiConsent' | 'deleteAccount' | 'renewal' | 'operators' | 'records' | 'multiApproval' | 'notify' | 'training' | 'sharedBlocks' | 'salesAdvisor' | 'academy' | 'recordsPlus' | 'billingPreview' | 'billingPreviewApp' | 'reports' | 'editorViews' | 'phoneReader' | 'serverGeneration' | 'resumableUpload' | 'firstStepChoice' | 'photoVoice' | 'editorSwipe' | 'splashHandoff' | 'aiConsentAtSignIn' | 'smoothVideos' | 'nomenclature' | 'operatorUpdates' | 'documentFigures' | 'clipGif' | 'printTemplates' | 'backgroundAi' | 'toolImages' | 'videoSound' | 'mediaNav' | 'sourceLibrary' | 'agentAttach' | 'slidesImport' | 'nameTemplate' | 'mediaOrder' | 'feedbackMedia' | 'variants' | 'quickMode' | 'gifInStep' | 'screenCapture' | 'learnFromEdits' | 'siteExperiments' | 'capturePreview' | 'brandGate' | 'storeLinks' | 'desktopHint'

/** Valeurs servies par `GET /api/config` quand `CLIP_TOGGLES` ne dit rien. */
export const DEFAULT_TOGGLES: Record<ToggleName, boolean> = {
  nativeCapture: true,
  voiceAssistant: true,
  tvCast: true,
  bulkImport: true,
  aiIllustration: true,
  translations: true,
  valueReport: true,
  // L'achat dans le magasin, dans l'app : la coquille ne l'annonce que si ce toggle est allumé.
  storePurchases: true,
  // L'édition en direct entre appareils (temps réel) : l'éditeur ouvert ailleurs suit les changements.
  liveEditing: true,
  // Annuler, rétablir, et les points de retour du brouillon enregistrés dans la base.
  draftHistory: true,
  // L'assistant d'édition en bulle dans l'aperçu.
  previewAgent: true,
  // Les vidéos au poste : un seul lecteur d'une étape à l'autre (rien ne se recharge), et la vidéo
  // des étapes, montée après la publication sans la retenir (peu de données).
  stepReel: true,
  // Les sections d'une longue instruction (« Démontage », « Remontage ») et le sommaire au poste.
  sections: true,
  // Exigences d'Apple : l'accord avant le premier envoi à l'IA, et supprimer son compte dans l'app.
  aiConsent: true,
  deleteAccount: true,
  // La relecture périodique des instructions publiées (« à revoir dans 1 an »).
  renewal: true,
  // Qui travaille au poste : l'équipe (sans compte), son code à 4 chiffres, et « Qui êtes-vous ? » à la tablette.
  operators: true,
  // Les relevés d'une étape (mesure, oui ou non, choix, texte, photo) et le registre du travail fait.
  records: true,
  // L'approbation à plusieurs : chaque groupe (Qualité, chef d'atelier…) signe, publication à la dernière signature.
  multiApproval: true,
  // Avertir les bonnes personnes : « À voir » dans l'app, courriel et notification sur le téléphone.
  notify: true,
  // La formation : des questions par l'IA, la validation au poste et la matrice de compétences.
  training: true,
  // Les blocs communs : des étapes rédigées une fois, réutilisées dans plusieurs instructions.
  sharedBlocks: true,
  // Le conseiller d'achat : de temps en temps, l'offre qui sert l'usine (accueil seulement), et la
  // demande à l'administrateur quand on ne peut pas acheter soi-même.
  salesAdvisor: true,
  // Les modules en option, montrés et vendus seulement une fois bâtis : l'Académie (bâtie), les Relevés avancés.
  academy: true,
  recordsPlus: true,
  // L'aperçu de la facturation : tant que le catalogue n'est pas publié, les plans, les modules,
  // les cadenas et les offres se montrent quand même (web), sans rien acheter ni débiter.
  billingPreview: true,
  // Le même aperçu dans l'app mobile, sans aucun prix ni achat d'ailleurs (règles d'Apple et de Google).
  // À couper (CLIP_TOGGLES) avant une soumission aux magasins tant que la vraie facturation n'y est pas.
  billingPreviewApp: true,
  // Les rapports : un répertoire de modèles prêts (temps, qui a fait quoi, écarts, formation…), et
  // l'IA qui commente des chiffres déjà calculés.
  reports: true,
  // Les façons de modifier une instruction : « Comme au poste » ou « Fiche » (la liste des étapes et
  // tous les outils de chacune), retenue sur l'appareil, et l'Aperçu en un geste dans l'en-tête.
  editorViews: true,
  // La lecture au téléphone : le média à ses vraies proportions, qui laisse au texte la place qu'il
  // lui faut ; côte à côte quand on tourne le téléphone ; « Tout sur une page » depuis le sommaire.
  phoneReader: true,
  // La génération au serveur (Job_start, branche clip-v2 dans n8n) : le réglage de l'usine paraît,
  // et une fois choisi, on peut fermer l'app pendant que l'IA écrit l'instruction.
  serverGeneration: true,
  // L'envoi par morceaux des gros fichiers (TUS, directement à la Gateway) : un morceau raté se
  // renvoie seul, un réseau coupé s'attend, et « Réessayer » reprend où l'envoi s'était arrêté.
  resumableUpload: true,
  // La première étape au choix de l'usine (Réglages › Standard de rédaction) : le premier geste, la
  // sécurité, ou une étape qu'elle décrit. Éteint : l'interrupteur « Toujours commencer par la sécurité ».
  firstStepChoice: true,
  // Parler pendant les photos : le micro s'ouvre avec la caméra (une pastille le dit et le ferme), un
  // seul enregistrement pour la série, et chaque photo garde son instant ; l'IA les apparie.
  photoVoice: true,
  // Dans l'éditeur au téléphone, glisser à gauche ou à droite change d'étape, comme au poste.
  editorSwipe: true,
  // Un seul logo au démarrage de l'app mobile : l'écran de démarrage de la coquille attend le premier
  // vrai écran de la page (`splash.hide`) au lieu de laisser voir celui du site, puis celui de l'app.
  splashHandoff: true,
  // L'accord pour l'IA se donne à la connexion : une ligne sous le bouton, plus de fenêtre au premier
  // usage. Il se retire et se redonne dans Réglages › Données. Éteint : la fenêtre d'avant (`aiConsent`).
  aiConsentAtSignIn: true,
  // La lecture fluide des vidéos : une vidéo qui quitte l'écran arrête de télécharger (avant, les
  // vidéos des étapes déjà vues continuaient en arrière-plan et bloquaient l'étape affichée), l'éditeur
  // garde un lecteur par vidéo d'une étape à l'autre comme au poste, chaque étape montre son extrait
  // depuis le début, et « Tout voir » ne charge et ne joue que les vidéos à l'écran.
  smoothVideos: true,
  // La nomenclature de l'usine : ses familles d'étiquettes (département, machine, produit, BT…), le
  // classement de chaque instruction proposé par l'IA, et les postes qui prennent leurs instructions
  // par règle (une instruction bien classée y va d'elle-même).
  nomenclature: true,
  // Au poste, une instruction mise à jour le dit : « Mise à jour le … », les étapes nouvelles et
  // modifiées marquées, la version précédente à revoir en lecture, et « Mis à jour » sur sa carte.
  operatorUpdates: true,
  // L'import d'un document (PDF, Word) reprend ses figures : l'étape reçoit la photo ou le dessin de
  // la page qui l'illustre, recadré, plutôt que la page entière (qui reste à un geste dans l'éditeur).
  documentFigures: true,
  // Le GIF d'un extrait, à la demande dans l'éditeur, pour sortir une étape de CLIP (courriel, Teams,
  // présentation). Le média de l'étape reste l'extrait : au poste, il joue déjà en boucle.
  clipGif: true,
  // Les gabarits du PDF : trois dispositions (étapes en grand, tableau, une page), portrait ou paysage ;
  // avec le logo et les couleurs, le cartouche, le pied de page de chaque page et un gabarit d'après
  // un exemple de l'usine.
  printTemplates: true,
  // Au téléphone, l'IA continue quand l'app quitte l'écran : les réponses de l'assistant passent par
  // le serveur (le même chemin que la génération au serveur) et la génération y va par défaut.
  backgroundAi: true,
  // Les outils et le matériel en images : au poste, une tuile par outil (un grand emoji, puis son
  // nom) ; dans l'éditeur, un toucher change l'image ; dans le PDF, l'emoji devant chaque outil.
  toolImages: true,
  // Le son des vidéos se retient sur l'appareil : activé sur une étape, il suit aux autres étapes et
  // à la prochaine ouverture. Éteint : chaque extrait repart muet.
  videoSound: true,
  // Plusieurs médias à une étape, impossibles à manquer : leurs vignettes, « 2 / 3 » et de grandes
  // flèches, au poste comme dans l'éditeur, et leur nombre sur l'étape dans la liste de la Fiche.
  mediaNav: true,
  // Les médias d'origine : ce qui a servi à rédiger l'instruction (vidéos entières, photos, notes
  // vocales et leur transcription, notes, documents), à revoir dans l'éditeur et, pour qui rédige,
  // en lecture ; chacun dit à quelles étapes il sert et se met à l'étape ouverte. Jamais au poste.
  sourceLibrary: true,
  // Joindre des médias dans l'assistant (photo, vidéo, note vocale, document) : ils rejoignent les
  // médias d'origine de l'instruction, et l'assistant les reçoit avec la demande pour s'en servir.
  agentAttach: true,
  // Un PowerPoint (.pptx) se lit dans l'app, sans la Gateway (qui ne le convertit pas) : le texte de
  // chaque diapositive en note, ses images en photos ; capture, import en lot, assistant, médias d'origine.
  slidesImport: true,
  // Le modèle de nom (Réglages › Classement) : les valeurs des familles choisies devant le titre,
  // « Découpe – Presse P-12 – Changer le filtre », dans la bibliothèque, au poste et dans le PDF.
  nameTemplate: true,
  // L'ordre des médias d'une étape, dans l'éditeur : « avant » et « après » sur le média choisi.
  mediaOrder: true,
  // La photo jointe au retour d'un opérateur (« Pas clair ? ») se met, d'un toucher, dans le média de l'étape.
  feedbackMedia: true,
  // Les variantes d'une instruction (« Pompe A », « Pompe B ») : au poste, on touche la sienne au
  // départ et ne restent que ses étapes ; l'IA les propose quand les sources décrivent plusieurs cas.
  variants: true,
  // La version courte pour les habitués, si l'auteur l'offre : « L'essentiel » ou « Tout en détail ».
  quickMode: true,
  // Le GIF d'un extrait : choisir son début et sa fin, puis le mettre à l'étape, à la place de la
  // vidéo ou en plus ; « Vidéo · Image · GIF » sur le média de l'étape.
  gifInStep: true,
  // Enregistrer l'écran d'un ordinateur, sans rien installer : la vidéo, une image nette à chaque
  // action, la voix en option ; l'IA en fait une étape par clic et entoure où cliquer.
  screenCapture: true,
  // L'IA qui apprend des corrections : ce qu'on change après une génération, des règles proposées
  // (pour moi ou pour l'usine), des instructions modèles, des préférences personnelles versionnées.
  learnFromEdits: true,
  // Les tests A/B du site (src/lib/site/experiments.ts) : seulement avec l'accord aux témoins, et pour
  // les tests ouverts dans le code ; le moteur marketing les décide et les lit (plan/experiences.md).
  siteExperiments: true,
  // Avant de générer, dans « Nouvelle instruction » : toucher une source capturée l'ouvre en grand (la
  // vidéo jouée, la note vocale réécoutée avec sa transcription, la note lue), avec les autres.
  capturePreview: true,
  // Une marque par entreprise (src/lib/brand/orgBrand.ts) : connecté à une entreprise de l'autre marque, l'outil l'y
  // renvoie (lien, magasin), sans montrer ses données ni ses prix.
  brandGate: true,
  // « L'app sur votre téléphone » (code QR vers /app, liens des magasins) : à allumer (CLIP_TOGGLES) quand la fiche de
  // la marque est en ligne dans le magasin ; avant, ses liens ne mènent nulle part.
  storeLinks: false,
  // Dans l'app mobile, « Sur votre ordinateur » : l'adresse du site, à copier ou à s'envoyer (jamais un lien d'achat).
  desktopHint: true,
}

/** Serveur injoignable : seulement le comportement de base, aucune fonction nouvelle. */
export const FALLBACK_TOGGLES: Record<ToggleName, boolean> = {
  nativeCapture: true,
  voiceAssistant: false,
  tvCast: false,
  bulkImport: false,
  aiIllustration: false,
  translations: false,
  valueReport: false,
  storePurchases: false,
  liveEditing: false,
  draftHistory: false,
  previewAgent: false,
  stepReel: false,
  sections: false,
  aiConsent: false,
  deleteAccount: false,
  renewal: false,
  operators: false,
  records: false,
  multiApproval: false,
  notify: false,
  training: false,
  sharedBlocks: false,
  salesAdvisor: false,
  academy: false,
  recordsPlus: false,
  billingPreview: false,
  billingPreviewApp: false,
  reports: false,
  editorViews: false,
  phoneReader: false,
  serverGeneration: false,
  resumableUpload: false,
  firstStepChoice: false,
  photoVoice: false,
  editorSwipe: false,
  splashHandoff: false,
  aiConsentAtSignIn: false,
  smoothVideos: false,
  nomenclature: false,
  operatorUpdates: false,
  documentFigures: false,
  clipGif: false,
  printTemplates: false,
  backgroundAi: false,
  toolImages: false,
  videoSound: false,
  mediaNav: false,
  sourceLibrary: false,
  agentAttach: false,
  slidesImport: false,
  nameTemplate: false,
  mediaOrder: false,
  feedbackMedia: false,
  variants: false,
  quickMode: false,
  gifInStep: false,
  screenCapture: false,
  learnFromEdits: false,
  siteExperiments: false,
  capturePreview: false,
  brandGate: false,
  storeLinks: false,
  desktopHint: false,
}
