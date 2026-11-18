# CLIP V2 — notes pour Claude

Instructions de travail en usine générées par l'IA. Avant de changer ce que le produit montre ou sait
faire, lire [`VISION.md`](VISION.md) (ce qui ne doit pas changer, ce qui est hors de portée) ; le
« comment » est dans [`docs/architecture.md`](docs/architecture.md) et
[`docs/pont-natif.md`](docs/pont-natif.md).

## Commandes

- À la racine (workspaces npm `apps/web` et `packages/*`) : `npm run dev`, `npm run typecheck`,
  `npm test` (Vitest, `apps/web/tests`), `npm run build`.
- Coquille mobile, hors workspaces : `cd apps/mobile && npm test` (Jest) et `npm run typecheck`.
- Déploiement : un push suffit (GitHub Action `deploy-vercel.yml`, workflow partagé de l'organisation).
  `main` → production (Gateway prod), `dev` → QA (Gateway QA), autre branche → preview. Les variables
  vivent par environnement dans Vercel (`docs/architecture.md`, « Les environnements »). **Le fichier
  n'est pas encore dans le dépôt** (`.github/workflows/` absent, constaté le 17 novembre 2026) : d'ici
  là, Vercel ne fait que des aperçus de `main`, et la production de CLIP se déploie à la main (un
  déploiement de production de `main` par Vercel). Le site de la marque publique (projet Vercel à part)
  suit `main` tout seul.
- **Le dépôt** (décision du 2026-11-18) : `intelligence-industrielle/Clip-v2`, dans l'organisation, avec tout
  l'historique. L'ancien, `achatsII/Clip-v3`, en est une copie identique tant que les deux projets Vercel
  (« clip-v2 » pour CLIP, « kiplo ») le suivent encore : chaque push part vers les deux (`git remote -v`).
  Une fois Vercel rebranché sur le dépôt de l'organisation, l'ancien s'archive (lecture seule) et ne reçoit
  plus rien. Une nouvelle session de Claude se lance sur `intelligence-industrielle/Clip-v2`.

## Repères

- **Deux marques, un seul produit** (décision du 2026-11-17, `src/lib/brand/product.ts`) : **CLIP**, vendu
  par l'équipe d'Intelligence Industrielle à ses clients (aucun prix du libre-service : tout y est « sur devis »,
  `presentOffer` et `forBrand` ; site hors des moteurs, `siteIndexed`) et **Kiplo** (nom choisi le 2026-11-17
  à la place de Gesto), la version publique en libre-service (« Filmez le geste. L'IA écrit l'instruction. »).
  Kiplo ne nomme jamais Intelligence Industrielle dans ses textes, sauf dans sa politique de confidentialité
  (`PRODUCT.legal`, exigée par la loi). Les deux apps se publient dans le compte développeur principal
  d'Intelligence Industrielle, que les magasins affichent comme vendeur (décision du 2026-11-17). Kiplo y est
  une app à part, au même code, avec ses identifiants neutres (`app.kiplo`). La build choisit
  (`NEXT_PUBLIC_BRAND=kiplo` ; l'ancien `gesto` vaut encore Kiplo, `brandIdOf` ; sans valeur, CLIP). Les textes
  gardent le jeton `CLIP` (`Clip` sur le site) :
  `brandify`/`brandText` y mettent le nom de la marque, une fois par dictionnaire chargé ; `APP_NAME` et
  `PRODUCT` partout ailleurs (métadonnées, consignes de l'IA). Kiplo n'a ni Découvrir (`src/proxy.ts`), ni
  démo avec l'équipe (`BookPage`), ni Usine ni modules en vente, ni le film du site (`PRODUCT.film` : sa voix dit
  « Clip » ; ses boucles muettes restent) ; son logo est le n° 3 « Filmer, puis lire »
  (`PRODUCT.mark`), ses icônes dans `public/brands/kiplo/` (`npm run brand-icons` les refait pour les deux
  marques), son favicon par réécriture (`next.config.ts`), son manifeste par `src/app/manifest.ts`. L'app
  mobile aussi : `EXPO_PUBLIC_BRAND` (profil d'EAS au nom de la marque, `kiplo`), `apps/mobile/brands.json` (nom,
  adresse du site, identifiants des magasins) et `app.config.js` (« Deux marques, une coquille »,
  `docs/pont-natif.md`).
- **Une seule interface** : tout l'écran est dans `apps/web`. La coquille Expo n'ajoute que des
  capacités natives, déclarées dans `packages/bridge` ; le web vérifie une capacité
  (`hasCapability`) avant de l'appeler et garde toujours un repli web. Au démarrage, un seul logo :
  l'écran natif attend le premier vrai écran de la page (`splash.hide`, toggle `splashHandoff`,
  `ShellSplash`) ; un nouvel écran de chargement avec le logo seul porte `data-boot-loader`.
- **La Gateway Octopus est le seul backend.** Ses contrats sont dans `apps/web/src/lib/gateway`
  (`client.ts` : jetons, un seul rafraîchissement sur 401 ; `data.ts` ; `files.ts` ; `ai.ts`). On ne
  devine pas une route : on lit sa spec (skill `api-plateforme-ii`).
- **Données** : connexion avec l'application `clip-v2` (`DEFAULT_APP_IDENTIFIER`), cloisonnée par la
  Gateway ; droits `data:*`, `files:*`, `ai:*`, `assistant:*`, `communication:*`. Avec
  `NEXT_PUBLIC_APP_IDENTIFIER=html` (l'ancienne application partagée, où restent les données d'avant le
  2026-11-17), chaque document porte `json_data.app_identifier = "clip-v3"` et chaque lecture filtre
  dessus (`dataApi` le fait, `HTML_DATA_SLUG`) ; ailleurs, CLIP s'appelle `clip-v2` (`APP_DATA_IDENTIFIER` : la clé de sa branche n8n, le dossier de ses fichiers ; décision du 2026-11-17, « V2 partout »). Les
  types sont dans `src/lib/model/repo.ts` (`T`). Une modification partielle passe par `PATCH`, et une
  réécriture complète garde les champs qu'on ne connaît pas.
- **Liens publics** (poste, instruction) : la portée se bâtit côté serveur dans
  `src/lib/server/scope.ts`, jamais à partir du navigateur. Un lien ne lit que `clip_published`.
  Une photo prise sur un lien (relevé, « Pas clair ? ») va, réduite, dans un document `clip_photo`
  que le relevé ou le retour désigne par `clip-photo:<id>` (`src/lib/media/photos.ts` ; `StoredPhoto`
  l'affiche, le PDF et le CSV la résolvent) ; un lien d'avant la portée v3 la range dans le relevé
  lui-même (`data:`).
- **Espace Découvrir** (`/decouvrir`, [`docs/DECOUVRIR.md`](docs/DECOUVRIR.md)) : les vidéos et le conseiller
  pour les prospects, à part de l'app (sa propre session, le cookie `clip_decouvrir` ; rien dans les données de
  Clip). Public par défaut ; `DECOUVRIR_ACCES=sandboxes` le ferme derrière Sandboxes (`src/proxy.ts`,
  `src/lib/decouvrir/server`), qui reçoit le suivi, les conversations et les besoins. Jamais de prix, de client réel
  ni d'outil interne. Une fonction qui change dans Clip se reporte dans la base du conseiller
  (`src/lib/decouvrir/knowledge.ts`, chaque phrase vérifiée) ; une vidéo tournée se publie par
  `public/decouvrir/videos/<id>.json`, le MP4 au stockage, jamais dans git.
- **Génération suivie partout** : elle tourne dans l'appareil qui la lance (`startGeneration`). Il
  écrit son état dans l'instruction (`generating` : étape, signe de vie toutes les 30 s ;
  `src/lib/ai/creation.ts`). Les autres appareils le lisent par une petite requête partagée
  (`useCreations` : 10 s pendant une création, 60 s sur l'accueil et la liste, jamais onglet caché).
  Sans signe de vie depuis 2 min, elle est « interrompue » et se relance d'un geste. Avec `ABLY_KEY`
  (Vercel, serveur), le temps réel annonce début, étapes et fin sur le canal de l'organisation
  (`/api/realtime/token`, `src/lib/realtime`) : l'autre appareil se met à jour aussitôt. Les images
  générées passent par OpenAI, niveau mid (`IMAGE_MODEL`, repli Google si la passerelle refuse).
- **Génération au serveur** (toggle `serverGeneration`, choix de l'usine `OrgSettings.generation.server`
  dans Réglages › Usine ; sans choix, au serveur sur tous les appareils, bureau compris, depuis 2.0.11 :
  avant, un ordinateur générait sur l'appareil et devait rester ouvert) : la requête AskAI v4 se prépare une seule fois
  pour les deux chemins (`prepareGeneration`, `importAsk`) et part à `POST /api/v1/ai/job/start`
  avec `appIdentifier: 'clip-v2'`, jamais de grant dans le corps. Dans n8n, la branche clip-v2 de
  Job_start crée `clip_job` avec les droits de l'appelant, répond et se relance elle-même sans
  s'attendre (`data.phase: 'run'`) : ce deuxième passage roule `Job_Generate_CLIP_V2` (Ask_AI_V4 tel
  quel, la réponse lue comme `aiApi.ask` la lit) et écrit l'état, le résultat et son coût dans
  `clip_job`. L'appareil peut alors se fermer ; le premier
  appareil ouvert qui voit le travail fini termine l'instruction avec le code de l'app (le travail se
  relit aussi onglet caché, une fois par minute, `POLL_HIDDEN_JOB_MS` : un onglet resté derrière un
  autre termine les figures d'un PDF et les vignettes sans qu'on y revienne)
  (`finishServerGeneration` dans `CreationWatcher` : verrou `generating.finishing`, même fin que sur
  l'appareil) et débite le coût réel avec la clé du travail (`jobDebitKey`, une seule fois). Une
  création au serveur ne se juge jamais au signe de vie du téléphone : elle reste en cours jusqu'à ce
  que son travail soit réglé, même des jours plus tard, et seul le travail la fait échouer (pas pris
  en 3 min, ou muet 30 min selon sa propre horloge, `jobOutcome`). Le toggle ne décide que du
  lancement : un travail parti se termine toujours. Si le
  serveur ne prend pas la génération, elle tourne sur l'appareil ; après un échec au serveur, la
  relance aussi. « Générer » se touche pendant les envois : la génération part toute seule à leur fin
  (`whenUploaded`). L'import en lot crée chaque instruction et confie son analyse au serveur
  (`startServerImport`). Plus de 10 fichiers (`plannedAskFiles`, `MAX_ASK_FILES`) : toujours au
  serveur, même si l'usine génère sur l'appareil, car la route directe les découpe en lots (Pièges). **Une modification de la façon d'analyser se reporte dans la branche
  clip-v2** quand elle change ce que n8n fait : un nouveau champ de la requête s'ajoute au nœud
  « Run AskAI V4 » (`JOB_RELAYED_FIELDS`, un test échoue sinon), une passe d'IA de plus, un
  traitement nouveau au serveur ou une autre lecture de la réponse (`aiApi.ask`) se reporte dans
  `Job_Generate_CLIP_V2` (nœud « Shape analysis result »), et ce qui s'écrit de plus dans
  `clip_job`, dans la branche de Job_start. Les consignes, le schéma et les fichiers passent tels
  quels : les changer ne demande rien dans n8n.
- **L'IA continue hors de l'écran** (toggle `backgroundAi`) : au téléphone (l'app, ou Safari sur iPhone),
  iOS suspend l'app hors de l'écran et coupe la requête en cours. La réponse de l'assistant se prépare
  donc au serveur, par la même branche clip-v2 de Job_start que la génération (elle roule toute requête
  avec un schéma ; rien à changer dans n8n) : `durableAsk` (`src/lib/ai/durableAsk.ts`) relit `clip_job`
  toutes les 2 s à l'écran et aussitôt au retour, débite le coût réel une fois (`jobDebitKey`) et ferme
  le travail ; pas pris en 45 s ou refusé, la demande part sur l'appareil. Sans choix de l'usine, la
  génération part au serveur, au bureau comme au téléphone (`generatesOnServer`).
- **Gros fichiers** (toggle `resumableUpload`) : dès 16 Mo, un fichier du navigateur part par
  morceaux de 4 Mo, directement à la Gateway (TUS, `src/lib/gateway/resumable.ts`).
  - Un morceau raté se renvoie seul, à partir de ce que la Gateway a vraiment reçu.
  - Réseau coupé, l'envoi attend son retour (10 minutes au plus) et la carte le dit.
  - La session reste 24 h sur l'appareil : « Réessayer » (capture et import en lot) reprend où
    l'envoi s'était arrêté.
  - Si la Gateway refuse ce mode, le fichier part d'un bloc (URL présignée), comme avant.
  - Clip V1 fait passer chaque morceau par son serveur Vercel (4,5 Mo par requête au plus) ; ici,
    rien n'y transite.
  - Dans la coquille, un média part d'un bloc par la session d'envoi en arrière-plan d'iOS, qui
    continue quand l'app passe en arrière-plan. La caméra filme en 720p à 2,5 Mbit/s ; une vidéo
    de la galerie part telle quelle, puis la Gateway la ramène en 720p.
- **Première étape** (toggle `firstStepChoice`, Réglages › Standard de rédaction) : chaque usine
  choisit par quoi commence une instruction générée : le premier geste (défaut d'une usine neuve ; les
  EPI et les mises en garde s'affichent déjà sur « Avant de commencer »), une étape de sécurité, ou
  une étape qu'elle décrit (`WritingStandard.firstStep`, `firstStepText`, `src/lib/model/firstStep.ts`).
  Un standard d'avant n'a que `startWithSafety` : `firstStepOf` le lit tel quel, et `firstStep` n'entre
  jamais dans `defaultStandard()` (sinon `normalizeOrg` changerait les usines existantes). La consigne
  part telle quelle au serveur : rien à changer dans n8n.
- **Figures des documents** (toggle `documentFigures`) : à l'import d'un PDF ou d'un Word (converti en
  PDF), la génération nomme la figure de la page qui illustre l'étape (`figure` du média ; consigne et
  schéma passent tels quels : rien dans n8n). À la fin (`enrichMedia`, sur l'appareil qui termine, même
  au serveur), la page se rend à 200 dpi, l'IA y trouve les boîtes en une question par page (usage
  `figures`, `src/lib/ai/figures.ts`) et l'étape reçoit la figure recadrée, qui sait d'où elle vient
  (`fromPage`, `src/lib/media/figures.ts`). Introuvable, minuscule ou presque toute la page : la page
  reste. Dans l'éditeur, « Figure » et « Page entière » passent de l'une à l'autre.
- **PowerPoint** (toggle `slidesImport`, `src/lib/media/slides.ts`) : la Gateway ne le convertit pas (la
  route `convert-to-pdf` n'accepte que Word et ODT et répond 500 pour un .pptx, revérifié en QA le 17
  novembre 2026). L'app lit le .pptx elle-même (une archive zip, `DecompressionStream`) : une note avec le
  texte de chaque diapositive (titre, texte, tableaux, notes du présentateur), puis une photo par image,
  nommée d'après sa diapositive (`ingestSlides`, `ingestAny`). Capture, import en lot (`importAsk` : le
  texte dans la demande, les images jointes, `importSystem(…, 'slides')` ; rien dans n8n), assistant et
  médias d'origine. Un .ppt, un Keynote ou un .odp : « enregistrez-la en .pptx ou en PDF » ; toggle coupé,
  le message d'avant (`isSlides`).
