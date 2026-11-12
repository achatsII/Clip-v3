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
- **Feature toggles** : `GET /api/config` (`CLIP_TOGGLES`) ; une fonction nouvelle ou risquée y passe,
  et le repli n'active jamais une fonction nouvelle.
- **Interface** : français du Québec et anglais, par les dictionnaires typés de `src/lib/i18n`
  (`useMessages()` dans un composant, `messages()` ailleurs ; aucun texte écrit dans un écran, aucun
  `'fr-CA'` en dur ; règles dans `docs/architecture.md` §7). Design system « verre » de
  `src/app/globals.css` (tokens, `glass-*`), une seule action principale par écran, trois états pour
  toute donnée asynchrone, cibles d'au moins 44 px, mode sombre.

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
- Ce qui se facture : `ai_credits`, une banque de crédits d'IA par mois · `published_instructions`,
  `stations` et `editors`, des limites par plan (comptées par l'app, `capacity_source: reported`) ·
  `translations`, `adoption_stats`, `approvals`, `bulk_import`, `voice_assistant`, `brand_kit`,
  `full_export`, oui ou non selon le plan. Les opérateurs et les lecteurs ne se comptent jamais.
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
  (`files:process*`, dans les générations). Restent aussi ouverts, sans débit à la minute, la
  lecture à voix haute et l'assistant vocal, tous deux par la voix en direct (`ai:live`). La lecture
  (`LiveSpeaker`, `src/lib/liveSpeech.ts`) est ouverte à tous, liens publics compris. L'assistant
  est réservé au plan Usine par la feature `voice_assistant`, et sur un lien public au poste qui l'a
  demandé (`assistant:ask`).
- Les libellés des features (clé → texte, en français et en anglais) vivent dans `FEATURE_LABELS` de
  `src/lib/billing/catalog.ts` ; `tests/billing-manifest.test.ts` échoue si une feature ou une
  opération du manifeste n'y est pas, ou si un prix diffère.
- Le branchement, app web : le drapeau public `NEXT_PUBLIC_BILLING_V2` (éteint par défaut) ; la page
  `/reglages/abonnement` (introuvable drapeau éteint ; ouverte par « Abonnement et crédits » du menu
  Mon compte et par la pastille de crédits), avec le paiement et le portail Stripe ; la fenêtre des
  refus `Paywall`, qui ne conseille jamais le plan actuel, seulement le moins cher des plans qui
  donnent vraiment plus (`src/lib/billing/advice.ts`). Pas de route serveur : le navigateur appelle
  la passerelle avec le jeton de l'utilisateur.
- Les leviers de vente, drapeau allumé. Une limite comptée par l'app (postes, rédacteurs, instructions
  publiées) a sa jauge `UsageMeter` (`src/components/billing/Usage.tsx`). La jauge s'allume à 80 %
  (`NEAR_RATIO`, `src/lib/billing/usage.ts`) et nomme le plan qui en donne plus. La fenêtre d'une
  limite dit ce que le plan permet et, si l'écran le sait (`PaywallRequest.used`), où l'on en est.
  Inviter un rédacteur au-delà de la limite propose d'abord la voie gratuite (lecteur) ; le deuxième
  rédacteur mène à Équipe. Le dossier pour la direction (`/statistiques/dossier`) reprend les
  chiffres de la page Statistiques (`src/lib/stats/adoption.ts`) et propose, au choix, un plan avec
  son prix, jamais dans la coquille. Il passe par le feature toggle `valueReport` et la feature
  `adoption_stats`.
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
