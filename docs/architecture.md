# Architecture de CLIP V3

## 1. Le choix : une seule interface, une coquille native

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| Next.js (web) + Expo (mobile), deux interfaces | natif partout | chaque écran écrit deux fois, deux rythmes de livraison | non |
| Expo universel (React Native Web) | une base | web desktop moins riche (éditeur, annotation, impression) | non |
| **Next.js partout + coquille Expo** | une seule interface ; correctifs livrés à tous en un déploiement ; natif là où il compte | l'interface mobile est du web | **retenu** |

- **`apps/web`** — Next.js (App Router), déployé sur Vercel. C'est **toute** l'interface : desktop,
  tablette de poste, téléphone (navigateur ou coquille) ; un écran TV ouvre le même lien qu'une tablette.
- **`apps/mobile`** — coquille Expo : une WebView qui charge l'app web, plus un **pont** (§3) pour la
  capture à poids contrôlé (caméra, micro), le scan de codes, l'envoi des gros fichiers, l'impression,
  le partage et, plus tard, les achats des magasins. Elle porte aussi l'écran de mise à jour forcée.
- **`packages/bridge`** — le contrat du pont, partagé par les deux. Le web l'importe ; la coquille en
  garde une copie synchronisée (`apps/mobile/src/bridge/contract.ts`, `npm run sync-bridge`) pour
  rester publiable seule, et un test échoue si la copie diffère de la source.

Conséquence voulue : une coquille installée ne fige presque rien. L'interface, les règles et les
prompts vivent dans l'app web et changent pour tout le monde au déploiement suivant. Seule la liste
des capacités natives est figée dans une version de la coquille, et le web la lit avant d'appeler.

## 2. La Gateway Octopus, seul backend

L'app web parle directement à la Gateway (`NEXT_PUBLIC_GATEWAY_URL`, QA par défaut), avec le jeton
de l'utilisateur (connexion par formulaire, jetons en `localStorage`, un seul rafraîchissement sur
401). Elle n'a que deux routes serveur (une troisième est prévue), sans jeton propre ni secret de la Gateway :

| Route | Rôle |
|---|---|
| `GET /api/config` | configuration publique : feature toggles, version minimale de la coquille, temps réel disponible |
| `POST /api/share` | crée un **lien public à portée limitée** (poste, instruction) : la portée est bâtie côté serveur à partir du type de lien et de la ressource, jamais à partir du navigateur ; l'appel part avec le jeton de l'utilisateur |
| `POST /api/realtime/token` | jeton Ably d'une heure pour un appareil connecté, limité au canal de son organisation (avec `ABLY_KEY`) |
| `GET /api/realtime/status` | diagnostic sans connexion : la clé est-elle là, et Ably l'accepte-t-il avec les droits de l'app (`{ configured, ok, code? }`) |

### Identifiant d'application

