# CLIP V3 — notes pour Claude

Instructions de travail en usine générées par l'IA. Avant de changer ce que le produit montre ou sait
faire, lire [`VISION.md`](VISION.md) (ce qui ne doit pas changer, ce qui est hors de portée) ; le
« comment » est dans [`docs/architecture.md`](docs/architecture.md) et
[`docs/pont-natif.md`](docs/pont-natif.md).

## Commandes

- À la racine (workspaces npm `apps/web` et `packages/*`) : `npm run dev`, `npm run typecheck`,
  `npm test` (Vitest, `apps/web/tests`), `npm run build`.
- Coquille mobile, hors workspaces : `cd apps/mobile && npm test` (Jest) et `npm run typecheck`.

## Repères

- **Une seule interface** : tout l'écran est dans `apps/web`. La coquille Expo n'ajoute que des
  capacités natives, déclarées dans `packages/bridge` ; le web vérifie une capacité
  (`hasCapability`) avant de l'appeler et garde toujours un repli web.
- **La Gateway Octopus est le seul backend.** Ses contrats sont dans `apps/web/src/lib/gateway`
  (`client.ts` : jetons, un seul rafraîchissement sur 401 ; `data.ts` ; `files.ts` ; `ai.ts`). On ne
  devine pas une route : on lit sa spec (skill `api-plateforme-ii`).
- **Données** : connexion avec l'application partagée `html` ; chaque document porte
  `json_data.app_identifier = "clip-v3"` et chaque lecture filtre dessus (`dataApi` le fait). Les
  types sont dans `src/lib/model/repo.ts` (`T`). Une modification partielle passe par `PATCH`, et une
  réécriture complète garde les champs qu'on ne connaît pas.
- **Liens publics** (poste, instruction) : la portée se bâtit côté serveur dans
  `src/lib/server/scope.ts`, jamais à partir du navigateur. Un lien ne lit que `clip_published`.