- **Traductions** : rangées dans `translations[langue]` et appliquées par `localized`
  (`src/lib/model/translation.ts`), médias compris : légendes, annotations, texte des schémas, et
  en option les images refaites avec leur texte traduit. Un média traduit nomme l'original (`of`).
- **Revenir en arrière** (toggle `draftHistory`) : annuler et rétablir pendant la séance
  (`src/lib/history/undo.ts`), et des points de retour du brouillon dans `clip_checkpoint`
  (`src/lib/model/checkpoints.ts`) : au plus un par 10 minutes de modification, avant l'assistant, une
  régénération ou un retour, sans doublon ni copie de la version publiée, 20 par instruction. Après
  chaque enregistrement, le cache de l'instruction suit (`cacheDraft`).
- **Vidéos au poste** (toggle `stepReel`, allumé) : un seul lecteur gardé d'une étape à l'autre, la
  vidéo ne se recharge pas (`src/lib/media/videoPool.ts`) ; la vidéo des étapes, montée après la
  publication sans jamais la retenir (`src/lib/media/reel.ts`) ; montage raté, le poste lit la vidéo
  d'origine (la route a répondu 500 en QA le 12 novembre 2026, puis monté en 1080p au lieu de 720p).
- **Lecture fluide** (toggle `smoothVideos` ; « La lecture fluide des vidéos », `docs/architecture.md`) : une vidéo qui quitte l'écran
  arrête de télécharger (`stopVideo`) : détachée, elle continuait, et d'étape en étape ces
  téléchargements bloquaient la vidéo affichée, même sur un PC puissant. L'éditeur garde lui aussi un
  lecteur par vidéo (jamais la vidéo des étapes) ; chaque étape montre son extrait depuis le début ;
  « Tout voir » ne charge et ne joue que les vidéos à l'écran (`lazy`). Un nouvel élément vidéo passe
  par `VideoSegment` ou appelle `stopWhenGone` à son démontage.