CLIP V3 n'est pas encore enregistrée à la Gateway : elle se connecte avec l'application partagée
`html` et cloisonne ses données par le slug **`clip-v3`** (`json_data.app_identifier`, écrit à chaque
document et filtré à chaque lecture). Le jour où l'identifiant `clip-v3` existe, on change
`NEXT_PUBLIC_APP_IDENTIFIER` : le cloisonnement passe au serveur, mais les données écrites sous
`html` restent sous `html` (à recopier, ou à basculer avant d'avoir de vraies données).

### Les types de données (`/api/v1/data/{dataType}`)

| dataType | Un document = | Champs clés de `json_data` |
|---|---|---|
| `clip_org` | les réglages de l'organisation (un seul) | marque, standard de rédaction et son historique, approbation, apprentissages, rôles |
| `clip_station` | un poste, un équipement ou une zone | nom, code, type, zone, lien public |
| `clip_instruction` | une instruction vivante | métadonnées, `draft` (la copie de travail), `sources` (les médias capturés), statut, révision |
| `clip_version` | une version publiée, immuable | numéro, contenu complet, auteur, approbateur, résumé des changements |
| `clip_published` | la version publiée **courante** d'une instruction, lisible par les liens publics | contenu, postes, marque |
| `clip_feedback` | un retour d'opérateur | instruction, étape, type, commentaire, photo, statut |
| `clip_event` | une consultation ou une réalisation | type, instruction, poste, durée, source |
| `clip_import` | un lot d'import de documents | fichiers et leur état |
| `clip_checkpoint` | un point de retour du brouillon (modifications enregistrées, pas publiées) | instruction, contenu complet, raison, empreinte, auteur, date |
| `clip_operator` | une personne de l'équipe au poste, sans compte | nom, empreinte de son code (`pinHash`, jamais le code), quart, équipe, postes habituels, actif |
| `clip_execution` | le travail fait au poste, écrit une fois à la fin d'une instruction qui a des relevés | instruction, version, poste, qui (personne de l'équipe ou connectée), début et fin, chaque réponse (valeur, limites, verdict, note d'écart ; avec le module : chaque lecture, l'état de chaque point, les photos, qui a autorisé l'écart), nombre d'écarts |
| `clip_training` | une formation validée au poste, écrite une fois quand la personne réussit | instruction, version, poste, qui (personne de l'équipe), note, chaque réponse (question, choix, juste ou non), langue, date |
| `clip_contact` | comment joindre une personne, tenu par son app | personne, nom, courriel, langue, jetons push de ses téléphones, courriel oui/non, téléphone oui/non |

Le contenu publié est séparé du brouillon : un lien public ne lit que `clip_published` (et ce qu'il
faut pour signaler un retour), jamais les brouillons.

### Liens publics sans compte

Une tablette de poste, un code QR ou un lien partagé ouvre `…/p/{uuid}`. La page échange l'uuid
contre un jeton `guest` (`GET /api/v1/redirect/{uuid}`), dont la portée a été fixée à la création
par `POST /api/share` :

- **poste** : lecture du poste ; lecture des instructions publiées **de ce poste** (mode « bloquer »)
  ou de toutes les instructions publiées avec ce poste en premier (mode « concentrer », par défaut) ;
  insertion de retours et d'événements ;
- **instruction** : lecture de cette seule instruction publiée ; insertion de retours et d'événements.

Tout lien lit à voix haute par la voix en direct (`ai:live`, `LiveSpeaker`). La session s'ouvre au
premier « Écouter » et reste ouverte tant que l'instruction est à l'écran : chaque étape part tout
de suite, sans fichier audio à générer. L'assistant vocal (`assistant:ask`) n'est ouvert que sur un
poste qui l'a demandé. Un lien créé avant porte encore `ai:tts` : la voix de l'appareil
(`speechSynthesis`) lit à la place, jusqu'à ce qu'on régénère le lien.

Régénérer un lien invalide l'ancien dans l'app (la page vérifie que l'uuid est bien le lien courant
du poste). La Gateway n'a pas de route de révocation : un jeton déjà émis reste valable jusqu'à son
expiration, ce que l'écran d'administration dit clairement.

**La portée d'un lien ne change plus après sa création** (la Gateway n'a pas de route pour la
modifier). Elle porte donc une version (`LINK_SCOPE_VERSION`, `src/lib/model/linkScope.ts`), rangée sur
le poste (`linkVersion`). La version 2 ajoute, pour un lien de poste seulement, la lecture des
personnes actives de l'équipe (`clip_operator`) : le lien d'une instruction peut sortir de l'usine,
il ne montre jamais l'équipe. Tout lien peut aussi insérer le travail fait et les réponses de
formation (`clip_execution`, `clip_training`), ouverts d'avance pour ne pas refaire les liens à
l'étape suivante. Un poste au
lien plus ancien affiche « Mettre à jour le lien » : un nouveau lien est créé, et l'ancien est rangé
dans `linkFollow`. Une tablette ou un QR déjà imprimé qui ouvre l'ancien lien est envoyé sur le
nouveau (`location.replace`) : rien à réimprimer. « Remplacer » (lien compromis) vide `linkFollow` :
l'ancien lien ne mène plus nulle part.

## 3. Le pont natif

Messages JSON, `packages/bridge/src/index.ts` :

- **web → natif** : `window.ReactNativeWebView.postMessage({ v, id, type, payload })` ;
- **natif → web** : la coquille appelle `window.__clipBridgeReceive(json)` avec la réponse
  `{ v, id, ok, result | error }` ou un événement `{ v, event }` (progression d'envoi, retour au
  premier plan) ;
- la coquille injecte `window.__CLIP_NATIVE__` (version, plateforme, capacités) avant le chargement.

**Capture à poids contrôlé** (`CAPTURE_PRESETS`) : photos ramenées à 1920 px (JPEG ~0,72), vidéo
720p à ~2,5 Mb/s (≈ 19 Mo la minute, contre ~400 Mo en 4K/60), audio AAC mono 64 kb/s. Les médias
choisis dans la galerie sont réduits de la même façon (exportés en 720p sur iOS) ; une vidéo encore
trop lourde est réduite par la Gateway (`/files/video/process`, 720p).

**Envoi** : le web demande une URL présignée à la Gateway, puis `upload.put` ; la coquille envoie le
fichier depuis son cache, émet la progression, réessaie une fois sur coupure réseau, et garde le
fichier jusqu'à `media.discard`.

## 4. La génération par l'IA (`POST /api/v4/assistant/ask`)

1. **Préparer les sources** : photos et PDF par URL ; vidéos et notes vocales téléversées chez Gemini
   (`/ai/gemini/upload/direct`, URI valable ~48 h, réutilisée tant qu'elle vit) ; notes vocales
   transcrites (`/files/audio/transcribe`) pour être lisibles et corrigibles ; documents Word convertis
   en PDF (`/files/document/convert-to-pdf`).
2. **Un seul appel multimodal** (Gemini, `level: mid`, sortie JSON stricte `json_schema`) avec : le
   standard de rédaction de l'usine, ses apprentissages, les règles du format (instruction de travail
   ou fiche de cadenassage), la liste numérotée des sources. Le modèle renvoie les étapes et, pour
   chacune, ses médias **par référence** : `{source, start, end}` pour un extrait vidéo, `{source}` pour
   une photo, `{source, page}` pour une page de PDF.
   Le moins de texte possible par étape (`generationSystem`, `src/lib/ai/prompts.ts`) : titre de 2 à
   6 mots, une ou deux phrases courtes qui ne répètent ni le titre ni ce que le média montre, 0 à 2
   points clés (le plus souvent aucun), une mise en garde seulement à l'étape où le risque se
   présente, jamais répétée ; les EPI et les consignes générales vont dans la fiche. Le standard d'une
   nouvelle usine : 20 mots au plus par étape.
3. **Post-traitement** : validation des références et des temps, identifiants stables, vignettes des
   extraits vidéo (`/files/gifs/generate`, captures), rapprochement du poste deviné avec les postes
   existants.
4. **Les repères, en deux temps** (`src/lib/ai/autoAnnotate.ts`). L'appel multimodal voit la vidéo en
   basse définition, à environ une image par seconde : il ne peut pas placer un cercle au pixel près
   sur une image qu'il n'a pas vue exactement. Il dit seulement quelles images figées ou photos
   méritent un repère (`focusLabel` : ce qu'il faut montrer). Une fois les images tirées, chacune est
   annotée sur l'image elle-même, en haute définition, par le même appel que « Annoter avec l'IA »
   (`annotateImage`, opération `annotate`, débitée par image quand la facturation est allumée), trois
   à la fois ; la piste de la génération guide sans s'imposer. Un extrait vidéo n'est jamais annoté.
   La personne choisit dans les options de la capture (« Annoter les images automatiquement »,
   gardé sur l'appareil, oui par défaut). Une image qui échoue reste sans marque ; un refus de
   facturation arrête la suite sans faire échouer la génération.

**Extrait vidéo plutôt que GIF** : un extrait joué en boucle depuis la vidéo source (début/fin) est
10 à 20 fois plus léger qu'un GIF, garde la qualité et le son, et se règle à la seconde dans
l'éditeur. Les captures servent de vignettes et d'images pour le PDF.

**Les questions de la génération.** Ce que les sources ne tranchent pas devient au plus quatre
questions (« À vérifier avant de publier »), chacune avec 2 à 4 réponses proposées quand la réponse
est l'un de quelques choix clairs (oui ou non, deux façons de faire vues dans les sources), jamais une
valeur inventée (`generation.choices`). « Répondre » ouvre une question à la fois (`QuestionsDialog`) :
une réponse proposée, ou écrite, ou dictée, ou la question passée. Les réponses partent ensemble à
l'assistant d'édition, qui corrige l'instruction sous les yeux de la personne ; les questions
répondues disparaissent. Cocher une question la règle sans la répondre.

### L'assistant d'édition (`src/lib/ai/agent.ts`, `AgentPanel`)

**Revoir les médias, seulement quand il le faut** (`agentTurn`). Chaque tour lit d'abord le texte
(`edit_agent`) : l'instruction, et les sources d'origine en une ligne chacune, avec en entier les
notes écrites et les transcriptions des notes vocales (du texte, presque gratuit). Une tâche simple
s'arrête là. Si la demande ne peut pas se faire sans voir ou entendre une source (une valeur dite
ou montrée absente du texte, un geste ou un moment à retrouver, ce que montre une photo),
l'assistant rend une seule opération `look` (sources, question). L'app prépare alors ces sources
(URI Gemini encore valides réutilisées, sinon téléversées de nouveau, puis gardées dans
l'instruction) et fait un deuxième tour avec elles, la vidéo en basse définition. Ce tour est
facturé selon leur taille, avec les seuils de la génération (`look_s`, `look_m`, `look_l`). La
conversation montre la revue (« Je revois S1 (2 min 20 s de vidéo) »), avec son coût si la
facturation est allumée. Des sources trop longues ne se revoient pas d'un coup : l'assistant demande
l'étape ou le moment. `use_media` met à une étape un extrait, une image figée (tirée de la vidéo),
une photo ou une page tirés d'une source.

- La personne demande (texte, ou dictée au micro du champ) ; l'IA (`edit_agent`) reçoit l'instruction
  avec l'**identifiant** de chaque étape et la liste de ses médias, l'étape regardée et l'historique de
  l'échange, et rend `{ reply, operations, suggestions }` en JSON strict.
- Les opérations : `set_instruction`, `add_step` (avec un id choisi par l'IA, réutilisable plus bas),
  `update_step`, `delete_step`, `move_step`, `set_layout`, `set_media` (légende, verdict), `remove_media`,
  `clear_annotations` — pures et testées (`applyOp`) — et trois qui demandent une IA spécialisée :
  `annotate` (une IA qui **voit** la photo place les marques demandées), `illustrate`, `visual`.
- L'app les applique **une à une** (`runAgentOps`) : elle amène l'éditeur à l'étape, l'entoure, montre
  l'action en cours, puis passe à la suivante ; une action ratée n'arrête pas les autres. Tout le tour
  s'annule d'un geste (l'instruction d'avant est gardée).
- Suggestions : tirées de l'instruction (`suggest.ts`, gratuites), puis remplacées par celles de l'IA.
- **À la voix, en direct** (« Direct », feature `voice_assistant`) : Gemini Live (`useLiveVoice`, la même
  mécanique que l'assistant du poste) converse et appelle `modifier(demande)`, qui passe par le même
  moteur que le clavardage (un tour `edit_agent`, visible et annulable), `aller_a_etape`,
  `lire_instruction` et `annuler_dernier_changement`.

### Traduire pour les opérateurs (`src/lib/ai/translate.ts`, `src/lib/model/translation.ts`)

Une traduction se range à côté du contenu (`translations[langue]`) ; le lecteur l'applique
(`localized`). Elle couvre tout ce que l'opérateur lit :

- **Un appel** (`translate`) : les textes des étapes, et en `extras` le reste, chacun avec son id
  (outils, équipement, fiche de cadenassage, légendes et textes alternatifs, texte des annotations,
  titre et texte des schémas). Le texte d'un schéma de l'IA se lit dans la page (`visualText.ts` :
  balises SVG comprises, quelques attributs, et les chaînes du code qui ressemblent à un libellé) ;
  le modèle ne traduit que ce qui s'affiche, et le dessin comme le code ne changent pas.
- **Les images, en option** (non cochée) : le même appel repère, en basse définition, les images où
  un texte pour l'opérateur se lit. Seules celles-là sont refaites par le modèle d'image avec ce
  texte traduit (`translate_image`, une par image refaite), au format le plus proche de l'original.
  Les illustrations de l'IA, sans texte, ne sont pas proposées. Un refus de facturation arrête la
  suite ; le texte reste traduit.
- Un média traduit nomme le média d'origine (`of`, `mediaKey`) : s'il change ensuite, sa traduction
  ne s'applique plus.
- **L'assistant** traduit aussi : `translate` (une ou plusieurs langues, images si on le demande),
  `translate_media` (la légende, les marques ou le schéma d'un seul média, `step_assist`) et
  `translate_image` (une image refaite). Vers la langue de l'instruction, le média lui-même change ;
  vers une autre langue, sa traduction se range dans celle de l'instruction, qui doit exister.

### Revenir en arrière (`src/lib/history/undo.ts`, `src/lib/model/checkpoints.ts`, `useDraftHistory`)

Derrière le toggle `draftHistory`. Deux niveaux :

- **Annuler, rétablir** pendant la séance : boutons de l'en-tête (ordinateur), pastille en bas à
  gauche (téléphone), Ctrl+Z et Ctrl+Maj+Z (⌘Z, ⇧⌘Z). Les frappes rapprochées dans un même champ
  forment un seul pas ; un passage de l'assistant aussi. Pas dans une fenêtre ni dans le champ de
  l'assistant, qui gardent leur propre annulation. Annuler va à l'étape qui change.
- **Les points de retour** (`clip_checkpoint`), pour revenir en arrière après avoir fermé l'app. Ils
  s'écrivent avec retenue : au plus un toutes les 10 minutes pendant qu'on modifie (l'état d'avant la
  modification ; regarder n'écrit rien) ; avant un passage de l'assistant qui change quelque chose,
  avant de régénérer et avant de revenir à une autre version ; tel que l'IA vient de le créer. Jamais
  deux fois de suite le même contenu (empreinte), ni une copie de la version publiée. Au plus 20 par
  instruction : les plus anciens s'effacent, sauf la dernière version de l'IA. Le gardien lit la liste
  une fois par séance, puis la tient lui-même : une écriture et au plus un effacement par point.
- **L'historique** (le menu, ou l'état « Enregistré » de l'en-tête) montre les versions publiées et
  les points de retour, du plus récent au plus ancien. Revenir remet le contenu dans le brouillon,
  sans rien publier, après un point de retour de l'état actuel ; « Annuler » le défait aussitôt.

Le cache de l'instruction suit chaque enregistrement (`cacheDraft`) et l'éditeur, comme l'aperçu,
attend la relecture d'une instruction déjà lue avant de s'ouvrir : revenir à une instruction montre
toujours le dernier brouillon.

### Une génération suivie sur tous les appareils (`src/lib/ai/creation.ts`)

La génération tourne dans l'appareil qui la lance : l'app mobile ou le navigateur. Pour que les
autres la voient, cet appareil écrit son état dans l'instruction (`generating`) : au départ, à
chaque nouvelle étape, et un signe de vie toutes les 30 secondes. Les écritures partent dans
l'ordre, et une écriture ratée ne gêne pas la génération. La fin efface l'état, dans la même
écriture que le brouillon. Un échec le remplace par `generationError`.

Ailleurs, une seule petite requête (`useCreations` : les instructions dont `generating` n'est pas
nul, titre et état seulement) est relue toutes les 10 secondes pendant une création. Sinon, elle
est relue toutes les 60 secondes, seulement sur l'accueil et la liste, jamais onglet caché. Quand
une création commence ou finit, les listes et l'instruction se relisent ; la fin s'annonce par un
toast avec « Ouvrir ».

Dans la liste, une instruction en création se voit de loin : le dégradé de la marque coule, un
reflet passe et l'étape s'écrit (`creating-flow`, `creating-sweep`, lus dans la petite requête). À
l'accueil, une création finie ne disparaît pas : « Viennent d'être créées » (`useRecentCreations`,
les dernières 24 h) la propose jusqu'à ce qu'on l'ouvre sur cet appareil, ou qu'on l'écarte.

- **Accueil** : section « En création ».
- **Cartes** : « En création ».
- **Page de l'instruction** : elle suit l'étape, puis montre l'instruction dès qu'elle est prête.

**Les médias déjà pris** (`src/lib/model/library.ts`). Les médias d'une instruction (vidéos, photos,
notes vocales et leur transcription, notes, documents, et la demande) restent dans l'instruction. À
la capture, « Médias déjà pris » ouvre ceux des instructions déjà générées (les plus récentes
d'abord), filtrés par type et par recherche ; on les reprend sans rien téléverser. Dans le menu d'une
instruction, « Nouvelle instruction avec ces médias » ouvre une capture avec ses médias et sa
demande : on ajoute, on retire, on génère, sans toucher à l'originale. Un média repris garde le même
fichier, sans `path` : le retirer d'une capture ne supprime jamais le fichier d'une autre
instruction.

**Le temps réel (Ably), s'il est configuré** (`ABLY_KEY`, côté serveur).
- **Le jeton** : chaque appareil connecté demande un jeton à `/api/realtime/token`. La route relit
  la personne par `/api/v1/auth/me`, puis ne donne accès qu'au canal de son organisation
  (`clip:org:{id}`).
- **Les annonces** : l'appareil qui génère annonce le début, chaque nouvelle étape et la fin, une
  fois l'état écrit. Les messages ne portent que l'identifiant et le titre.
- **À la réception** : les autres relisent aussitôt la Gateway. La relecture à intervalle reste en
  filet.
- **L'édition en direct** (toggle `liveEditing`, `src/lib/realtime/liveDraft.ts`) : après chaque
  enregistrement d'un brouillon (0,9 s après la dernière modification), l'appareil annonce
  l'instruction et les étapes changées (`draft`). L'éditeur ouvert sur la même instruction ailleurs
  relit le brouillon, va à la première étape changée et le dit (« En direct : modifiée sur l'app
  mobile »). Un éditeur qui a des changements pas encore
  enregistrés ne reprend jamais le brouillon reçu : il le signale, et la personne garde les siens ou
  charge l'autre version. Le lecteur ouvert sur l'instruction se relit aussi. Vos propres
  modifications sur un autre appareil vous sont proposées (« Ouvrir ») quand cet écran est ailleurs
  dans l'app, une fois par instruction toutes les dix minutes ; jamais celles des autres.
  L'écran qui suit va à l'étape changée, l'encadre quelques secondes (« En direct : modifiée sur
  l'app mobile ») et une marque qui vient d'arriver clignote en apparaissant
  (`src/lib/annotations/fresh.ts`) ; jamais dans l'annotateur, où ce qu'on trace s'affiche tel quel. Un témoin dit où en est le direct (`LiveBadge`) : vert quand
  il est branché ; ambre quand il ne passe pas (réseau qui bloque, jeton refusé), et l'écran se
  relit alors seul toutes les 8 s (`useDraftWatch`, `src/lib/realtime/watch.ts`) : une lecture
  minuscule des instructions modifiées depuis peu (date et appareil seulement), et l'instruction
  entière seulement si un autre appareil l'a changée. Chaque enregistrement d'un brouillon écrit
  l'appareil qui l'a fait (`updatedFrom`, `updatedVia`).
  Pour que le direct le reste : l'annonce porte la version enregistrée (`at`), et l'écran qui la
  reçoit relit jusqu'à l'avoir (`readVersion` : la Gateway peut rendre l'ancienne un court instant) ;
  une annonce faite pendant que la connexion se rétablit (téléphone sorti de veille, retour de
  l'appareil photo) attend et part dès qu'elle revient, et revenir à l'écran relance la connexion
  tout de suite (`src/lib/realtime/client.ts`) ; quand le direct revient après une coupure, et quand
  on revient à l'écran, l'éditeur vérifie une fois s'il a manqué quelque chose (`useDraftWatch`).
  L'annotateur envoie chaque marque au brouillon dès qu'elle est posée (quitter sans enregistrer
  remet celles d'avant) : l'autre appareil la voit apparaître sans attendre « Enregistrer ».
  Toute lecture de la Gateway passe `cache: 'no-store'` : le navigateur resservait une copie gardée
  d'une instruction (l'instruction ouverte, la relecture, la lecture après une annonce) au lieu du
  brouillon modifié ailleurs. Le direct se rebranche seul : jeton de la Gateway rafraîchi quand il a
  expiré (onglet resté ouvert), canal rebranché quand la connexion revient, nouvel essai toutes les
  30 s tant qu'il est coupé ; le témoin dit au survol pourquoi il ne passe pas. Direct branché,
  l'éditeur vérifie quand même toutes les 20 s (l'autre appareil a pu perdre le sien).
- **Le diagnostic** : `GET /api/realtime/status` demande un vrai jeton à Ably avec les droits de
  l'app ; `ok: false` avec `code` 40101 veut dire une clé mal copiée, 40160 des droits insuffisants
  (la clé doit pouvoir publier, écouter et voir la présence sur `clip:org:*`).

Sans signe de vie depuis deux minutes (app fermée, téléphone en veille), la création est
« interrompue » : on la relance ici, ou on revoit les médias. Dans l'app mobile, l'écran reste
allumé pendant la génération.

### Capturer (« Nouvelle instruction », `CaptureBoard`)

La page la plus importante, d'un seul écran au téléphone (« Créer = un geste », `VISION.md`). Au
téléphone, elle prend tout l'écran comme l'éditeur (`useImmersive`) : sa propre barre garde le retour et
le titre, la navigation de l'app s'efface.

- **Rien de capturé** : « Filmer le geste » en grand (le plus rapide), les quatre autres façons sur une
  ligne (« Photos », « Note vocale », « Note », « Fichiers »), puis « De quoi s'agit-il ? » sur une ligne
  (facultatif) et « Médias déjà pris ». Aucun bouton « Générer » grisé : il n'a rien à faire encore.
- **Quelque chose de capturé ou en route** : ce qu'on a ajouté (« Vos notes ») en tête, « Ajouter » en
  une rangée compacte, les options repliées, et « Générer l'instruction » avec ce que ça coûte : au
  téléphone dans une barre en bas, qui cache au clavier, et la page lui laisse sa place (rien ne passe
  dessous sans pouvoir remonter) ; au bureau, en bas de la colonne. Un envoi raté le dit sur sa carte.
- Au bureau, la même hiérarchie sur une ligne (filmer sur deux colonnes, les quatre autres), et l'on peut
  glisser des fichiers sur la page.

### L'éditeur : deux façons de modifier, et l'aperçu (`Editor`, toggle `editorViews`)

Deux vues pour la même instruction, chacune complète : tout ce qu'on peut faire existe dans les deux,
rangé autrement. Le choix se retient sur l'appareil (`clip_pref_editor_view`,
`src/lib/ui/editorView.ts`) ; sans choix, l'ordinateur ouvre la **Fiche** (on y voit tout ce qu'on
peut faire) et le téléphone, **Comme au poste**. L'éditeur prend tout l'écran ; la barre et la
navigation de l'app s'effacent (`useImmersive`, `src/lib/ui/immersive.ts`). Toggle coupé (et repli) :
« Comme au poste » seul, l'aperçu dans le « … », comme avant.

- **On voit dans quelle vue on est, et qu'il y en a une autre** : au bureau, dans l'en-tête, les deux
  vues nommées côte à côte (la vue en cours en blanc), puis l'**Aperçu** (l'œil) ; au téléphone, un
  seul bouton discret à gauche de la barre du bas, dont l'icône dit la vue en cours : il ouvre les
  deux vues, chacune expliquée en une phrase, et l'aperçu (un point bleu l'annonce jusqu'à la première
  ouverture). Changer de vue garde l'étape ouverte.
- **L'Aperçu n'est pas une vue de l'éditeur** : c'est le lecteur du poste
  (`/instructions/{id}/lire?apercu=1`, voir « L'aperçu qu'on modifie »). En revenant, l'éditeur
  retrouve l'étape qu'on avait (`?etape=`).
- **L'en-tête est le même dans les deux vues** (`EditorBar.tsx`) : retour, le titre et son état
  (« Modifications à publier · Enregistré »), « N à vérifier » quand l'IA a des questions, les vues et
  l'aperçu, le témoin du direct, annuler/rétablir, le bouton **Assistant** (le seul de l'IA :
  simplifier, rendre plus clair, ajouter un point clé, vérifier la sécurité, ou « Demander autre
  chose » qui ouvre la conversation), le « … » (infos, partager, traduire, blocs, formation,
  historique, registre, PDF, JSON, dupliquer, nouvelle instruction avec ces médias, régénérer,
  archiver) et l'action principale (Publier, Faire approuver, Approuver ; rien quand tout est publié).
- **Comme au poste** (`StageEditor`) : l'étape telle que l'opérateur la verra, chaque texte modifié
  là où il est ; chaque outil apparaît au moment où il sert, à côté de ce qu'il touche. Le « … » de
  l'étape (média, ajouter, dupliquer, déplacer, sections, supprimer), « Modifier le média » sous
  l'image, et sous le texte « + Mise en garde », « + Point clé » et « + Relevé » seulement quand ils
  manquent. Le niveau d'une mise en garde se choisit sur son étiquette, à côté de « retirer ». Sur
  ordinateur, la mise en page exacte du lecteur et, en bas, la bande des étapes (retours
  d'opérateurs et, en approbation, étapes nouvelles ou modifiées sur les vignettes) ; les flèches du
  clavier passent d'une étape à l'autre. Au téléphone, la vue du téléphone, le média à ses vraies
  proportions (comme au poste, « La lecture au téléphone ») et, sous le pouce, la vue, les étapes
  (précédente, le choix, suivante), le « … » de l'étape et l'Assistant.
- **Fiche** (`FormEditor`, `StepForm`) : la liste des étapes, et tous les outils à découvert, rangés
  en cartes. Au bureau, la liste à gauche — l'instruction en tête (son titre, ses étapes, ses postes),
  puis chaque étape par section, avec sa vignette et ce qui la distingue (mise en garde, relevés,
  retours, nouvelle ou modifiée, bloc) — et à droite ce qu'on a choisi. Au téléphone, la liste, puis
  l'étape touchée en entier ; sous le pouce, la précédente, la liste (« Étape 3 sur 12 ») et la
  suivante. **Une étape se glisse par sa poignée** (à droite, à la souris comme au doigt : des
  événements de pointeur, le glisser-déposer du navigateur ne marchant ni sur un bouton ni au doigt) ;
  un trait montre où elle tombera, la liste défile près des bords, et elle rejoint la section où on
  la lâche — au-dessus du titre d'une section, à la fin de celle d'avant (`placeStep`) ; les autres
  gardent la leur. Une étape d'un bloc commun ne se glisse pas seule. **Une étape** : en tête, sa place et ses gestes (monter, descendre, dupliquer, supprimer),
  puis une carte par sujet — le texte (action, comment faire, et les retouches par l'IA), le média
  (`StepMediaEditor` ouvert : annoter, vidéo ou image, l'IA, retirer, verdict, légende, disposition),
  la mise en garde (aucune, bon à savoir, attention, danger ; le texte dans la couleur du poste), les
  points clés, les relevés, la section — et « Ajouter une étape après celle-ci ». **L'instruction** :
  titre et résumé, où elle s'affiche, format, EPI et outils (`InstructionFields`), cadenassage, et ses
  **outils** en tuiles, chacun ouvre sa fenêtre (`ToolsGrid`) : ce que le « … » range ailleurs. Une
  étape d'un bloc commun s'y lit sans se modifier, comme dans l'autre vue.
- **Le média** se règle dans une fenêtre dans « Comme au poste » (`StepMediaEditor` : l'aperçu, les
  médias de l'étape, puis Annoter, Vidéo | Image, « Avec l'IA », Retirer ; verdict, légende et
  disposition sous « Plus d'options ») ; dans la fiche, la même chose dans sa carte, tout ouvert.
- **Publier** : la fenêtre dit où l'instruction s'affichera et laisse choisir les postes à ce
  moment-là ; l'avis sur la génération par l'IA s'y demande, quand la personne a tout relu.
- L'assistant, un autre appareil et un lien (`?etape=`) amènent les deux vues à l'étape qui change ;
  la fiche l'ouvre. La vue laisse sa place au panneau de l'assistant ; l'en-tête serré garde les vues
  en icônes.

### Les sections d'une longue instruction (toggle `sections`, `src/lib/model/sections.ts`)

Au-delà de 8 étapes, l'IA regroupe les étapes en 3 à 8 phases (« Démontage », « Nettoyage »,
« Remontage »). Chaque étape porte le nom de sa section (`Step.section`) ; une section, ce sont les
étapes qui se suivent sous le même nom : rien d'autre à tenir à jour, et le nom se traduit avec le
reste (un texte à part par nom). Dans l'éditeur, le nom s'écrit au-dessus du titre (il change pour
toute la section) ; « Nouvelle section ici » et « Retirer la section » sont dans le « … » de
l'étape ; la bande des étapes sépare les sections. Une étape déplacée prend la section de la place où
elle arrive ; une étape ajoutée reste dans celle d'avant. Au poste, le nom s'affiche au-dessus du
titre, et toucher « Étape 3 sur 12 » ouvre le sommaire : toutes les étapes, par section, pour aller
directement à l'une d'elles. Le PDF met le nom en titre.

### La relecture périodique (toggle `renewal`, `src/lib/model/renewal.ts`)

En publiant, on choisit « À revoir dans » 6 mois, 1 an, 2 ans ou jamais ; le défaut vient de
Réglages › Usine (1 an si rien n'est choisi). L'instruction garde `renewal` (période, échéance,
dernière relecture). Un mois avant l'échéance, l'éditeur le rappelle (« Rien n'a changé ? Toujours
bonne ») ; la liste porte « À revoir » ou « Révision en retard », avec un filtre ; l'accueil liste les
instructions à revoir. « Toujours bonne » repousse l'échéance sans nouvelle version ; publier la
repousse aussi. Rien ne bloque l'opérateur.

### L'accord avant l'IA et la suppression du compte (exigences d'Apple)

- **L'accord** (toggle `aiConsent`, `src/lib/ai/consent.ts`) : rien ne part vers l'IA (questions,
  images, voix en direct, fichiers envoyés aux modèles, transcriptions) avant que la personne l'ait
  accepté, une fois, par appareil. Le client de l'IA et l'envoi des fichiers passent par
  `requireAiConsent()` ; la fenêtre (`AiConsentHost`) s'ouvre au premier usage, nomme Google et
  OpenAI et mène à la politique de confidentialité. Refusé, l'appel ne part pas. L'accord se retire
  dans Réglages › Données. Les liens publics n'ont pas de fenêtre (rien n'y part de la personne).
- **Supprimer mon compte** (toggle `deleteAccount`) : dans le menu Mon compte et dans Réglages ›
  Données ; on écrit son courriel pour confirmer, puis `DELETE /api/v1/auth/user/delete` révoque les
  sessions et efface le compte. Les instructions de l'usine restent à l'équipe.

### Qui est à la tablette (toggle `operators`, `src/lib/model/operators.ts`)

L'opérateur n'a toujours pas de compte : une personne de l'équipe, c'est un nom et un code à
4 chiffres. Le poste qui le demande (« Demander qui travaille », sur la page du poste) ouvre
« Qui êtes-vous ? » : on touche son nom (ceux du poste d'abord), puis on tape son code sur un grand
pavé. Ensuite, chaque consultation, réalisation et retour porte `operatorId` et `operatorName`
(« Marc a fait le cadenassage hier à 14 h »). Personne ne touche la tablette pendant 30 minutes :
elle redemande. « Changer de personne » est toujours en haut de l'écran.

- **La page Équipe** (`/equipe`, administrateurs) : ajouter des personnes en collant une liste (une
  par ligne, une colonne d'Excel), modifier (nom, quart, équipe, postes habituels), retirer (la fiche
  reste, `active: false`, pour l'historique). Chacune reçoit son code dès l'ajout ; les codes
  s'affichent **une seule fois**, avec une feuille à imprimer et à découper
  (`src/lib/pdf/codesSheet.ts`). « Nouveau code » remplace l'ancien.
- **Le code ne quitte jamais le serveur en clair, sauf vers l'administrateur qui le donne.**
  `POST /api/operators/pin` (jeton de l'utilisateur, droit d'écrire les postes) tire le code au
  hasard (jamais 0000, 1234, 1111…), en garde l'empreinte HMAC-SHA256 liée à la personne
  (`pinHash`, préfixée de l'identifiant de la clé) et rend le code une fois. La clé vient de
  `CLIP_PIN_SECRET` s'il existe, sinon elle est dérivée de `ABLY_KEY` (HKDF) ; sans l'une ni l'autre,
  la route répond `unavailable` et la tablette laisse continuer sans nom. Les listes ne lisent jamais
  `pinHash` (projection), et une empreinte lue par un jeton invité ne sert à rien sans la clé du
  serveur.
- **La vérification** (`POST /api/operators/verify`) se fait au serveur : il échange lui-même le
  lien du poste, lit la fiche avec le jeton invité, compare le code et rend une session signée
  (12 h au plus) pour ce lien. Cinq erreurs de suite bloquent ce nom à ce poste pendant 10 minutes.
  Ce blocage vit dans la mémoire du serveur (chaque instance a la sienne) : il freine un essai au
  hasard. Le code dit qui travaille, il ne protège pas des données : un lien de poste ouvre déjà
  les instructions publiées sans nom.
- **Le travail ne s'arrête jamais** : lien d'avant la version 2, serveur sans clé ou équipe vide, la
  tablette propose « Continuer sans me nommer ».

### Les relevés et le registre (toggle `records`, `src/lib/model/checks.ts`, `executions.ts`)

Une étape peut demander à l'opérateur de noter quelque chose pour la trace (`Step.checks`, quatre
au plus) : une **mesure** (unité, minimum, maximum, valeur visée), un **oui ou non** (avec la
bonne réponse), un **choix** (dont certains sont des écarts), un **texte** (numéro de lot) ou une
**photo** de preuve.

- **La génération les propose** : « vérifier que… » devient un oui ou non, une valeur à lire une
  mesure avec son unité. Les limites viennent des sources, jamais d'une supposition ; sans elles,
  la mesure n'a pas de limite et l'IA pose une question. Un relevé de l'IA reste une proposition
  (`proposed`, deux au plus par étape) : encadré en violet sous l'étape, l'auteur le **garde** ou le
  **retire** ; l'ouvrir et l'enregistrer, c'est le garder. Une proposition ne va jamais au poste
  (`liveChecks`) ni dans une version publiée (`withoutProposals`, à la publication, qui en dit le
  nombre) ; elle reste au brouillon. L'assistant d'édition les change
  (`set_checks`, la liste complète de l'étape ; un relevé gardé garde son id). Ils se traduisent
  (libellés et choix) et s'impriment comme des cases à remplir.
- **Dans l'éditeur**, comme au poste : le bloc « À relever » sous l'étape, « + Relevé » à côté de
  « + Point clé », et une fenêtre qui ne montre que ce que le genre demande (`CheckDialog`).
- **Au poste** (`StepChecks`) : grands champs, verdict tout de suite (« Dans la norme », « Hors
  norme »). Un écart demande une note (« dites ce que vous avez fait ») pour continuer. On ne
  passe pas une étape dont un relevé obligatoire manque : le lecteur y revient et le signale
  (`firstIncomplete`), même par le sommaire, le glissement ou la voix. L'aperçu de l'éditeur
  n'exige rien.
- **La trace** (`clip_execution`) s'écrit à la fin, dans la langue d'origine de l'instruction, avec
  qui l'a faite (la personne nommée à la tablette, sinon la personne connectée). Sans réseau, elle
  attend dans l'appareil (`clip_exec_queue`, 50 au plus, 30 jours) et repart à la prochaine
  instruction ouverte. Un lien d'avant la version 2 ne peut pas l'écrire : on relève quand même,
  sans trace.
- **Le registre** (`/registre`, ceux qui lisent les retours) : le travail fait, du plus récent, avec
  « Écarts » d'un geste, la recherche, le détail de chaque relevé et sa fiche à imprimer
  (`src/lib/pdf/executionSheet.ts`). L'accueil signale les écarts des 7 derniers jours ; le menu
  d'une instruction qui a des relevés mène à son registre.

### Le module Relevés (toggle `recordsPlus`, feature `records_plus`)

Pour l'usine qui fait de ses instructions sa saisie de données (inspiré de CLIP V2, plus simple). La
base reste courte : le module ajoute deux genres et quelques options, regroupés à part.

- **Deux genres** : la **liste à cocher** (2 à 12 points ; au poste, chaque point ✓, ✗ ou S. O. ; un
  ✗ est un écart) et les **mesures répétées** (2 à 10 lectures, chacune jugée par les limites ; le
  poste montre la plus basse, la plus haute et la moyenne ; la trace garde chaque lecture et la
  moyenne).
- **Les options** (encadré « Relevés avancés » de `CheckDialog`) : « comment mesurer » (une ligne
  sous le relevé, au poste) ; un texte qui **se scanne** (numéro de lot ou de série, par le lecteur
  de codes) ; **plusieurs photos** (2 à 6) ; un écart **à faire autoriser** (au poste, le nom de qui
  a autorisé de continuer, exigé avec la note ; pas pour un texte ni une photo).
- **Au registre** : « Travaux | Tendances ». Une carte par mesure (instruction × relevé) : la valeur
  dans le temps, la bande des limites d'aujourd'hui, l'écart d'une mesure répétée, les écarts en
  rouge, une bulle au survol (`trendsOf`, sur les 300 travaux les plus récents de la vue).
  « Exporter (CSV) » prend jusqu'à 5 000 travaux de la vue (`executionsCsv`) : une ligne par relevé,
  la mesure en nombre avec son unité et ses limites, une colonne « Détail » (les lectures, les points,
  les liens des photos). En français, point-virgule et virgule décimale (Excel en français) ; les
  dates en `2026-11-13 14:05` ; un texte qui commence par = + - @ prend une apostrophe (jamais une
  formule). Le même module CSV sert au registre de l'Académie. L'export ne paraît pas dans la
  coquille.
- **Sans le module** : les genres du module ont un cadenas qui ouvre l'essai, les options ne
  paraissent pas, et le registre invite à l'essai. Un relevé déjà écrit marche toujours au poste :
  un module échu ne casse jamais une instruction publiée.

### L'approbation à plusieurs (toggle `multiApproval`, `src/lib/model/approvals.ts`)

Réglages › Approbation offre trois choix : publier directement, une approbation, ou **plusieurs
signatures**. Dans ce dernier, l'usine nomme ses groupes (« Qualité », « Production », quatre au
plus) et qui signe pour chacun (des approbateurs ou administrateurs ; un groupe sans personne :
n'importe quel approbateur). À plusieurs, même un approbateur demande les signatures.

- La revue (`review.signatures`) garde la signature de chaque groupe avec l'**empreinte du contenu
  signé** (`contentHash`) : modifié ensuite, le groupe affiche « à refaire ». Des changements
  demandés effacent les signatures ; une nouvelle demande repart sans signature et nomme les
  membres des groupes comme approbateurs.
- L'éditeur montre où en est chaque groupe et offre « Signer (Qualité) » à qui peut signer ; la
  **dernière signature publie** (« Signer et publier »). La version garde chaque signature
  (`Version.approvals`) et une ligne « approuvée par » qui les nomme.
- La signature relit l'instruction juste avant d'écrire (`saveSignatures`) : celle qu'une autre
  personne vient de poser reste. L'accueil ne liste à approuver que ce que mes groupes n'ont pas
  encore signé.
- Toggle coupé, « plusieurs signatures » se comporte comme une approbation : rien ne se bloque.

### Avertir les bonnes personnes (toggle `notify`, `src/lib/model/inbox.ts`, `src/lib/server/notify.ts`)

- **« À voir »** (la cloche, en haut de la barre latérale et de l'en-tête du téléphone) : ce qui
  attend la personne, tiré des données sans rien écrire de plus. Une instruction à approuver ou à
  signer (mes groupes seulement), des changements demandés sur la mienne, un danger signalé, un
  écart relevé. Le chiffre compte ce qui est arrivé depuis la dernière ouverture (par appareil).
- **Courriels et téléphones** : le serveur avertit, par `POST /api/notify`. Il n'a pas de jeton à
  lui. Il passe par le **lien de service** de l'usine : un administrateur l'active dans Réglages ›
  Avertissements (`/api/notify/setup`), et le serveur crée alors, avec le jeton de cet
  administrateur, un lien invité qui ne lit que `clip_org` et `clip_contact` et qui envoie des
  courriels (`communication:send_email`, s'il en a le droit). Le serveur le **scelle**
  (AES-256-GCM, clé dérivée de `CLIP_PIN_SECRET` ou de `ABLY_KEY`) et le range dans les réglages de
  l'usine et sur chaque poste (`notifySeal`). Une tablette peut donc faire avertir sans jamais
  pouvoir l'ouvrir, et le scellé d'une autre usine est refusé.
- **Qui est averti** : une instruction à approuver, ses approbateurs (ou les membres des groupes
  qui signent) ; des changements demandés ou une publication, la personne qui avait demandé ; un
  danger ou un écart, les personnes que l'usine a nommées (au départ, les administrateurs et les
  approbateurs). Jamais l'auteur de l'événement. Chacun choisit dans Réglages › Avertissements :
  par courriel, sur ce téléphone (`push.register`), et un essai. Au plus 30 avertissements par
  heure pour une tablette, 60 pour une personne.
- **La fiche de contact** (`clip_contact`) se crée à la première visite et suit le nom, le courriel
  et la langue : l'avertissement part dans la langue de la personne. Les notifications passent par
  le service push d'Expo ; un toucher ouvre la page dans la coquille.
- **Rien ne bloque** : un avertissement part sans attendre le travail, et son échec ne se voit pas
  au poste. Le push demande la build qui contient `expo-notifications` (pas une mise à jour à
  distance seule).

### Retrouver parmi des milliers d'instructions (`src/lib/model/search.ts`)

Aucun écran ne lit la bibliothèque entière : à des milliers d'instructions, ce serait des mégaoctets
à chaque rafraîchissement, sur la tablette comme au bureau.

- **L'index** (`Instruction.searchText`) : numéro, titre, étiquettes, équipement, résumé, et pour
  chaque étape sa section, son titre, son texte et ses points clés, en minuscules et sans accents,
  chaque mot une fois (4 000 caractères au plus). Il se tient à la création (`createInstruction`), à
  chaque enregistrement du brouillon (`saveDraft`) et à la publication. Les instructions d'avant
  l'index le reçoivent en arrière-plan quand une personne qui écrit ouvre la liste (`backfillIndex`,
  par petits lots), avec leur numéro et la fiche de leur version publiée.
- **La recherche** se fait au serveur : chaque mot doit se trouver dans l'index (`$regex`), dans le
  titre (une instruction pas encore indexée) ou nommer un poste de l'instruction ; les mots se
  découpent comme l'index. Filtres : statut, catégorie, lieu, « pour moi ». Une page de 30, la
  suivante strictement avant la dernière ligne vue (`updatedAt`) ; « Voir plus » et le défilement
  la chargent. Le compte s'affiche en tête (« 42 sur 1 284 »). Le filtre reste dans la profondeur
  permise par la Gateway (5 niveaux) : `dataApi` met à plat un `$and` de premier niveau.
- **Les secteurs** : la zone ou ligne d'un poste (`Station.area`) regroupe les postes. Le filtre
  « Où ? » choisit un secteur (tous ses postes) ou un poste ; le champ propose les secteurs déjà
  nommés.
- **Le numéro de document** (`Instruction.number`, « IT-0042 ») se donne à la première publication
  (`allocateNumbers` : le compteur de l'usine, `numbering`, relu juste avant ; un numéro déjà pris est
  sauté) et reste ensuite. Le préfixe se règle dans Réglages › Usine. Il paraît sur les cartes, sous
  le titre dans l'éditeur, en tête de l'impression et sur la fiche au poste.
- **Les écrans demandent ce qu'il leur faut** (`src/hooks/queries.ts`, toutes les clés sous
  `instructions`) : un compte (limite du plan), la file de « À voir », les petites listes de
  l'accueil, la couverture des postes (`distinct`), le nombre par poste, les instructions d'un poste,
  le catalogue de la formation, les champs des statistiques, l'export page après page.
- **Au poste** : la liste ne lit que la fiche de chaque version publiée (`Published.card` : titre,
  catégorie, couverture, étapes, durée, numéro, langues), écrite à la publication ; l'instruction
  complète, traductions comprises, se lit à l'ouverture. « Tout voir » et la recherche (deux lettres
  et plus) cherchent au serveur, dans la portée du lien, une page à la fois.

### Les blocs communs (toggle `sharedBlocks`, feature `shared_blocks`, `src/lib/model/blocks.ts`)

Des étapes qui reviennent dans beaucoup d'instructions (le cadenassage d'une presse, le démarrage
d'une ligne, les EPI avant d'entrer) se rédigent une fois et se mettent à jour partout.

- **Un bloc est une instruction marquée `block`** : il se rédige, s'approuve et a ses versions comme
  elle, mais ne va à aucun poste : pas de version au poste (`clip_published`), pas de numéro, pas de
  lien, de traduction ni de questions de formation. La liste le range à part (« Blocs communs »,
  `?vue=blocs`, « Nouveau bloc ») ; la recherche, les comptes et les postes ne le voient pas.
- **Dans une instruction, ses étapes sont des copies** de sa dernière version publiée
  (`Step.fromBlock` : le bloc, sa version, son titre). Une copie porte un identifiant propre à son
  bloc (`copyId`, `<étape>_<bloc>`) : il ne change pas d'une version à l'autre (la traduction d'une
  étape inchangée reste bonne) et ne se confond ni avec une étape de l'instruction (une instruction
  dupliquée garde les identifiants de ses étapes) ni avec la copie d'un autre bloc.
- **Une copie ne se modifie pas sur place** : texte, médias, menu de l'étape et retouches de l'IA
  sont fermés, et l'assistant d'édition refuse d'y toucher (`applyOp`). Un bandeau violet dit d'où
  elle vient : « Ouvrir le bloc », et dans « … » « Détacher » (les étapes deviennent celles de
  l'instruction, avec un identifiant à elles, traductions et questions comprises) ou « Retirer le
  bloc ».
- **Faire un bloc** (« … » › « Faire un bloc commun ») : on coche des étapes, on nomme le bloc ; il
  est créé et publié (version 1) et ses copies prennent la place des étapes choisies, traductions et
  questions comprises. Une usine qui exige une approbation passe par « Nouveau bloc », qui s'approuve
  comme une instruction. **Insérer un bloc** : chercher parmi les blocs publiés ; il arrive après
  l'étape affichée, une seule fois par instruction.
- **Publier un bloc** (`propagateBlock`, dans le navigateur, une instruction après l'autre) : chaque
  instruction dont le brouillon le contient prend la nouvelle version (`replaceBlock`, à la place de
  la première suite de ses étapes). Une instruction publiée et à jour est republiée, avec « Bloc
  commun « … » vN. » en tête du résumé de sa version ; une instruction en cours de modification ou
  d'approbation ne reçoit que son brouillon. La traduction des étapes qui ont changé tombe :
  l'opérateur lit l'original plutôt qu'un texte périmé, jusqu'à la prochaine traduction. Les échecs
  se comptent (« republiez le bloc pour réessayer »).
- **L'éditeur du bloc** dit combien d'instructions l'utilisent (`countUsing`, filtre sur
  `json_data.draft.steps.fromBlock.id`) et ce que sa publication fera. Archivé, le bloc laisse ses
  copies telles quelles : on les détache pour les modifier.

### La formation et la matrice de compétences (toggle `training`, `src/lib/model/training.ts`)

Pas un LMS : on vérifie qu'une personne a compris une instruction, et on garde qui est formé, à
quel poste.

- **Les questions** (`InstructionContent.quiz`, 2 à 4 choix, une bonne réponse, un « pourquoi ») :
  l'IA en prépare 3 à 5 sur ce qui compte (mises en garde, valeurs, ordre des gestes, points clés),
  par l'opération `quiz` (`src/lib/ai/quiz.ts`), et l'auteur les retouche dans « … › Questions de
  formation » (`QuizDialog`). Elles vivent dans le brouillon : enregistrées, annulables, signées et
  traduites avec lui (énoncé, choix et pourquoi ; le bon choix garde son rang), et publiées avec la
  version. `cleanQuiz` rend sûr ce qui vient de l'IA comme de l'auteur : une question incomplète
  n'est pas posée, et la publication le signale.
- **Au poste** : à l'écran « Terminé », une personne nommée (« Qui êtes-vous ? ») touche « Valider
  ma formation » (`QuizRunner`) : une question à la fois, la bonne réponse et son pourquoi tout de
  suite. Réussie à 80 % (`PASS_RATIO`), la trace s'écrit dans `clip_training`, au nom de la
  personne et dans la langue lue ; sans réseau, elle attend dans l'appareil (`src/lib/util/outbox.ts`,
  la même file que les relevés). Ratée, on relit l'instruction ou on réessaie, sans trace. Le lien
  d'une instruction ne sait pas qui lit : il n'offre pas la formation. L'aperçu la fait essayer
  sans rien écrire.
- **La publication** dit combien de questions sont publiées (`Instruction.publishedQuiz`) et, sur
  « Il faut se re-former » (un changement important, choisi en publiant ou en demandant
  l'approbation, `review.retrain`), la version à partir de laquelle une formation compte
  (`trainingVersion`). Sans ce choix, une formation reste bonne d'une version à l'autre.
- **La matrice** (Équipe › Compétences, `?vue=competences`, `buildMatrix`) : les personnes en
  lignes, en colonnes les postes où une instruction publiée a des questions. Une case : formée à
  tout, en partie, pas formée ou à refaire ; touchée, elle nomme les instructions qui manquent. Le
  compte des formations à faire et « Seulement les écarts » mènent aux personnes à former.

### L'Académie (module ; toggle `academy`, feature `academy`, `src/lib/model/academy.ts`)

Former chaque personne et la garder qualifiée, poste par poste, sans quitter les instructions : ce
n'est pas un LMS (pas de cours libres, de catalogue ni de palmarès, `VISION.md`).

- **Le parcours d'un poste** est prêt d'avance : ce sont ses instructions publiées. Leurs questions
  se valident au poste, à la fin, comme sans le module (`clip_training`).
- **La validation sur le terrain** : un superviseur (droit `approve`) atteste qu'une personne sait
  tenir le poste, « qualifié » ou « peut former », avec une note (`signOff`). Chaque signature est un
  document de `clip_qualification` : la plus récente par personne et par poste fait foi
  (`latestQualifications`), et le journal entier est le registre. Retirer la qualification signe aussi
  (`level: 'none'`). La signature garde les questions validées à ce moment (`trainingsDone/Required`).
- **Les niveaux** (`standingOf`) : pas formé, en formation (des questions validées), qualifié, peut
  former, à revalider (échue). Une pastille dit « à revalider bientôt » (un mois avant) ou qu'une
  instruction du poste demande de se re-former.
- **La revalidation** : l'échéance se fixe à la signature, selon la règle de l'usine
  (`OrgSettings.academy.revalidateMonths` : 6, 12 ou 24 mois, ou jamais ; 12 par défaut). « À voir »
  le rappelle à qui valide un mois avant, et une fois échue (`dueQualifications`, type `requalify`).
- **La couverture par quart** (`coverage`) : pour chaque poste et chaque quart de l'équipe, combien de
  personnes qualifiées le tiennent (personne, une seule, au moins deux) et qui.
- **Le registre** se télécharge en CSV (le journal entier, sans formule possible dans le tableur) ;
  l'attestation d'une personne s'imprime (`/equipe/attestation/[id]`, `buildAttestationHtml`).
- **Sans le module**, l'onglet garde la matrice simple, avec une carte qui propose l'essai
  (`AcademyTeaser`, la fenêtre d'achat du module).

### Les rapports (toggle `reports`, `src/lib/reports`, pages `/rapports`)

Un répertoire de modèles prêts, inspiré de K2 Cadence : chaque rapport répond à une question d'une
personne de l'usine, et l'IA commente des chiffres que le code a calculés. Les rapports remplacent
« Statistiques » dans le menu ; l'adoption et la valeur restent sur `/statistiques`, une carte du
répertoire y mène.

- **Le répertoire** (`/rapports`) : les rapports par sujet (au poste, qualité, formation,
  bibliothèque, direction), « Pour vous » d'abord selon le rôle (`forRoles`, quatre au plus, sans les
  répéter plus bas), et une recherche. Neuf rapports : la revue de la semaine, le temps par
  instruction, qui a fait quoi, par poste et secteur, les écarts et relevés, avant / après une
  révision, la formation et la qualification, les retours des opérateurs, la santé de la bibliothèque.
- **Les filtres** : 7, 30 ou 90 jours de calendrier, aujourd'hui compris, comparés à la même fenêtre
  N jours plus tôt (`periodOf`, `previousOf`) ; le lieu (`PlacePicker`) ; le quart, celui de la
  personne nommée (`clip_operator.shift`) : un fait sans personne n'est d'aucun quart. Là où le quart
  ne change rien (retours, bibliothèque : `byShift: false`), son filtre ne se montre pas.
- **Les chiffres** (`facts.ts`, fonctions pures et testées) : une instruction faite vient de
  l'événement `complete` (qui, où, quelle version, combien de temps). Une durée de moins de 10 s ou
  de plus de 12 h (une tablette oubliée) ne compte pas dans les temps, mais la réalisation compte. Un
  temps se dit en médiane (« temps habituel ») et au 90e centile (« 9 fois sur 10 ») ; un taux se
  calcule en somme sur somme, jamais en moyenne de taux ; sous 5 réalisations, la valeur porte une
  astérisque et une note « peu de données ».
- **Les blocs** (`catalog.ts`) : chiffres clés (la valeur, celle d'avant, le changement en couleur
  selon ce qu'il veut dire), barres par jour, tableaux et « à regarder ». Un tableau se trie en
  touchant une colonne, montre 25 lignes puis « + N », s'exporte en CSV (un nombre reste un nombre,
  pas dans la coquille) et chaque ligne mène à l'instruction, au registre ou à l'Équipe. Une
  instruction qui n'est plus publiée se dit « Instruction retirée ».
- **Avant / après une révision** : chaque version avec ses propres réalisations sur la période. Une
  seule mesure qui se dégrade (temps +10 %, écarts +2 points, retours « pas clair » ou « erreur »
  +5 pour 100) met l'instruction « à surveiller », même plus rapide ; sinon, une qui s'améliore la dit
  « mieux » ; sans assez de données, pas de bilan (`verdictOf`, `movesOf`).
- **La formation** : formé veut dire les questions réussies sur la version à jour
  (`trainingVersion`) avant le travail ; qualifié, la plus récente signature de l'Académie d'avant
  le travail, pas retirée ni échue.
- **Ce qu'un rapport lit** (`load.ts`) : seulement ce dont il a besoin (`needs`), depuis le début de
  la période précédente : les événements (les instructions faites, et les ouvertures pour la
  bibliothèque seulement ; projection ; par pages de 10 000, la limite d'une requête Data, 30 000 au
  plus ; au-delà, le rapport le dit),
  les travaux avec relevés (5 000), les retours (3 000), les fiches publiées pour les titres et les
  temps prévus, la formation, et des comptes faits au serveur pour la bibliothèque. Jamais
  l'instruction complète ni toute la bibliothèque.
- **L'IA** (`narrative.ts`) : elle reçoit le texte des blocs (`blocksText`, 15 lignes par tableau au
  plus) et rend l'essentiel, ce qu'il faut surveiller et des pistes, trois au plus chacun, par un
  schéma JSON (`report_summary`, 10 crédits) ; une question sur le rapport coûte `report_question`
  (5 crédits). Les deux passent par `aiApi.ask` (l'accord pour l'IA ; le débit par la plateforme une fois la facturation branchée). Si l'IA
  ne répond pas, l'analyse automatique (`autoNarrative`) dit les changements depuis avant. Une
  analyse disparaît quand la période, le lieu ou le quart change.
- **Les droits** : le droit `stats` ; la revue de la semaine est ouverte à tous les plans
  (`free`), les autres rapports viennent avec la feature `adoption_stats` (cadenas et fenêtre
  d'achat par `useGate`). Un rapport s'imprime (`print.ts`, tout le texte échappé).

### L'aperçu qu'on modifie (`PreviewEditing`, toggle `previewAgent`)

L'aperçu (`/instructions/{id}/lire?apercu=1`) montre le brouillon tel qu'au poste. Pour qui peut
modifier, l'assistant d'édition y est une bulle ronde : dans la barre des étapes, à droite de
« Suivant », pour ne rien cacher de l'étape ; ailleurs (avant de commencer, à la fin), elle flotte
en bas à droite. Ouverte, c'est la même conversation que dans l'éditeur : écrire, dicter, parler en
direct. Ce qu'elle change s'enregistre dans le brouillon et le lecteur va à l'étape modifiée ; sur
ordinateur, le lecteur se pousse pour laisser sa colonne au panneau. Ctrl+Z annule le dernier
passage, et un point de retour le précède.

### Les annotations d'une photo (`src/lib/annotations`, `Annotator`)

Les marques se posent en proportion de l'image (0 à 1) et se dessinent par une seule source
(`annotationsMarkup`) : éditeur, poste, PDF. Le cadre où elles se posent est exactement l'image
affichée (`AnnotatedImage` : toute la largeur, ou toute la hauteur quand elle manque), au bureau, au
téléphone et dans les tuiles « à faire / à éviter » ; une marque tombe au même endroit de la photo
partout. Les sortes : crayon, surligneur, flèche, ligne, **distance** (une pointe et une butée à chaque
bout, la valeur au milieu : « 12 mm », demandée dès qu'on la trace), cercle, cadre, texte, numéro,
icône, flou ; traits et formes en **pointillé**, cercle et cadre **remplis** (une zone transparente).
Une étiquette reste toujours dans l'image : la légende d'une forme va dessous, au-dessus quand la
forme touche le bas, dedans quand elle prend toute la hauteur, et près d'un bord elle glisse vers
l'intérieur (`keepInside`). Dans l'annotateur, la barre des options garde sa hauteur : l'image ne
bouge pas quand une marque se choisit ou se lâche. Il s'ouvre sur la Sélection quand la photo a déjà
des marques (on vient les ajuster), sinon sur le dernier outil de dessin, avec sa couleur, sa taille
et son style, retenus sur l'appareil (la flèche la première fois).

### Les médias d'une étape

Une étape porte jusqu'à six médias et une disposition (`layout`) : un à la fois, **à faire / à éviter**
côte à côte (verdict `do` / `dont` sur chaque média, bordures verte et rouge), ou grille. Un média peut
être un **schéma HTML** généré par l'IA (`visual` : SVG, dessin, vue 3D) : il voyage avec l'instruction
et s'affiche dans une iframe `sandbox="allow-scripts"` **sans** `allow-same-origin` — il ne voit ni les
jetons, ni les données, ni la page. Le PDF le remplace par un renvoi vers l'app. Un schéma est le
dessin seul, lisible d'un coup d'œil (`visualSystem`, `src/lib/ai/prompts.ts`) : une idée (la pièce et
le geste de l'étape), ni en-tête ni texte d'explication, au plus 4 libellés de 1 à 3 mots, le bleu pour
le geste et les couleurs de sécurité seulement quand l'étape porte un risque.

### La lecture au téléphone (toggle `phoneReader`, repli éteint)

Au téléphone tenu droit, le média prenait toujours près de la moitié de l'écran : une vidéo couchée y
laissait des bandes noires, et le texte se lisait en défilant. Maintenant (`src/lib/media/fit.ts`) :

- **Le média à ses vraies proportions** : sur toute la largeur, c'est sa plus grande taille possible
  (plus haut, on n'ajoute que du noir). Les proportions s'apprennent en l'affichant — une photo à son
  chargement, une vidéo à ses métadonnées (ou à son image d'attente, lue tout de suite), la page d'un
  document à son image — et restent connues pour la séance (`src/lib/media/ratio.ts`).
- **Au plus un peu plus de la moitié de la place** (0,52), pour une photo en hauteur.
- **Le texte se lit sans défiler quand c'est possible** : une photo ou un document cède au texte ce
  qu'il lui faut, sans descendre sous 38 % de la place ; « Agrandir » montre le média en plein écran.
  Une vidéo garde toute sa largeur et, dessous, la bande de ses commandes (`[data-fit='top']`) :
  rapetissée, ses commandes en cacheraient le geste. Le clavier ouvert (une note, une mesure) ne fait
  pas bouger le média.
- **Plus serré au téléphone** : la pastille du numéro rapetisse (il est déjà dans l'en-tête), et les
  gestes de l'étape (« Pas clair ? », la question, la voix) tiennent sur une ligne qui glisse.
- **Couché, côte à côte** : le média à gauche, le texte à droite qui défile seul ; l'en-tête et les
  boutons du bas se font moins hauts (toujours bien plus de 44 px). Aucun bouton : on tourne le
  téléphone.
- **Tout voir sur une page** : au téléphone, depuis le sommaire (« Étape 3 sur 12 ») ; l'en-tête
  offre alors « Pas à pas » pour revenir. Au bureau, comme avant, dans l'en-tête.
- L'éditeur au téléphone (« Comme au poste ») donne au média les mêmes proportions.

### Les vidéos au poste, sur un réseau faible (toggle `stepReel`, repli éteint)

- **Un lecteur gardé** (`src/lib/media/videoPool.ts`, au lecteur d'instruction) : d'une étape à
  l'autre, le même élément vidéo saute au bon moment avec ce qu'il a déjà téléchargé ; la vidéo ne se
  recharge pas. Un lecteur neuf commence à télécharger au moment de l'extrait (`#t=`). L'étape
  suivante se prépare d'avance si elle lit une autre vidéo.
- **La vidéo des étapes** (`src/lib/media/reel.ts`) : une seule vidéo courte, montée par la Gateway
  avec l'extrait de chaque étape, dans l'ordre (`POST /api/v1/files/videos/compose`, 720p, scope
  `files:process`). Chaque extrait note sa place (`clip : { url, at, src, start, end }`) ; le poste ne
  télécharge que ces secondes, et la suivante est déjà chargée. Elle ne retient jamais la
  publication : les extraits inchangés gardent leur place (`carryClips`) ; si un extrait a changé, la
  vidéo se monte après, en arrière-plan, et le document public la reçoit s'il en est encore à cette
  version (`attachReel`). D'ici là, ou si le montage échoue, le poste lit la vidéo d'origine ; après un
  échec, on ne réessaie pas avant 30 minutes. **Novembre 2026 : la route répond 500 en QA, même avec
  l'exemple de sa propre spec** ; rien ne se monte tant qu'elle n'est pas réparée.
- **Une vidéo qui quitte l'écran arrête de télécharger** (ailleurs qu'au lecteur) : détachée, elle
  continuerait jusqu'à ce que le navigateur la jette.
- **Économie de données ou 2G** (`navigator.connection`, absent sur iOS) : rien ne se prépare d'avance,
  et une vidéo attend un toucher si la personne n'a pas choisi de mode.
- Mesuré sur un lien de 3 Mbit/s, trois étapes de 6 s tirées d'une vidéo de 2 min : 8,8 Mo et 0,9 à
  1,2 s d'attente par étape avant ; 3,5 Mo (les seules secondes utiles) et 50 ms aux étapes 2 et 3
  avec la vidéo des étapes.

## 5. Compatibilité et pilotage

- **Feature toggles** servis par `GET /api/config` (variables d'environnement du serveur web). Sans
  réponse, chaque toggle prend sa valeur de repli, qui n'active jamais une fonction nouvelle.
- **Mise à jour forcée de la coquille** : `minShellVersion` (contrainte semver par plateforme) dans la
  même réponse ; serveur injoignable = on ne bloque pas.
- **Documents partagés entre versions** : un `PATCH` ne touche que ses champs ; un remplacement
  complet relit et renvoie le document entier, champs inconnus compris.
- **Bannière d'état** : la route `GET /api/v1/communication/banners` de la Gateway, lue par l'app web
  (donc aussi dans la coquille).

## 6. Facturation

Catalogue dans `billing.manifest.yaml` (plans, crédits, limites, opérations d'IA et leur prix).
Branchée derrière `NEXT_PUBLIC_BILLING_V2=1`, éteinte par défaut tant que les routes
`/api/v2/billing/*` et `/api/v2/ai/ask` répondent `404`. Drapeau éteint : aucun écran de
facturation, chaque appel d'IA part sur `/api/v4/assistant/ask`. Allumé : chaque appel passe par
`/api/v2/ai/ask` avec la clé de son opération, et la plateforme débite.

**Les leviers de vente.** La plateforme ne reçoit pas les limites `reported`. L'app compte donc
les postes, les rédacteurs (tous les membres sauf les lecteurs, invitations comprises) et les
instructions publiées, et les compare au plafond lu dans l'état.

- **La jauge** (`UsageMeter`) reste une ligne discrète sous 80 %. Au-delà, elle s'allume et nomme
  le plan qui en donne plus, choisi par `planFor`. Sur la liste des instructions, elle n'apparaît
  qu'à partir de 80 %.
- **La fenêtre des refus** d'une limite dit ce que le plan permet et où l'on en est (`used`).
- **Le dossier pour la direction** est une page imprimable (`buildValueReportHtml`), imprimée par
  le navigateur ou par la capacité native `print`. Il dit la valeur estimée selon les hypothèses
  de l'usine, puis les consultations, les réalisations et les postes couverts. La personne choisit
  le plan à proposer, ou aucun ; le prix vient de `/api/v2/billing/plans`. Une personne qui n'est
  pas administratrice y arrive aussi depuis la fenêtre des refus, avec le plan conseillé déjà choisi.

**Les modules en option** (`kind: addon` au manifeste). L'Académie et les Relevés s'ajoutent à Équipe
ou à Usine, sur le web seulement (un module ne se vend pas dans les magasins), avec 14 jours offerts
une fois par organisation. Leur prix suit le plan de base : un module par plan de base
(`academie-equipe`, `academie-usine`…), et l'app ne propose que celui de son plan (`MODULES`,
`addonFor`). La page Abonnement a sa section « Modules » ; la fenêtre des refus d'une feature de
module propose son essai (`moduleOffer`, le module désigné par `upgrade_hint.addon_code` d'abord) ou,
sur Gratuit et Solo, le plan qui le reçoit. Les prix se lisent toujours à la plateforme. Un module se
montre et se vend seulement une fois bâti (toggles `academy`, `recordsPlus`, allumés tous les deux).

**L'aperçu de la facturation** (toggle `billingPreview`, `src/lib/billing/preview.ts`, `mode.ts`). Tant
que le catalogue n'est pas publié (drapeau éteint), le web montre quand même tout ce qui se vend : la
page Abonnement (plans, modules, crédits, jauges), la pastille, les cadenas, les invitations à l'essai
et le conseiller. L'état vient d'une copie du manifeste (`PREVIEW_PLANS`, que le test compare au
manifeste plan par plan) et de ce que la personne choisit en tête de la page, dans cet appareil
(`clip_pref_billing_preview`) : un plan, des modules, un niveau de crédits (plein, bas, épuisés). Par
défaut, Usine avec tous les modules : rien ne se ferme pour personne. `billingClient` passe au client de
l'aperçu (`createPreviewClient`) : « Choisir » ou « Essayer » change l'aperçu et revient à la page
(`?essai-apercu=`, un message, puis l'adresse se nettoie) ; il n'y a ni paiement, ni portail, ni débit, et
l'IA garde sa route d'avant. Dans la coquille, l'aperçu demande aussi le toggle `billingPreviewApp` et
n'y montre ni prix ni achat d'ailleurs : les plans et les modules sans prix, et « Voir CLIP avec … » dans
la fenêtre d'un cadenas, qui change l'aperçu ; la vraie vente y reste celle du magasin (`StoreBuy`).
On coupe ce toggle avant une soumission aux magasins tant que la vraie facturation n'y est pas branchée.

**Le conseiller d'achat** (toggle `salesAdvisor`, `src/lib/billing/advisor.ts`). De temps en temps,
l'offre qui sert vraiment l'usine, sur une carte de l'accueil (`OfferCard`), jamais au poste ni
pendant une capture ou une publication.

- **Les offres possibles** (`candidates`), de la plus pressante à la moins pressante : une limite
  atteinte, puis à 80 % (à partir de deux unités : un seul rédacteur sur Solo, c'est le plan) ; une
  fonction fermée essayée deux fois en 30 jours (un refus de la plateforme, un verrou touché, les
  crédits épuisés) ; un module que l'usage appelle (10 formations validées ou 30 relevés en 30 jours,
  si le plan le reçoit). Chacune a de quoi s'acheter (`planFor`, `moduleOffer`).
- **Rarement** (`pickOffer`) : une offre à la fois, qui reste tant qu'elle sert ; une nouvelle au
  plus par semaine ; « Plus tard » la range 30 jours, et deux semaines sans réponse aussi. Les comptes
  sont lus avant de choisir, pour qu'une offre montrée ne disparaisse pas pendant un chargement.
- **« Voir l'offre »** ouvre la fenêtre d'achat habituelle (`source: 'advisor'`) : le paiement pour
  l'administrateur, le magasin dans l'app (plans seulement), sinon « Demander à l'administrateur ».
- **La demande à l'administrateur** (`clip_request`, `src/lib/model/requests.ts`) : une par personne
  et par fonction sur 30 jours. « À voir » la montre aux administrateurs, une ligne par fonction
  (« Avec Usine »), jusqu'à ce que l'usine l'ait ; l'avis part par `/api/notify` (`request`).
- **La mesure** : chaque offre montrée, ouverte, rangée ou demandée se note dans `clip_event`
  (`type: 'offer'`, `offer`, `action`), à côté des statistiques sans les fausser.

## 7. Les langues de l'outil (`src/lib/i18n`)

Le cœur (`src/lib/i18n/core.ts` : langue courante, `messages()`, `locale()`) n'a pas de React : les
routes du serveur peuvent l'atteindre (elles parlent français). `src/lib/i18n` y ajoute les hooks
(`useMessages()`, `useLang()`), réservés aux composants.

L'outil parle français et anglais ; une autre langue s'ajoute sans toucher aux écrans.

- **Un dictionnaire par domaine** (`i18n/fr/<domaine>.ts` : `common`, `catalog`, `shell`, `auth`,
  `home`, `instructions`, `capture`, `editor`, `editorTools`, `stations`, `feedback`, `stats`,
  `settings`, `billing`, `importer`, `publicLinks`). Le français est la source ; chaque autre langue
  (`i18n/en/<domaine>.ts`) est typée `typeof` le français : une clé manquante, en trop ou d'une autre
  forme fait échouer `tsc`, donc la construction. `tests/i18n.test.ts` refuse en plus un texte vide,
  une phrase anglaise copiée du français et un accent français dans l'anglais.
- **Une valeur** est un texte, ou une fonction pour un nombre, un pluriel ou un nom à insérer :
  `steps: (n: number) => \`${num(n)} étape${n > 1 ? 's' : ''}\`` (en français 0 et 1 sont au
  singulier ; en anglais seul 1 l'est). Pas de phrase coupée en morceaux recollés dans l'écran.
- **Dans un composant** : `const t = useMessages()`, puis `t.editor.save`. Le composant se redessine
  quand la langue change. **Ailleurs** (fonction d'une bibliothèque, gestionnaire d'événement) :
  `messages()`, lu au moment de l'appel, jamais au chargement du module. Une liste de libellés
  écrite en constante devient une liste de clés, et le libellé se lit au rendu.
- **Les mots du métier** (catégories, EPI, énergies, mises en garde, rôles, statuts, thèmes) restent
  dans `model/catalog.ts` avec leurs couleurs : leurs libellés sont des accesseurs qui lisent le
  dictionnaire `catalog`. Le nom des langues des opérateurs vient du navigateur
  (`Intl.DisplayNames`) dans une langue de l'outil autre que le français.
- **Dates et nombres** : `formatDate`, `timeAgo`, `plural`, `formatBytes` (`util/cn.ts`), `num()` et
  `locale()` (`fr-CA` ou `en-CA`) suivent la langue. Jamais `'fr-CA'` écrit dans un écran.
- **Le choix** : Réglages → Apparence, et le menu Mon compte du téléphone (`AppearanceControls`).
  Sans choix, la langue du navigateur. Il se garde dans `clip_pref_ui_lang`, qui survit à la
  déconnexion, et met `lang` sur la page. Un changement redessine la page en entier (`AppShell`).
- **Ce qui ne suit pas la langue de l'outil** : le contenu d'une instruction garde sa langue
  (`content.language`) ; une instruction neuve prend celle de l'outil de son auteur
  (`contentLanguage()`), et l'IA qui la retouche écrit dans la langue de l'instruction. Les consignes
  données au modèle (`ai/prompts.ts`) restent en français : elles ne s'affichent pas. Le lecteur des
  opérateurs garde ses propres langues (`components/player/i18n.ts`), choisies au poste ; le PDF d'une
  instruction suit la langue de l'instruction.
- **Le lecteur des opérateurs** parle la langue choisie au poste, pour tout ce qu'il montre : ses mots,
  ceux du métier (EPI, énergies, mises en garde, motifs de retour) et ceux des médias. `MediaView` et
  le zoom servent aussi à l'éditeur : le lecteur leur donne ses mots par `MediaLabelsProvider`, sinon
  ce sont ceux de l'outil. La dictée du lecteur reconnaît la langue du poste (`DictationLanguage`).
- **La coquille mobile** a ses propres mots (`apps/mobile/src/i18n`) : la page lui dit sa langue par
  le pont (`ui.language`), et les écrans natifs la suivent.
- **Aucun texte en dur dans un écran** : `scripts/find-hardcoded-text.mjs` relève le texte écrit dans
  `src/app` et `src/components`, et `tests/no-hardcoded-text.test.ts` échoue s'il en trouve. Une
  consigne de modèle vit dans `src/lib/ai`, pas dans un composant.
- **Les tests** lisent l'outil en français (`vitest.setup.ts`) ; un test qui veut l'anglais appelle
  `setLang('en')`.
- **Ajouter une langue** : un dossier `i18n/<code>/` typé sur le français, la langue dans `LANGS` et
  `LANG_NAMES` (`i18n/index.ts`), sa locale dans `locale()` ; pour la coquille, un dictionnaire de plus
  dans `apps/mobile/src/i18n` ; pour l'IA, son nom dans `writtenIn` (`ai/prompts.ts`).