- **Génération suivie partout** : elle tourne dans l'appareil qui la lance (`startGeneration`). Il
  écrit son état dans l'instruction (`generating` : étape, signe de vie toutes les 30 s ;
  `src/lib/ai/creation.ts`). Les autres appareils le lisent par une petite requête partagée
  (`useCreations` : 10 s pendant une création, 60 s sur l'accueil et la liste, jamais onglet caché).
  Sans signe de vie depuis 2 min, elle est « interrompue » et se relance d'un geste. Avec `ABLY_KEY`
  (Vercel, serveur), le temps réel annonce début, étapes et fin sur le canal de l'organisation
  (`/api/realtime/token`, `src/lib/realtime`) : l'autre appareil se met à jour aussitôt. Les images
  générées passent par OpenAI, niveau mid (`IMAGE_MODEL`, repli Google si la passerelle refuse).
- **Traductions** : rangées dans `translations[langue]` et appliquées par `localized`
  (`src/lib/model/translation.ts`), médias compris : légendes, annotations, texte des schémas, et
  en option les images refaites avec leur texte traduit. Un média traduit nomme l'original (`of`).
- **Revenir en arrière** (toggle `draftHistory`) : annuler et rétablir pendant la séance
  (`src/lib/history/undo.ts`), et des points de retour du brouillon dans `clip_checkpoint`
  (`src/lib/model/checkpoints.ts`) : au plus un par 10 minutes de modification, avant l'assistant, une
  régénération ou un retour, sans doublon ni copie de la version publiée, 20 par instruction. Après
  chaque enregistrement, le cache de l'instruction suit (`cacheDraft`).
- **Vidéos au poste** (toggle `stepReel`, allumé ; les vidéos de l'éditeur gardent chacune leur lecteur) : un seul lecteur gardé d'une étape à l'autre, la vidéo ne
  se recharge pas (`src/lib/media/videoPool.ts`) ; la vidéo des étapes, montée après la publication
  sans jamais la retenir (`src/lib/media/reel.ts`). En novembre 2026, la route de montage répond 500
  en QA : le poste lit alors la vidéo d'origine.
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
- **Académie** (module ; toggle `academy`, feature `academy`), dans Équipe › Compétences : le
  parcours d'un poste = ses instructions publiées ; un superviseur (droit `approve`) valide sur le
  terrain, « qualifié » ou « peut former » (`clip_qualification`, un journal : la plus récente fait foi,
  et c'est le registre) ; la qualification se revalide tous les 6, 12 ou 24 mois
  (`OrgSettings.academy`), rappelée dans « À voir » un mois avant ; couverture par quart, registre
  CSV, attestation à imprimer (`/equipe/attestation/[id]`). `src/lib/model/academy.ts`. Sans le
  module, la matrice simple et une invitation à l'essai.
- **Blocs communs** (toggle `sharedBlocks`, feature `shared_blocks`) : des étapes rédigées une fois
  (cadenassage, démarrage, EPI) dans une instruction marquée `block`, qui ne va à aucun poste
  (`src/lib/model/blocks.ts`). Dans une instruction, ses étapes sont des copies verrouillées
  (`Step.fromBlock`, identifiant `copyId`) ; publier le bloc republie les instructions à jour et
  met à jour le brouillon des autres (`propagateBlock`).
- **Formation** (toggle `training`) : 3 à 5 questions par instruction, préparées par l'IA (`quiz`,
  `src/lib/ai/quiz.ts`) et retouchées par l'auteur ; elles vivent dans le brouillon et se traduisent
  avec lui. Au poste, une personne nommée les passe à la fin ; réussie à 80 %, la trace s'écrit dans
  `clip_training` (`src/lib/model/training.ts`). La matrice (Équipe › Compétences) croise personnes
  et postes ; « Il faut se re-former » à la publication (`trainingVersion`) fait tomber les
  formations d'avant. Pas un LMS (`VISION.md`).
- **Rapports** (toggle `reports`, page `/rapports`, à la place de Statistiques dans le menu) : un
  répertoire à la K2 Cadence, des modèles prêts qui répondent chacun à une question (revue de la
  semaine, temps par instruction, qui a fait quoi, par poste, écarts, avant / après une révision,
  formation, retours, bibliothèque ; l'adoption reste `/statistiques`), sur 7, 30 ou 90 jours de
  calendrier comparés à la même fenêtre d'avant, par lieu et par quart. Le code calcule chaque chiffre
  (`src/lib/reports/facts.ts`, `catalog.ts`) : un taux en somme sur somme, un temps en médiane et
  « 9 fois sur 10 », une durée hors de 10 s à 12 h exclue des temps, « peu de données » sous 5
  réalisations. L'IA ne fait que les commenter (`narrative.ts`, `report_summary` et
  `report_question`), avec une analyse automatique en repli. Les personnes vont par ordre
  alphabétique : un registre, jamais un palmarès. La revue de la semaine est ouverte à tous ; les
  autres viennent avec `adoption_stats`. Un rapport lit au plus 20 000 événements et 5 000 travaux
  (`load.ts`), et le dit.
- **Feature toggles** : `GET /api/config` (`CLIP_TOGGLES`) ; une fonction nouvelle ou risquée y passe,
  et le repli n'active jamais une fonction nouvelle.
- **Sections, relecture, exigences d'Apple** : `Step.section` (une longue instruction en phases, et le
  sommaire au poste ; `src/lib/model/sections.ts`) ; `Instruction.renewal` (« à revoir dans 1 an »,
  rappelé un mois avant ; `src/lib/model/renewal.ts`) ; rien ne part vers l'IA sans l'accord de la
  personne (`requireAiConsent`, `src/lib/ai/consent.ts`) ; « Supprimer mon compte » dans Mon compte.
- **Interface** : français du Québec et anglais, par les dictionnaires typés de `src/lib/i18n`
  (`useMessages()` dans un composant, `messages()` ailleurs ; aucun texte écrit dans un écran, aucun
  `'fr-CA'` en dur ; règles dans `docs/architecture.md` §7). Design system « verre » de
  `src/app/globals.css` (tokens, `glass-*`), une seule action principale par écran, trois états pour
  toute donnée asynchrone, cibles d'au moins 44 px, mode sombre.
- **Des dizaines de personnes** : toute liste de personnes (ou qui peut grandir) a sa recherche dès
  8 éléments (`SearchField`, chaque mot cherché : `searchTokens`/`matchesTokens`,
  `src/lib/util/people.ts`) et des filtres simples où ils servent (quart, lieu, rôle, « à revalider ») ;
  choisir parmi beaucoup passe par `PeopleChips` (les choisies d'abord, 24 autres au plus, recherche
  dès 12). À la tablette, « Qui êtes-vous ? » : les gens du poste d'abord, une grande recherche, jamais
  de clavier qui s'ouvre tout seul. `?q=` ouvre l'Équipe ou le registre déjà cherchés.

## Pièges déjà rencontrés

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
- Les enveloppes des routes Data ne sont pas uniformes (`result` sur `/one`, `count` sur `/count`) :
  passer par `dataApi`.
- La valeur interne d'un crédit d'IA, en argent, ne s'écrit nulle part dans le dépôt (code, docs,
  commits) : les prix se disent en crédits.