- **Outils en images** (toggle `toolImages`, `src/lib/model/tools.ts`) : chaque outil a son emoji, en
  tête de son texte (« 🔧 Clé de 13 mm » : l'IA le met, consigne du schéma, rien dans n8n), sinon tiré
  de son nom (`toolIcon`, 🧰 à défaut). Au poste, des tuiles (`ToolTiles`) ; dans l'éditeur, un toucher
  en change l'image (`withToolEmoji`) ; le PDF le montre (`toolImages` du `PrintMeta`) ; une traduction
  garde l'emoji de l'original (`keepToolEmojis`). Toggle coupé, le texte s'affiche tel qu'écrit.
- **Son des vidéos** (toggle `videoSound`, `src/lib/media/videoSound.ts`, `sound` du
  `MediaPlaybackProvider`) : activé une fois, il suit aux autres étapes et se retient sur l'appareil
  (`clip_pref_video_sound`) ; muet par défaut. Un navigateur qui refuse le son sans un toucher fait partir
  la vidéo muette, sans oublier le choix.
- **Plusieurs médias à une étape** (toggle `mediaNav`, `MediaNav` de `StepMediaArea`, prop `nav`) : leurs
  vraies vignettes, « 2 / 3 » et de grandes flèches, au poste et dans les deux vues de l'éditeur ; la
  flèche « suivant » pulse tant qu'on n'a rien regardé d'autre ; leur nombre sur l'étape dans la liste de
  la Fiche. Pas de glisser sur le média : au poste, glisser change d'étape.
- **Médias d'origine** (toggle `sourceLibrary`, `SourceLibrary`, `src/lib/model/sources.ts`) : ce qui a servi
  à rédiger l'instruction (`Instruction.sources`), à revoir dans l'éditeur (menu « … », et « Voir l'original »
  sous le média d'une étape, qui ouvre la vidéo à l'instant de l'extrait) et, pour qui rédige, en lecture :
  la vidéo entière (`preload="none"`, `stopWhenGone`), les photos en grand (une photo prise en parlant fait
  réentendre sa note, `voiceOf`), les notes vocales et leur transcription, les notes, les documents. Chaque
  média dit à quelles étapes il sert (`sourceUses`) et se met à l'étape ouverte (une vidéo choisit son
  extrait : `MediaPicker` `initial`). Jamais au poste : `clip_published` ne porte pas les sources.
- **Joindre à l'assistant** (toggle `agentAttach`) : le trombone de la conversation envoie tout de suite le
  fichier (`ingestAny`) ; il rejoint les sources de l'instruction (S7…), et le tour suivant le donne à l'IA
  avec la demande, en un seul tour facturé selon sa taille, comme une revue (`agentTurn` `attached`,
  `look_s/m/l` ; `files` et `mediaResolution` passent déjà au serveur : rien dans n8n). Retiré avant
  l'envoi, il quitte aussi les sources.
- **Variantes et version courte** (toggles `variants` et `quickMode`, `src/lib/model/variants.ts`) : une
  instruction pour des tâches presque pareilles (« Pompe A », « Pompe B » : `InstructionContent.variants`,
  deux au moins, et `variantsLabel`) ; chaque étape dit où elle s'applique (`Step.variants`, vide : partout).
  Au poste, une grande tuile par variante, avec son nombre d'étapes, choisit et commence ; ne restent que
  ses étapes (`stepsFor`), et la trace garde la variante (`Execution.variant`). La version courte, si
  l'auteur l'offre (`InstructionContent.quick`) : « L'essentiel » pour les habitués, « Tout en détail »
  (défaut) pour les nouveaux ; `Step.essential`, cochée d'office pour les étapes à points clés ou mise en
  garde (`withQuick`), et toujours pour un relevé, un danger ou une attention (`alwaysEssential` : la
  trace et la sécurité ne se raccourcissent pas). Éditeur : la carte « Variantes et version courte » des
  infos (`VariantsCard`) et, sur chaque étape des deux vues, « Pour » et l'étoile (`StepScope`). L'IA les
  propose à la génération et à l'import quand les sources décrivent plusieurs modèles (schéma `variants`,
  `variantsLabel`, `variants` de l'étape : rien dans n8n), l'assistant les crée (`set_instruction`,
  `update_step`), la traduction traduit leurs noms, le PDF les nomme, une copie de bloc les garde.
- **Ordre et photos des médias** : le média choisi passe avant ou après son voisin (toggle `mediaOrder`,
  `StepMediaEditor`) ; la photo jointe au retour d'un opérateur se voit dans l'éditeur, sous l'étape, et
  « Mettre cette photo à l'étape » en fait une source et un média (toggle `feedbackMedia`,
  `OperatorFeedbackNote`, `photoToStorage` : une photo de la base part d'abord au stockage).
- **Version** (`src/lib/version.ts`) : `APP_VERSION` = 2.0.x ; **le dernier chiffre augmente à chaque mise en
  production**, dans le commit qui part en production. La date et le commit viennent de la build
  (`next.config.ts`, `NEXT_PUBLIC_BUILD_SHA`, `NEXT_PUBLIC_BUILD_DATE`). Affichée sous le menu, dans le compte
  au téléphone et dans Réglages › Données (`VersionLine`), avec la version de l'app mobile.
- **Capturer** (« Nouvelle instruction », `CaptureBoard`) : d'un seul écran au téléphone, qui prend tout
  l'écran comme l'éditeur ; « Filmer le geste » en grand, les quatre autres façons sur une ligne. « Générer »
  ne paraît qu'une fois quelque chose capturé (jamais grisé à vide), en bas, sans rien cacher. Les sources
  restent dans l'ordre de prise, même quand un envoi finit avant un autre. Avant de générer, toucher la vignette
  d'une source l'ouvre en grand avec les autres (« Vos captures », toggle `capturePreview`) : la vidéo se joue, la
  note vocale se réécoute avec sa transcription, la note se lit (`SourceLibrary` en lecture seule).
- **Options de la génération** (« Options » de la capture) : le format, « Annoter les images », « Proposer
  des relevés » (module `records`, retenu sur l'appareil, `src/lib/ai/proposeChecks.ts` ; non : la consigne
  dit aucun et la fin les retire, `ServerJobContext.checks` au serveur ; rien dans n8n) et ce que l'IA lit
  en une fois (`GENERATION_LIMITS` : 30 min de vidéo, 45 min d'audio, 80 photos, 60 pages, en autant de
  fichiers qu'il faut ; la limite la plus proche se dit dès 80 %, `limitUse`).
- **GIF d'un extrait** (toggle `clipGif`) : dans l'éditeur, à la demande (`files.gif`, `gifs/generate`,
  480p, 15 s au plus), téléchargé ou partagé par la feuille du téléphone (`saveFile`). Pas de « GIF » à la
  génération. **À l'étape** (toggle `gifInStep`, `GifDialog`) : « Vidéo · Image · GIF » sur le média ; on
  choisit le début et la fin dans la vidéo (`clampGifRange` : le bout bougé reste, l'autre suit), puis « À
  la place », « En plus » ou « Seulement le partager ». Le GIF est une image qui sait d'où il vient (`gif` :
  la vidéo, l'extrait, l'image d'attente) : « Vidéo » y revient sans rien perdre (légende, verdict, marques).
  L'IA ne lit jamais un GIF (`isAiImage` : ni marques, ni image refaite à la traduction, ni illustration).
- **Enregistrer l'écran** (toggle `screenCapture`, feature `screen_capture`, dès Solo) : à l'ordinateur
  seulement (`canRecordScreen`), sans extension, par le partage d'écran du navigateur ; la voix en option
  (`clip_pref_screen_voice`), dix minutes au plus (`src/lib/media/screenRecorder.ts`). L'app regarde chaque
  image de l'écran en petit (`MediaStreamTrackProcessor` quand il existe : l'onglet de CLIP est en
  arrière-plan) et garde une image nette juste avant chaque vrai changement d'un écran calme, mesuré contre
  l'écran de référence (`ShotPicker`, `src/lib/media/screenShots.ts`) : un clic rapide n'échappe pas, sans
  payer plus d'images par seconde à l'IA. Un seul envoi qui reprend où il s'était arrêté (`ingestScreen`) :
  la vidéo (`Source.screen`) puis ses images (`Source.shot` : la vidéo et l'instant). L'IA reçoit la vidéo
  et au plus 6 images nettes, réparties (`shotsToAttach`, `MAX_SHOTS_FOR_AI`, `src/lib/ai/askFiles.ts`).
  Une image coûte autant qu'une dizaine de secondes de vidéo. Les autres images restent nommées par leur
  instant, et l'IA peut les choisir comme média. Elle reçoit aussi des consignes d'écran (`SCREEN_RULES`) : une étape par action, l'image nette en média avec
  `focusLabel` (entourée ensuite), jamais un mot de passe recopié. L'image d'une étape sait son instant
  (`frame`) : « Vidéo » et « GIF » en repartent. Aussi dans l'assistant (bouton à côté du trombone).
  Consignes et fichiers passent tels quels au serveur : rien dans n8n. Les repères que l'IA pose
  (automatiques ou « Annoter par IA ») prennent un trait fin autour d'un petit élément (au plus 15 % de
  l'image) et partout sur une image d'écran (`MarkHint.screen`). La dernière grosseur choisie à la main
  l'emporte si elle est plus fine (`autoMarkSize`, `clip_pref_annot_style`, `src/lib/annotations/lastStyle.ts`).
- **L'IA qui apprend des corrections** (toggle `learnFromEdits`, `src/lib/learning/`) : la génération garde
  le texte de sa version (`generation.original`) ; à la première publication, ce que la personne a corrigé
  part dans `clip_edit` (`editSignals` : longueurs, points clés, mises en garde, étapes, mots remplacés,
  quelques exemples) et la version de l'IA s'efface (`learnedAt`). Quand une habitude revient dans au
  moins 3 instructions et 60 % des dernières (`proposeRules`, sans IA), la carte `LearningCard` le dit
  après la publication : « Oui, pour moi », « Pour toute l'usine » (droit `settings` et feature
  `ai_learning`, dès Équipe), « Non merci » (ne revient pas). Chacun a ses préférences (`clip_writing`,
  versionnées, dix versions), que l'IA suit après le standard de l'usine (`standardBlock`, aussi pour
  l'assistant) ; un 👎 commenté va à l'usine si c'est l'administrateur, à la personne sinon. « Prendre
  comme modèle » (menu « … ») : l'IA en tire des règles de style (`learn_rules`) et l'instruction devient
  un exemple que la génération imite (`examples`, trois pour l'usine, deux par personne). Réglages ›
  Standard : « Mes préférences » et, pour l'usine, ce que les corrections de l'équipe proposent et
  « Analyser avec l'IA ». Tout passe tel quel dans la requête : rien dans n8n.
- **Gabarits du PDF** (toggle `printTemplates`, `src/lib/pdf/template.ts`, « Mise en page » à côté de
  l'aperçu d'impression) : pour tous, trois dispositions (étapes en grand, tableau, une page) en portrait ou
  en paysage ; avec `brand_kit`, le cartouche, le pied de page de chaque page (numéro, version, page), la
  couleur et « D'après un exemple » (l'IA lit une instruction de l'usine, usage `print_template`). L'usine
  garde la sienne (`OrgSettings.print`) ; « Une page » se réduit pour tenir (`nextScale`, mesuré dans
  l'aperçu).
- **Parler pendant les photos** (toggle `photoVoice`) : le micro s'ouvre avec la caméra photo (une pastille
  le dit et le ferme ; le dernier geste se retient sur l'appareil). Un seul enregistrement par série,
  jamais coupé ; chaque photo garde son instant (`Source.voice`, `src/lib/media/photoVoice.ts` ; dans l'app,
  `camera.photo` avec `voice`, `docs/pont-natif.md`). L'IA reçoit la note en fichier et l'instant de chaque
  photo, et les apparie (`prepareForAi`).
- **Deux façons de modifier** (toggle `editorViews`) : « Comme au poste » (l'étape telle qu'au poste,
  modifiée sur place) et « Fiche » (la liste des étapes, tous les outils de l'étape choisie à
  découvert, en cartes ; au téléphone, la liste puis l'étape ; une étape se glisse par sa poignée et
  rejoint la section où on la lâche, `placeStep`), retenues sur l'appareil
  (`clip_pref_editor_view` ; sans choix, la fiche au bureau, le poste au téléphone). Une fonction
  nouvelle de l'éditeur existe dans les deux. L'Aperçu (l'œil) est le lecteur du poste, pas une vue.
  En-tête commun : `src/components/editor/EditorBar.tsx`. L'assistant flotte par-dessus l'éditeur, dans
  le coin, sans le tasser, et se réduit en pastille ; au téléphone, la pastille se pose au-dessus de la barre
  du bas, à droite (annuler est à gauche ; `aboveBar`, au-dessus des boutons du lecteur dans l'aperçu), le
  bouton Assistant de la barre la rouvre (`wake`), et ouvert, il dit ce qu'il cache (`--agent-inset`) pour que
  la fin de la page défile au-dessus de lui (`pb-agent`) ; au bureau large (≥ 1280 px), la Fiche va sur deux
  colonnes (ce qu'on écrit à gauche, ce qu'on montre et relève à droite).
- **Lire ou modifier** (`src/lib/ui/libraryMode.ts`) : dans la bibliothèque, qui rédige choisit ce que
  fait le toucher d'une carte (« Modifier » ou « Lire », retenu sur l'appareil, `clip_pref_library_mode`) ;
  « Lire » ouvre la version publiée (`/instructions/[id]/lire`), avec « Modifier » dans son en-tête.
  Qui ne rédige pas lit toujours la version publiée : `/instructions/[id]` l'y envoie. Au téléphone, glisser change d'étape comme au
  poste (toggle `editorSwipe`, `src/lib/ui/swipe.ts`) : sur un champ qu'on n'écrit pas aussi, jamais
  clavier ouvert, depuis une vidéo, une rangée qui défile ou par un appui long.
- **La lecture au téléphone** (toggle `phoneReader`) : le média à ses vraies proportions, qui cède au
  texte sans descendre sous 38 % de la place (une vidéo garde toute sa largeur et ses commandes
  dessous) ; côte à côte quand on tourne le téléphone ; « Tout voir » depuis le sommaire
  (`src/lib/media/fit.ts`, `ratio.ts`).
- **Qui est à la tablette** (toggle `operators`) : l'opérateur n'a pas de compte, un nom et un code à
  4 chiffres (page `/equipe`, `clip_operator`, `src/lib/model/operators.ts`). Le code se donne et se
  vérifie au serveur (`/api/operators/pin`, `/api/operators/verify`, `src/lib/server/operators.ts`) ;
  la base n'en garde qu'une empreinte HMAC (clé `CLIP_PIN_SECRET`, sinon dérivée de `ABLY_KEY`). La
  portée d'un lien est figée à sa création : elle porte une version (`LINK_SCOPE_VERSION`), et un
  vieux lien se met à jour sans réimprimer le QR (`linkFollow`).
- **Relevés et registre** (toggle `records`) : une étape peut demander une mesure, un oui ou non, un
  choix, un texte ou une photo (`Step.checks`, `src/lib/model/checks.ts`) ; un écart exige une note,
  et on ne passe pas une étape incomplète. La trace s'écrit à la fin dans `clip_execution`
  (`src/lib/model/executions.ts`, file d'attente si le réseau manque) et se lit dans `/registre`.
  Les limites d'une mesure ne s'inventent jamais. Les relevés que l'IA prépare sont des propositions
  (`proposed`) : l'auteur les garde ou les retire ; ni le poste ni la publication n'en voient une
  (`liveChecks`, `withoutProposals`).
- **Module Relevés** (toggle `recordsPlus`, feature `records_plus`) : la liste à cocher (conforme,
  pas conforme, sans objet), les mesures répétées (chaque lecture jugée), « comment mesurer », le
  scan d'un numéro de lot, plusieurs photos, l'écart à faire autoriser ; au registre, les tendances
  de chaque mesure et l'export CSV (`src/lib/model/trends.ts`, `src/lib/util/csv.ts` : point-virgule
  et virgule décimale en français, un nombre reste un nombre, jamais une formule). Module échu : les
  relevés déjà écrits marchent toujours au poste.
- **Approbation à plusieurs** (toggle `multiApproval`, mode `all`) : chaque groupe de l'usine signe
  (`src/lib/model/approvals.ts`) ; une signature vaut pour le contenu signé (empreinte), la dernière
  publie. Toggle coupé, le mode se comporte comme une seule approbation.
- **Avertir les bonnes personnes** (toggle `notify`) : « À voir » (la cloche) se calcule des données ;
  les courriels et notifications partent du serveur (`/api/notify`) par le lien de service de l'usine,
  scellé par le serveur (`src/lib/server/keys.ts`) et recopié sur chaque poste (`notifySeal`).
  Chaque personne tient sa fiche `clip_contact` (courriel, langue, téléphones). Le push sur le
  téléphone (`push.register`, expo-notifications) demande une build EAS.
- **Des milliers d'instructions** : aucun écran ne lit toute la bibliothèque. Chaque instruction porte
  un index (`searchText`, tenu par `createInstruction`, `saveDraft` et la publication) et la recherche
  se fait au serveur, une page à la fois (`src/lib/model/search.ts`, hooks de `src/hooks/queries.ts`
  sous la clé `instructions`). Les postes se regroupent en secteurs (`Station.area`) ; le numéro de
  document (`number`, « IT-0042 ») se donne à la première publication. Au poste, la liste lit la
  fiche des versions publiées (`Published.card`) ; l'instruction complète se lit à l'ouverture.
- **Mises à jour au poste** (toggle `operatorUpdates`, `src/lib/model/updates.ts`) : la version
  publique garde ce qui a changé (`Published.changes`) et la version d'avant (`Published.previous`) ;
  au poste, « Mise à jour le … », les étapes nouvelles ou modifiées marquées, la version précédente en
  lecture, et « Mis à jour » sur la carte, jusqu'à ce que l'appareil ouvre la nouvelle version.
- **Nomenclature** (toggle `nomenclature`, Réglages › Classement ; « La nomenclature de l'usine »,
  `docs/architecture.md`) : chaque usine se donne ses familles d'étiquettes, une liste de valeurs ou
  une valeur libre (département, machine, produit, BT…). Le classement (`Instruction.labels`) se range
  en texte par famille, hors du contenu (pas de version), et la version publiée suit aussitôt
  (`saveClassification`). L'IA le propose à la génération (`nomenclatureBlock`, champ `labels` du
  schéma : rien à changer dans n8n) et à la demande (`classify`), sans rien inventer dans une liste
  (`labelsFromAi`). Un poste prend aussi ses instructions par règle (`Station.rule` : OU dans une
  famille, ET entre les familles) ; elle s'écrit dans `ruleStationIds` et dans `stationIds` de la
  version publiée (`applyStationRule`), et toute requête « instructions d'un poste » passe par
  `atStations`. **Le nom des instructions** (toggle `nameTemplate`) : jusqu'à trois familles devant le titre
  (`Nomenclature.naming`, « Découpe – Presse P-12 – Changer le filtre », `namePrefix`, `displayName`) ; le
  titre reste l'action, le nom se compose à l'affichage (`useInstructionName`, bibliothèque, éditeur,
  lecture, PDF) ; la version publiée en garde le début (`Published.namePrefix`, à la publication, au
  classement et quand le modèle change, `renamePublished`), que le poste et les liens lisent
  (`usePublishedPrefix` ; le lecteur le pose devant le titre dans chaque langue).
- **Académie** (module ; toggle `academy`, feature `academy`), dans Équipe › Compétences, en quatre
  vues : « À faire » (d'entrée : qui former, le plus pressé d'abord, `todoList`), Qualifications,
  Parcours, Couverture ; « Former quelqu'un » (un poste, des personnes, une date) écrit `clip_assignment`
  (`src/lib/model/assignments.ts` ; les postes habituels comptent aussi), une formation en retard paraît
  dans « À voir », et un guide en trois gestes dit où l'usine en est. Le parcours d'un poste = ses
  instructions publiées (y compris par règle) ; un superviseur (droit `approve`) valide sur le
  terrain, « qualifié » ou « peut former » (`clip_qualification`, un journal : la plus récente fait foi,
  et c'est le registre) ; la qualification se revalide tous les 6, 12 ou 24 mois
  (`OrgSettings.academy`), rappelée dans « À voir » un mois avant ; couverture par quart, registre
  CSV, attestation à imprimer (`/equipe/attestation/[id]`). `src/lib/model/academy.ts`. Sans le
  module, la matrice simple et une invitation à l'essai.
- **Blocs communs** (toggle `sharedBlocks`, feature `shared_blocks`) : des étapes rédigées une fois
  (cadenassage, démarrage, EPI) dans une instruction marquée `block`, qui ne va à aucun poste
  (`src/lib/model/blocks.ts`). Dans une instruction, ses étapes sont des copies verrouillées
  (`Step.fromBlock`, identifiant `copyId`) ; publier le bloc republie les instructions à jour et
  met à jour le brouillon des autres (`propagateBlock`). « Insérer un bloc commun » se trouve à côté de
  « Ajouter une étape » (liste de la Fiche, bande de « Comme au poste »), pas seulement dans le menu « … ».
- **Formation** (toggle `training`) : 3 à 5 questions par instruction, préparées par l'IA (`quiz`,
  `src/lib/ai/quiz.ts`) et retouchées par l'auteur ; elles vivent dans le brouillon et se traduisent
  avec lui. Au poste, une personne nommée les passe à la fin ; réussie à 80 %, la trace s'écrit dans
  `clip_training` (`src/lib/model/training.ts`). La matrice (Équipe › Compétences) croise personnes
  et postes ; « Il faut se re-former » à la publication (`trainingVersion`) fait tomber les
  formations d'avant. Pas un LMS (`VISION.md`).
- **Rapports** (toggle `reports`, page `/rapports`, à la place de Statistiques dans le menu) : un
  répertoire à la K2 Cadence, des modèles prêts qui répondent chacun à une question (revue de la
  semaine, temps par instruction, qui a fait quoi, par poste, écarts, avant / après une révision,
  formation, retours, bibliothèque, crédits d'IA ; l'adoption reste `/statistiques`), sur 7, 30 ou 90 jours de
  calendrier comparés à la même fenêtre d'avant, par lieu et par quart. Le code calcule chaque chiffre
  (`src/lib/reports/facts.ts`, `catalog.ts`) : un taux en somme sur somme, un temps en médiane et
  « 9 fois sur 10 », une durée hors de 10 s à 12 h exclue des temps, « peu de données » sous 5
  réalisations. L'IA ne fait que les commenter (`narrative.ts`, `report_summary` et
  `report_question`), avec une analyse automatique en repli. Les personnes vont par ordre
  alphabétique : un registre, jamais un palmarès. La revue de la semaine est ouverte à tous ; les
  autres viennent avec `adoption_stats`. Un rapport lit au plus 30 000 événements, par pages de
  10 000, et 5 000 travaux (`load.ts`), et le dit.
- **Mesure du site** (`src/lib/site/consent.ts`, `SiteAnalytics`) : Google Analytics 4 en Consent Mode v2, mode
  de base : rien avant « Accepter » (la bannière nomme les outils branchés, `{tools}`) ; la mesure d'audience
  seulement, publicité refusée ; refuser efface `_ga`. Événements du moteur marketing : `vue_prix`, `clic_essai`,
  `clic_demo`, chacun avec `offre`, `type_page`, `langue`, `emplacement` ; depuis l'app, au retour du paiement,
  `essai_commence` ou `abonnement`, puis `abonnement` quand l'app voit l'essai converti (`src/lib/billing/funnel.ts`,
  jamais dans l'aperçu). **Tests A/B** (toggle `siteExperiments`, `src/lib/site/experiments.ts`, `useArm`) : un bras
  par visiteur, tiré seulement avec l'accord et gardé dans le navigateur (`site_xp`, oublié au refus) ; sans
  accord, le témoin. Chaque événement porte les bras vus (`experiences`) et le tirage envoie `experience_vue`. Le
  moteur marketing décide, lit et tranche (`marketing-2.0`, `plan/experiences.md`) ; un test s'ouvre, se ferme ou
  prend son gagnant (`winner`) dans le registre, et un test du catalogue (forfait ou durée de l'essai) ne se fait
  qu'avant / après. Réglages de la build :
  `NEXT_PUBLIC_GA_ID` (le flux `G-…` de la marque : chaque marque a sa propriété), `NEXT_PUBLIC_GSC_VERIFICATION`
  et `NEXT_PUBLIC_BING_VERIFICATION` (les jetons de vérification), `NEXT_PUBLIC_HUBSPOT_ID` (CLIP seulement).
- **Le film du site** (`src/lib/site/media.ts`) : deux voix, `FILMS` et `filmFor` (le français sur la page
  française, l'anglais sur les dix-sept autres, avec les sous-titres de la page allumés : `public/site/video/en/`),
  et les boucles muettes tirées du film de la même voix (`loopsFor`) ; les MP4 au stockage, jamais dans git. Le film
  anglais se refait dans `motion/en/` (son export : `scripts/export.sh`, sur la demande de la personne). Une photo
  dont le film a le plan se montre en mouvement (`photoMotion` : cadenas, copeaux, huile, poste, capture, Jacques,
  l'usine ; `PhotoCard` avec la langue). La démo du poste garde un seul lecteur d'une étape à l'autre, lancé par le
  toucher (un iPhone en économie d'énergie ne lance rien seul) et ramené à l'écran ; si l'appareil refuse, un grand
  bouton de lecture le dit (`LoopVideo`).
- **Feature toggles** : `GET /api/config` (`CLIP_TOGGLES`) ; une fonction nouvelle ou risquée y passe,
  et le repli n'active jamais une fonction nouvelle.
- **Sections, relecture, exigences d'Apple** : `Step.section` (une longue instruction en phases, et le
  sommaire au poste ; `src/lib/model/sections.ts`) ; `Instruction.renewal` (« à revoir dans 1 an »,
  rappelé un mois avant ; `src/lib/model/renewal.ts`) ; rien ne part vers l'IA sans l'accord de la
  personne (`requireAiConsent`, `src/lib/ai/consent.ts`), donné à la connexion par une ligne sous le
  bouton (toggle `aiConsentAtSignIn` ; Google pour tout, OpenAI pour les images qu'on lui demande),
  jamais par une fenêtre au premier usage, retiré ou redonné dans Réglages › Données ; « Supprimer mon
  compte » dans Mon compte.
- **Interface** : dix-huit langues (`LANGS` de `src/lib/i18n/core.ts` : français du Québec, anglais, espagnol,
  portugais du Brésil, allemand, italien, polonais, néerlandais, tchèque, roumain, hongrois, turc, chinois,
  japonais, coréen, vietnamien, indonésien, thaï), par les dictionnaires typés de `src/lib/i18n`
  (`useMessages()` dans un composant, `messages()` ailleurs ; aucun texte écrit dans un écran, aucun
  `'fr-CA'` en dur ; règles dans `docs/architecture.md` §7). Le français (la source) et l'anglais (le repli)
  sont toujours chargés ; les autres à la demande (`loadLang`, `loadMessages` pour un PDF ou un courriel ;
  `messagesIn` rend l'anglais en attendant). Découvrir ne parle que français et anglais (`decouvrir` vient de
  l'anglais). Le lecteur du poste a un fichier par langue (`src/components/player/i18n/`, `usePlayerStrings`) ;
  le site, un dictionnaire par langue (`src/lib/site/content/<langue>.ts`) et ses pages sous `/<langue>` (slugs
  anglais, `(site)/(intl)/[lang]`) ; la coquille mobile, ses écrans natifs et les textes des permissions d'iOS
  (`apps/mobile/src/i18n/<langue>.ts`, `apps/mobile/locales/<langue>.json`). Les guides du site
  (`src/lib/site/guides/`, pages `/guides`) ne se montrent qu'une fois approuvés par une personne
  (`GUIDES_APPROVED` : avant, `noindex`, hors du plan du site et des liens). Un texte qui change en français se reporte dans les dix-sept autres
  langues (une passe de traduction, les clés changées données par une comparaison des fichiers). Design system « verre » de
  `src/app/globals.css` (tokens, `glass-*`), une seule action principale par écran, trois états pour
  toute donnée asynchrone, cibles d'au moins 44 px, mode sombre (le gris `slate-500` y passe à
  `slate-400`, `--primary-soft` à une teinte translucide de la primaire, et le texte teinté à
  `--primary-light`, qui suit le thème : jamais un bleu ciel codé en dur).
- **Couleur et logo** (décision du 2026-11-16 ; une marque, un symbole depuis le 2026-11-17 : `PRODUCT.mark`) : la couleur par défaut est l'indigo de CLIP, `#5B4CF0`
  (`BRAND`, `src/lib/brand/colors.ts`, mêmes valeurs que `:root`, un test les compare) ; les boutons et
  le logo prennent un dégradé de l'indigo vers le bleu (`#7C5CFF` → `#3D6BF5`), sans rose. Le thème par
  défaut garde son identifiant historique `ocean` (« Indigo ») ; le bleu II d'avant est le thème `bleu`
  (« Océan ») d'Apparence, et le dégradé violet vers bleu, celui de l'accent, le thème « Royal ». Chaque
  thème garde un fond calme : des voiles de sa couleur à 12 % au plus, jamais de rose (un dégradé
  soutenu « fait princesse » au bureau ; un test le tient), sans réglage pour l'enlever. Une personne
  (`Avatar`, `src/components/ui/Avatar.tsx`) prend le ton pâle de la couleur : ni le dégradé du logo, ni
  celui de l'accent, réservé à l'IA et aux modules. La couleur de
  l'usine ne compte que si ce n'est pas une couleur par défaut (`brandColorOf` : l'ancien `#0078FF`, que
  Réglages enregistrait tel quel, et le violet d'une heure ne comptent pas). Le logo est le 6, « La pile
  d'extraits », pris dans la banque des 10 propositions (`src/lib/brand/marks.ts`, `BRAND_MARK` ;
  planche : https://claude.ai/artifact/1AZ4YAPmZyxX5L9fGKiG1N) ; `LogoMark` le pose sur le dégradé
  du thème. Changer de logo : `BRAND_MARK`, puis `npm run brand-icons` (apps/web) refait le favicon,
  l'icône d'accueil et les icônes de l'app mobile, prises à la prochaine build native.
- **Des dizaines de personnes** : toute liste de personnes (ou qui peut grandir) a sa recherche dès
  8 éléments (`SearchField`, chaque mot cherché : `searchTokens`/`matchesTokens`,
  `src/lib/util/people.ts`) et des filtres simples où ils servent (quart, lieu, rôle, « à revalider ») ;
  choisir parmi beaucoup passe par `PeopleChips` (les choisies d'abord, 24 autres au plus, recherche
  dès 12). À la tablette, « Qui êtes-vous ? » : les gens du poste d'abord, une grande recherche, jamais
  de clavier qui s'ouvre tout seul. `?q=` ouvre l'Équipe ou le registre déjà cherchés.

## Pièges déjà rencontrés

- Un style posé sur la racine (la couleur de l'usine, `applyBrandColor`) bat la règle `:root.dark` : un
  ton qui doit changer en sombre passe par sa propre variable (`--brand-soft`, que `--primary-soft`
  reprend en clair seulement). Sinon, fond pâle et texte blanc en sombre (points clés illisibles,
  novembre 2026). Le bleu foncé `text-[var(--primary-strong)]` a toujours sa couleur `dark:` dans la
  même chaîne de classes (`tests/theme-dark.test.ts`).
- Un jeton gardé ne vaut que pour la Gateway et l'application qui l'ont donné : la session les retient
  (`clip_session_of`, `SESSION_ORIGIN`, `src/lib/gateway/client.ts`) et oublie un jeton d'ailleurs ou
  sans marque. Sinon, au passage de main de la QA à la prod (novembre 2026), TestFlight restait sur
  « Impossible d'ouvrir CLIP » jusqu'à réinstaller l'app. Cet écran garde toujours « Se déconnecter », et
  un profil refusé (401, 403) renvoie à la connexion. Une erreur en page HTML (un service derrière la
  Gateway qui ne connaît pas la route) ne s'affiche jamais telle quelle.
- La Gateway refuse l'envoi de fichiers au rôle `guest` d'un lien public (routes
  `files/upload/generate/presigned-url` et `files/upload/direct` : `user` et `admin` seulement) : une
  photo prise au poste passe par la base (`guestPhotoSaver`), jamais par `files.upload`.
- `cn` ne fusionne pas les classes : sur un composant qui pose déjà `inline-flex`, cacher avec
  `max-sm:hidden`, pas avec `hidden sm:inline-flex`.
- N'écrire que `backdrop-filter` : avec `-webkit-backdrop-filter` à côté, Lightning CSS ne garde que la
  version préfixée et Chrome perd tout le flou.
- Un `id` dans un SVG (dégradé) doit être unique par instance (`useId`) : celui d'un élément masqué ne
  se prête pas.
- La coquille doit rester autonome : la publication Expo Go ne copie que `apps/mobile`. Aucun import
  hors de ce dossier ; après un changement de `packages/bridge`, `cd apps/mobile && npm run sync-bridge`
  (un test de la coquille échoue sinon).
- Une route du serveur (`src/app/api`) ne tire jamais `@/lib/i18n` : ses hooks React font échouer la
  build. Ce qu'une route peut atteindre (`gateway/client`, `gateway/data`, `model/repo`,
  `model/catalog`) importe `@/lib/i18n/core`.
- jsdom n'a ni `matchMedia`, ni `ResizeObserver`, ni `scrollIntoView` : un test qui affiche une vue
  de l'éditeur les remplace (`tests/form-view.test.tsx`).
- `next dev` écrit `apps/web/AGENTS.md` (ignoré par `.gitignore`) et retouche `next-env.d.ts` (il y met
  `.next/dev/types`) : ne pas les committer ; `git checkout -- apps/web/next-env.d.ts` une fois le serveur arrêté.
  Si `next dev` recharge une page en boucle (« HMR hash mismatch », un `restart` de Turbopack à chaque
  connexion, des centaines de chargements ; novembre 2026, sans aucun changement du code), c'est son cache :
  arrêter le serveur, effacer `apps/web/.next/dev`, relancer.
- Les enveloppes des routes Data ne sont pas uniformes (`result` sur `/one`, `count` sur `/count`) :
  passer par `dataApi`.
- Une requête Data rend au plus 10 000 documents : un `limit` plus grand répond 400 (« limit must be
  an integer between 0 and 10000 ») et l'écran tombe en erreur. Au-delà, paginer avec `skip`
  (`loadEvents`, `src/lib/reports/load.ts`) ; le test se fait contre une fausse Gateway qui refuse
  comme la vraie (`tests/reports-load.test.ts`).
- Un `mongo_filter` a au plus 5 niveaux (au-delà : 400, « mongo_filter exceeds maximum depth of 5 »).
  `dataApi` aplatit chaque filtre sans en changer le sens (`flattenFilter`, `src/lib/gateway/data.ts`) ;
  avec `html`, le `$and` du slug le faisait déjà, et le passage à `clip-v2` a fait tomber « À voir » et
  l'accueil (novembre 2026). `tests/filter-depth.test.ts` compte la profondeur comme la Gateway.
- La route de l'assistant (`/api/v4/assistant/ask`) découpe une demande de plus de 10 fichiers en lots de 10
  (flux n8n `Route_Ask_AI_V4_Split_Flow`). Elle envoie chaque lot seul à l'IA, puis recolle les réponses en
  « descriptions » d'images : une instruction s'y perd (« aucune étape ») et chaque lot se paie (un
  enregistrement d'écran de 55 s et ses 25 images : 3 lots, 139 crédits, novembre 2026). `aiApi.ask`
  refuse donc au-delà de `MAX_ASK_FILES`, sans rien envoyer ni débiter. Une génération ou un import plus
  gros passe par Job_start, qui appelle Ask_AI_V4 sans découpe. Cette route ne passe ni `effort` ni
  `maxOutputTokens`, et Job_start non plus pour `effort` : un niveau de réflexion se donne par `thinking`
  lui-même (`'low'`, que Ask_AI_V4 accepte).
- En prod, le stockage refuse l'origine de l'app au PUT présigné (CORS, novembre 2026) : chaque petit
  fichier faisait deux allers-retours perdus avant l'envoi par la Gateway. Après un premier refus, la séance
  envoie directement par la Gateway (`presignedBlocked`, `src/lib/gateway/files.ts`).
- Le prix d'un crédit d'IA en argent ne s'affiche jamais : ni à l'écran, ni dans les textes, ni sur le
  site ; les prix se disent en crédits. Il ne vit qu'à un endroit du code, la constante
  `AI_CREDITS_PER_CAD` (`src/lib/config.ts`), le taux standard de la plateforme.
- Dans n8n, les routes Mongo (`Route_MongoDB_*`) n'acceptent que les workflows de leur propriétaire,
  et un workflow créé par le MCP n8n n'en est pas : son appel est refusé (« The sub-workflow … cannot
  be called by this workflow »). Comme V1 (`Job_Analyse_CLIP`), on écrit depuis un workflow de ce
  propriétaire : Job_start, qui se relance lui-même pour ne pas faire attendre la Gateway. Chaque
  écriture envoie tout `json_data`, repris du document relu, comme V1.

## Facturation

- Le catalogue (plans, prix, crédits) vit dans `billing.manifest.yaml`, à la racine. On ne le modifie
  qu'en passant par ce fichier, jamais par une écriture directe en base. Il doit passer la simulation
  de `billing-publish` avant d'être publié ; le verrou `billing.manifest.lock.json` dit ce qui est
  publié : la version 1 en QA, le 2026-11-18 (Stripe en mode test : les produits Solo et Équipe, leurs 4 prix), puis
  le nom du produit, « Kiplo » (`product.name`, le titre du portail Stripe ; un nom change sans nouvelle version).
  La simulation annonçait « aucun prix Stripe » : l'écriture les a créés quand même. Le produit facturé est `clip-v2`, l'application de la connexion à la
  Gateway (`PRODUCT_SLUG`, `product.slug`) : les deux marques, un seul catalogue.
- La grille (manifeste, décision du 2026-11-16, volume et essai du 2026-11-17) : sur le web seulement (Stripe),
  seulement des forfaits d'entrée, tous plafonnés, rien d'illimité : **Sans abonnement** (le plan par défaut :
  aucune IA, 1 rédacteur, 3 publiées, 1 poste ; plus de crédits offerts sans fin) · Solo 49 $/mois (1, 15, 3,
  2 500, l'écran) · Équipe 199 $/mois, mis en avant (5 rédacteurs, 75 publiées, 15 postes, 12 500, l'IA qui
  apprend de l'équipe). **L'essai** (décision du 2026-11-18) : seule Équipe s'essaie 7 jours (`trial_days`), une
  fois par organisation ; Solo s'achète sans essai (pas d'essais bon marché qui ne se convertissent pas). La carte se
  donne au paiement Stripe et l'abonnement commence à la fin de l'essai, sauf annulation ; on le dit avant (la carte
  du forfait, `trialTerms` ; les questions du site, jetons `{trialPlan}` et `{aiPlansOr}`) et pendant (« Essai
  jusqu'au … », `trialUntil`). « Essayer Équipe 7 jours », `tryPlan`, `trialNote`.
  **Le volume** : Équipe donne 5 fois Solo pour 4 fois le prix, chaque poste, rédacteur, instruction et
  crédit y revient ~20 % moins cher (un test le tient) ; Usine descend encore, au contrat. **La durée** :
  annuel = 10 mois ; 3 et 5 ans (jusqu'à 25 %), au contrat d'Usine (`multiYear`, sur le web seulement).
  Toute l'usine passe par l'équipe de CLIP : **Usine** (15 rédacteurs, illimitées, 100 postes, 40 000) n'a
  aucun prix, ne s'achète nulle part et s'attribue à l'organisation après la vente ; il remplace l'ancienne
  carte Entreprise du site. **Recharges de crédits** : pas encore (la plateforme refuse un achat à une
  usine déjà abonnée, `checkout` en 409, et n'a pas de route de recharge) ; d'ici là, le plan qui en donne
  plus, ou l'équipe de CLIP (don de crédits par la console).
- **Sur devis** (`byQuote`, `src/lib/billing/catalog.ts`) : un plan ou un module sans prix, autre que le
  gratuit (`FREE_PLAN`, le `default_plan_code`). La page Abonnement, la fenêtre des refus, la jauge et le
  dossier pour la direction le nomment « Sur devis » ; sur le web, « Parler à l'équipe CLIP » mène à
  `/rendez-vous` (`salesHref`) ; dans l'app mobile, une phrase sans lien ni prix (règles des magasins). Le
  conseiller d'achat ne le propose jamais (rien ne s'achète). Les limites d'instructions et les crédits
  concordent : chaque banque permet d'atteindre la limite même à partir de longues vidéos (150 crédits
  la génération ; mesuré en QA : 16 à 55), un test le tient.
- Les modules en option (`kind: addon`), avec Usine seulement, sur devis comme elle (sans prix ni essai) :
  Académie (feature `academy`, `academie-usine`) et Relevés (`records_plus`, `releves-usine`). L'app ne
  propose que le module de son plan (`MODULES`, comparé au manifeste par le test). Le rattachement au
  plan de base n'a pas de champ documenté : la simulation de `billing-publish` le confirme. Un module se
  montre seulement une fois bâti (toggles `academy` et `recordsPlus`, allumés : les deux le sont). Kiplo n'en
  propose aucun, ni la phrase d'Usine (`sellableModules`, `PRODUCT.enterprise`).
- Ce qui se facture : `ai_credits`, une banque de crédits d'IA par mois · `published_instructions`,
  `stations` et `editors`, des limites par plan (comptées par l'app, `capacity_source: reported`) ·
  `translations`, `adoption_stats`, `approvals`, `bulk_import`, `voice_assistant`, `brand_kit`,
  `full_export`, `shared_blocks`, `screen_capture`, `ai_learning`, oui ou non selon le plan. Les opérateurs et
  les lecteurs ne se comptent jamais.
- **L'IA au coût réel** : aucun prix fixe, rien ne se prédit. Pas de section `ai_operations` au
  manifeste, aucun prix sur un bouton : chaque réponse de l'IA est débitée, une fois terminée, de ce
  qu'elle a vraiment coûté (`aiApi.ask`, `src/lib/gateway/ai.ts`, l'askAi du skill `billing`).
  Drapeau allumé : le solde de `ai_credits` est relu (à zéro ou moins, refus 402 sans appel ; hors du
  plan, 403), l'appel part sur `/api/v4/assistant/ask`, puis le coût réel que rend la réponse
  (`billing.costs.cad`, `billing_merged` pour plusieurs lots) est converti en crédits, arrondi au
  crédit supérieur, et débité par `POST /api/v2/billing/consume` avec la clé de l'appel. Une réponse
  lancée est payée en entier, même sous zéro (`enforce_denial: false`) ; une réponse en échec qui rend
  un coût est débitée de ce coût ; sans coût (délai, coupure), rien n'est débité. Un débit en panne se
  réessaie avec la même clé, puis va au journal (`onAiDebitError`, `clip_event` avec `debitFailed`) :
  la personne garde sa réponse. Après coup, l'écran dit ce qui a été débité (`CostChip`, « IA · 23
  crédits utilisés »). Compromis accepté : c'est l'app qui débite, une app modifiée pourrait sauter le
  débit. Drapeau éteint, l'appel d'avant ne change pas et rien n'est débité.
- **Le taux** (crédits par dollar de coût réel) est la constante `AI_CREDITS_PER_CAD`
  (`src/lib/config.ts`), le taux standard de la plateforme ; rien à régler dans Vercel. Dans l'aperçu,
  `CostChip` montre aussi ce qu'une réponse aurait coûté, sans rien débiter. Le nom de chaque usage (`AI_OPERATIONS` : `generate_m`,
  `report_summary`…) va au registre avec le coût, le modèle et les tokens. La taille d'une génération
  ou d'un import (`generationTier`, `src/lib/ai/generate.ts`) ne fixe plus de prix : au-delà de la
  plus grande taille, l'app demande toujours de séparer l'instruction.
- Les routes de facturation passent par la passerelle Octopus, avec le jeton de l'utilisateur et
  `X-Product: clip-v2` (`src/lib/billing/client.ts`) : `GET /api/v2/billing/context` (plan, état,
  crédits restants), `POST /api/v2/billing/check` (droit à une feature), `POST /api/v2/billing/consume`
  (le débit du coût réel d'une réponse de l'IA), `GET /api/v2/billing/plans` (page des plans),
  `POST /api/v2/billing/checkout` (paiement Stripe, réservé à l'administrateur de l'organisation) et
  `POST /api/v2/billing/portal` (gérer son abonnement).
- Le droit d'utiliser une feature se vérifie côté serveur, au moment de rendre le service. Une
  feature absente vaut « non ». Les limites `reported` ne sont pas reçues par la plateforme : l'app
  compte et compare au plafond lu dans l'état (`limitOf`), et le verrou de l'écran n'est alors pas une
  protection. Un état illisible ferme la fonction (`useEntitlement` rend `locked`, `useLimit` une
  limite atteinte) et `useGate` relit l'état avant de servir une fonction encore « pending » ;
  drapeau éteint, rien n'est verrouillé. Une organisation jamais abonnée : la plateforme rend `state: 'none'`,
  `plan_code: null` et aucune limite (QA, 2026-11-18) ; l'app lui applique les plafonds du plan par défaut
  (`withDefaultPlan`, sinon « 0 sur 0 » bloquait tout) et lui propose l'essai (`onFreePlan`).
- Un refus de facturation se montre tel quel par la fenêtre `Paywall`
  (`src/components/billing/Billing.tsx`, alimentée par `src/lib/billing/bus.ts`) et par la page
  `/reglages/abonnement` : 402 faute de crédits, 403 faute de droit. Il ne se transforme jamais en
  erreur 500 et ne déclenche aucun autre appel ; rien n'est débité.
- Un nouvel appel à l'assistant passe par `aiApi.ask`, sans exception : un appel direct à
  `/api/v4/assistant/ask` ne serait pas débité. Seul l'assistant rend un coût : restent ouverts sans
  débit la génération d'image (`ai:generate_image`, dans `illustrate` et `translate_image`), la
  transcription des notes (`files:transcribe`), le traitement des vidéos (`files:process*`) et le
  montage de la vidéo des étapes (`files/videos/compose`, un par publication où un extrait a changé). Restent aussi ouverts, sans débit à la minute, la
  lecture à voix haute et l'assistant vocal, tous deux par la voix en direct (`ai:live`). La lecture
  (`LiveSpeaker`, `src/lib/liveSpeech.ts`) est ouverte à tous, liens publics compris. L'assistant
  est réservé au plan Usine par la feature `voice_assistant`, et sur un lien public au poste qui l'a
  demandé (`assistant:ask`).
- Les libellés des features (clé → texte, en français et en anglais) vivent dans `FEATURE_LABELS` de
  `src/lib/billing/catalog.ts` ; `tests/billing-manifest.test.ts` échoue si une feature du manifeste
  n'y est pas, ou si l'IA retrouve un prix fixe (`ai_operations`).
- Le branchement, app web : le drapeau public `NEXT_PUBLIC_BILLING_V2` (éteint par défaut) ; la page
  `/reglages/abonnement` (introuvable sans le drapeau ni l'aperçu ; ouverte par « Abonnement et crédits » du
  menu et par la pastille de crédits), avec le paiement et le portail Stripe, et sous les crédits « à ce
  rythme, épuisés vers le … » avec le plan qui en donne plus (`creditsForecast`, `src/lib/billing/forecast.ts`) ;
  le rapport « Crédits d'IA : où ils vont » (`/rapports/ia`, `clip_event` `type: 'ai'`) ; la fenêtre des
  refus `Paywall`, qui ne conseille jamais le plan actuel, seulement le moins cher des plans qui
  donnent vraiment plus (`src/lib/billing/advice.ts`). Pas de route serveur : le navigateur appelle
  la passerelle avec le jeton de l'utilisateur.
- **L'aperçu** (toggle `billingPreview` ; dans l'app mobile, aussi `billingPreviewApp`) : tant que le drapeau est éteint, la page
  Abonnement, les modules, les cadenas, les jauges, la pastille et le conseiller se montrent quand même,
  à partir d'une copie du manifeste (`src/lib/billing/preview.ts`, comparée par
  `tests/billing-preview.test.ts`). En tête de la page, « Voyez CLIP comme une usine abonnée » choisit
  le plan, les modules et le niveau de crédits, dans cet appareil (défaut : Usine et tous les modules,
  rien ne se ferme). « Choisir » ou « Essayer » change l'aperçu au lieu de payer : rien n'est débité,
  l'IA garde sa route d'avant, le serveur ne vérifie rien de plus. Le mode se lit par `useBillingMode()`
  (`live`, `preview`, `off` ; la décision dans `billingModeOf`) et le client `billingClient` passe à l'un
  ou l'autre. Dans l'app mobile (Expo Go, TestFlight), l'aperçu ne montre aucun prix ni achat d'ailleurs
  (règles des magasins) : plans et modules sans prix, « Voir CLIP avec … » au lieu de payer. On coupe
  `billingPreviewApp` (`CLIP_TOGGLES`) avant une soumission aux magasins tant que la vraie facturation
  n'y est pas.
- Les leviers de vente, drapeau allumé. Une limite comptée par l'app (postes, rédacteurs, instructions
  publiées) a sa jauge `UsageMeter` (`src/components/billing/Usage.tsx`). La jauge s'allume à 80 %
  (`NEAR_RATIO`, `src/lib/billing/usage.ts`) et nomme le plan qui en donne plus. La fenêtre d'une
  limite dit ce que le plan permet et, si l'écran le sait (`PaywallRequest.used`), où l'on en est.
  Inviter un rédacteur au-delà de la limite propose d'abord la voie gratuite (lecteur) ; le deuxième
  rédacteur mène à Équipe. Le dossier pour la direction (`/statistiques/dossier`) reprend les
  chiffres de la page Statistiques (`src/lib/stats/adoption.ts`) et propose, au choix, un plan avec
  son prix, jamais dans la coquille. Il passe par le feature toggle `valueReport` et la feature
  `adoption_stats`.
- Le conseiller d'achat (toggle `salesAdvisor`, `src/lib/billing/advisor.ts`, carte `OfferCard` de
  l'accueil seulement : jamais au poste ni pendant une tâche) : une offre à la fois, tirée de l'usage
  (une limite pleine ou à 80 % dès deux unités, une fonction fermée essayée deux fois en 30 jours, un
  module que l'usage appelle : 10 formations ou 30 relevés en 30 jours ; des crédits qui, à ce rythme,
  finiront au moins 3 jours avant le renouvellement, `creditsForecast`, une fois par période). Une nouvelle au plus par
  semaine ; « Plus tard » la range 30 jours, et deux semaines sans réponse aussi. La mémoire est
  par personne et par appareil (`advisorStore.ts`) ; chaque offre montrée, ouverte, rangée ou
  demandée se note dans `clip_event` (`type: 'offer'`). Qui ne peut pas acheter « Demande à
  l'administrateur » (`clip_request`, une par personne et par fonction sur 30 jours) : la demande
  paraît dans « À voir » des administrateurs jusqu'à ce que l'usine ait la fonction, et part par
  courriel ou sur le téléphone si l'usine avertit (`/api/notify`, `request`).
- **Dans l'app mobile, on ne vend rien** (décision du 2026-11-17, modèle « Spotify ») : l'app est une app
  compagnon (règle Apple 3.1.3(f)) ; on s'abonne sur le site, une seule facturation. Ni prix, ni bouton, ni lien
  d'achat dans la coquille (sans capacité `store.*`, la page Abonnement n'y montre qu'une phrase ; la connexion n'y
  dit ni « gratuit » ni « carte », `inApp` de `/connexion`, `tests/signin-in-app.test.tsx`). La fiche des magasins
  de Kiplo : `apps/mobile/store/kiplo/fiche.json`, 18 langues ; son URL de soutien est la page de confidentialité,
  la seule où Kiplo peut donner l'adresse d'Intelligence Industrielle. **Si Apple
  exige l'achat dans l'app** (3.1.3(b), la règle du skill `billing` pour une app grand public), la version
  suivante du manifeste ajoute `ios`/`android`, `providers.revenuecat` (posture `in_app_purchase`, projet
  `clip-v2`) et les `store_product_id` : le code sait déjà vendre dans le magasin.
  - La coquille annonce les capacités `store.connect`, `store.offers`, `store.purchase` et
    `store.restore` seulement à trois conditions : une clé publique RevenueCat
    (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `…_ANDROID_KEY`), hors d'Expo Go, et le toggle
    `storePurchases` allumé (éteint tant que l'app ne vend rien).
  - La page achète par le pont, puis fait relire l'achat par `mobileSync`
    (`src/lib/billing/store.ts`, `src/components/billing/Store.tsx`).
  - Le module natif part dans une build EAS, jamais dans une mise à jour à distance seule.
- Le drapeau reste éteint en production. Le 2026-11-18, la Gateway de production a reçu les routes de facturation
  v2 (401 sans jeton), mais avec un jeton elles répondent 404 « Requested function was not found » : les fonctions de
  facturation n'y sont pas encore déployées. Encaisser pour vrai attend l'équipe plateforme : ces fonctions, Stripe en
  mode réel, le catalogue publié en production (`billing-publish` ne publie qu'en QA). On allume
  `NEXT_PUBLIC_BILLING_V2` sur le projet de Kiplo seulement quand `GET /api/v2/billing/context` et `/plans` répondent
  200 en production pour `clip-v2` : avant, un état illisible fermerait tout (aucune publication, aucun poste). En QA, le parcours marche de bout en bout (2026-11-18, après les correctifs de
  la plateforme) : « Essayer Équipe 7 jours », Stripe demande la carte (« Démarrer l'essai »), le retour
  `?merci=1` (`thanksUrl`, aussi depuis la fenêtre d'une limite), « Essai jusqu'au … », le portail (passer à Solo,
  annuler pendant l'essai : « se termine le … », sans « Renouvellement »). L'essai reçoit les 12 500 crédits d'Équipe
  (corrigé par la plateforme le 2026-11-18 ; avant, une banque à 0 empêchait toute génération). Les pages
  Stripe disent « Kiplo » (le produit) ; « Intelligence Industrielle » et le logo viennent du compte Stripe partagé, qu'on
  ne touche pas (toutes les apps changeraient). Le parcours se refait en local contre la QA (`next dev`
  avec `NEXT_PUBLIC_GATEWAY_URL` de QA, `NEXT_PUBLIC_BILLING_V2=1`, `NEXT_PUBLIC_BRAND=kiplo` ; la QA accepte toute
  origine).