## Facturation

- Le catalogue (plans, prix, crédits) vit dans `billing.manifest.yaml`, à la racine. On ne le modifie
  qu'en passant par ce fichier, jamais par une écriture directe en base. Il doit passer la simulation
  de `billing-publish` avant d'être publié ; le verrou `billing.manifest.lock.json` dira ce qui est
  publié (rien ne l'est encore). Le slug `clip-v3` doit d'abord être enregistré à la Gateway comme
  application.
- La grille (manifeste) : Gratuit (1 rédacteur, 3 publiées, 1 poste, 300 crédits) · Solo 49 $/mois (1, 30,
  5, 2 500) · Équipe 299 $/mois, mis en avant (5 rédacteurs, illimitées, 25 postes, 12 000) · Usine
  899 $/mois (15, illimitées, 100, 40 000) · Entreprise sur devis, hors manifeste. Annuel = 10 mois.
- Les modules en option (`kind: addon`), sur le web seulement, avec Équipe ou Usine, 14 jours offerts :
  Académie (feature `academy`, 149 $ avec Équipe, 449 $ avec Usine) et Relevés (`records_plus`, 99 $ et
  299 $). Un module par plan de base (`academie_equipe`…) ; l'app ne propose que celui de son plan
  (`MODULES`, `src/lib/billing/catalog.ts`, comparé au manifeste par le test). Le rattachement au plan de
  base n'a pas de champ documenté : la simulation de `billing-publish` le confirme. Un module se montre
  et se vend seulement une fois bâti (toggles `academy` et `recordsPlus`, allumés : les deux le sont).
- Ce qui se facture : `ai_credits`, une banque de crédits d'IA par mois · `published_instructions`,
  `stations` et `editors`, des limites par plan (comptées par l'app, `capacity_source: reported`) ·
  `translations`, `adoption_stats`, `approvals`, `bulk_import`, `voice_assistant`, `brand_kit`,
  `full_export`, `shared_blocks`, oui ou non selon le plan. Les opérateurs et les lecteurs ne se comptent jamais.
- Le prix en crédits de chaque opération d'IA, déclaré dans `ai_operations` du manifeste et débité
  par la plateforme (même liste et mêmes prix dans `AI_COSTS` de `src/lib/billing/catalog.ts`) :

  | Opération (clé envoyée) | Ce qu'elle fait | Crédits |
  |---|---|---|
  | `generate_s` | Générer une instruction à partir de peu de médias | 150 |
  | `generate_m` | Générer à partir de médias moyens | 300 |
  | `generate_l` | Générer à partir de beaucoup de médias | 750 |
  | `import_s` | Convertir un document court (PDF, Word) | 60 |
  | `import_l` | Convertir un document long | 120 |
  | `step_assist` | Retoucher une étape (raccourcir, clarifier, ajouter un point clé, traduire les textes d'un média…) | 5 |
  | `translate` | Traduire une instruction : ses textes, les annotations, les légendes et le texte des schémas | 30 |
  | `translate_image` | Refaire une image avec son texte traduit (option de la traduction, ou l'assistant ; l'image comprise) | 70 |
  | `annotate` | Placer des flèches et des cercles sur une photo | 5 |
  | `illustrate` | Illustration générée à partir d'une photo (l'image comprise) | 70 |
  | `ask_question` | Répondre à une question d'opérateur sur l'instruction | 2 |
  | `standard_agent` | Rédiger le standard de rédaction à partir d'une description | 5 |
  | `edit_agent` | Un échange avec l'assistant d'édition (il rend les modifications à faire) | 20 |
  | `visual` | Schéma généré : une page HTML autonome (SVG, dessin, vue 3D) | 60 |
  | `look_s` | L'assistant d'édition revoit des sources d'origine (peu de médias), seulement si la demande l'exige | 60 |
  | `look_m` | Revoir des sources moyennes | 120 |
  | `look_l` | Revoir beaucoup de médias | 300 |
  | `quiz` | Préparer les questions de formation d'une instruction (3 à 5) | 10 |
  | `report_summary` | Commenter un rapport : l'essentiel, à surveiller, des pistes (les chiffres viennent du code) | 10 |
  | `report_question` | Répondre à une question sur un rapport | 5 |

  La taille d'une génération ou d'un import (`generationTier`, `src/lib/ai/generate.ts`) se décide sur
  la durée des vidéos et des notes vocales, le nombre de photos et de pages ; au-delà de la plus grande
  taille, l'app demande de séparer l'instruction.
- L'app ne déclare jamais une quantité consommée : le serveur compte et débite. Drapeau allumé, un
  appel à l'assistant d'IA passe par `POST /api/v2/ai/ask` avec `operation` et une
  `idempotency_key` (`aiApi` de `src/lib/gateway/ai.ts`), jamais par `/api/v4/assistant/ask` ; drapeau
  éteint, l'appel d'avant ne change pas.
- Les routes de facturation passent par la passerelle Octopus, avec le jeton de l'utilisateur et
  `X-Product: clip-v3` (`src/lib/billing/client.ts`) : `GET /api/v2/billing/context` (plan, état,
  crédits restants), `POST /api/v2/billing/check` (droit à une feature), `POST /api/v2/ai/ask` (une
  opération d'IA débitée par la plateforme), `GET /api/v2/billing/plans` (page des plans),
  `POST /api/v2/billing/checkout` (paiement Stripe, réservé à l'administrateur de l'organisation) et
  `POST /api/v2/billing/portal` (gérer son abonnement).
- Le droit d'utiliser une feature se vérifie côté serveur, au moment de rendre le service. Une
  feature absente vaut « non ». Les limites `reported` ne sont pas reçues par la plateforme : l'app
  compte et compare au plafond lu dans l'état (`limitOf`), et le verrou de l'écran n'est alors pas une
  protection. Un état illisible ferme la fonction (`useEntitlement` rend `locked`, `useLimit` une
  limite atteinte) et `useGate` relit l'état avant de servir une fonction encore « pending » ;
  drapeau éteint, rien n'est verrouillé.
- Un refus de facturation se montre tel quel par la fenêtre `Paywall`
  (`src/components/billing/Billing.tsx`, alimentée par `src/lib/billing/bus.ts`) et par la page
  `/reglages/abonnement` : 402 faute de crédits, 403 faute de droit. Il ne se transforme jamais en
  erreur 500 et ne déclenche aucun autre appel ; rien n'est débité.
- Une nouvelle opération qui appelle un modèle, transcrit, ou traite une vidéo se propose à la
  facturation dès son écriture (skill `billing`). Restent ouverts sans débit, leur coût compté dans
  les opérations qui les déclenchent : la génération d'image (`ai:generate_image`, dans
  `illustrate` et `translate_image`), la transcription des notes (`files:transcribe`) et le traitement des vidéos
  (`files:process*`, dans les générations) et le montage de la vidéo des étapes
  (`files/videos/compose`, un par publication où un extrait a changé). Restent aussi ouverts, sans débit à la minute, la
  lecture à voix haute et l'assistant vocal, tous deux par la voix en direct (`ai:live`). La lecture
  (`LiveSpeaker`, `src/lib/liveSpeech.ts`) est ouverte à tous, liens publics compris. L'assistant
  est réservé au plan Usine par la feature `voice_assistant`, et sur un lien public au poste qui l'a
  demandé (`assistant:ask`).
- Les libellés des features (clé → texte, en français et en anglais) vivent dans `FEATURE_LABELS` de
  `src/lib/billing/catalog.ts` ; `tests/billing-manifest.test.ts` échoue si une feature ou une
  opération du manifeste n'y est pas, ou si un prix diffère.
- Le branchement, app web : le drapeau public `NEXT_PUBLIC_BILLING_V2` (éteint par défaut) ; la page
  `/reglages/abonnement` (introuvable sans le drapeau ni l'aperçu ; ouverte par « Abonnement et crédits » du
  menu et par la pastille de crédits), avec le paiement et le portail Stripe ; la fenêtre des
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
  module que l'usage appelle : 10 formations ou 30 relevés en 30 jours). Une nouvelle au plus par
  semaine ; « Plus tard » la range 30 jours, et deux semaines sans réponse aussi. La mémoire est
  par personne et par appareil (`advisorStore.ts`) ; chaque offre montrée, ouverte, rangée ou
  demandée se note dans `clip_event` (`type: 'offer'`). Qui ne peut pas acheter « Demande à
  l'administrateur » (`clip_request`, une par personne et par fonction sur 30 jours) : la demande
  paraît dans « À voir » des administrateurs jusqu'à ce que l'usine ait la fonction, et part par
  courriel ou sur le téléphone si l'usine avertit (`/api/notify`, `request`).
- **Dans l'app mobile, on vend dans le magasin** (posture `in_app_purchase`, décidée pour garder la
  vision : le champion s'abonne seul dans l'App Store). Solo, Équipe et Usine se vendent sur iOS et
  Android par RevenueCat (projet `clip-v3`), jamais par Stripe.
  - La coquille annonce les capacités `store.connect`, `store.offers`, `store.purchase` et
    `store.restore` seulement à trois conditions : une clé publique RevenueCat
    (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `…_ANDROID_KEY`), hors d'Expo Go, et le toggle
    `storePurchases` allumé.
  - La page achète par le pont, puis fait relire l'achat par `mobileSync`
    (`src/lib/billing/store.ts`, `src/components/billing/Store.tsx`).
  - L'achat n'est offert que si `store_purchase.allowed` (une organisation d'une seule personne).
    Sinon, une phrase, sans lien ni prix d'ailleurs.
  - Avant l'achat : le prix du magasin, les mentions, la politique de confidentialité
    d'Intelligence Industrielle et, sur iPhone, les conditions standard d'Apple. Ensuite :
    « Restaurer mes achats » et la gestion dans le magasin.
  - Le module natif part dans une build EAS, jamais dans une mise à jour à distance seule.
- Le drapeau reste éteint partout tant que le catalogue n'est pas publié ; on l'allume en QA quand
  `GET /api/v2/billing/context` y répond pour `clip-v3`.
