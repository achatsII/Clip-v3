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
- **Feature toggles** : `GET /api/config` (`CLIP_TOGGLES`) ; une fonction nouvelle ou risquée y passe,
  et le repli n'active jamais une fonction nouvelle.
- **Interface** : français du Québec ; design system « verre » de `src/app/globals.css` (tokens,
  `glass-*`), une seule action principale par écran, trois états pour toute donnée asynchrone,
  cibles d'au moins 44 px, mode sombre.

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
  | `step_assist` | Retoucher une étape (raccourcir, clarifier, ajouter un point clé…) | 5 |
  | `instruction_edit` | Modifier toute l'instruction sur demande | 40 |
  | `translate` | Traduire une instruction | 30 |
  | `annotate` | Placer des flèches et des cercles sur une photo | 5 |
  | `illustrate` | Illustration générée à partir d'une photo (l'image comprise) | 70 |
  | `ask_question` | Répondre à une question d'opérateur sur l'instruction | 2 |
  | `standard_agent` | Rédiger le standard de rédaction à partir d'une description | 5 |
  | `edit_agent` | Un échange avec l'assistant d'édition (il rend les modifications à faire) | 20 |
  | `visual` | Schéma généré : une page HTML autonome (SVG, dessin, vue 3D) | 60 |

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
  `illustrate`), la transcription des notes (`files:transcribe`) et le traitement des vidéos
  (`files:process*`, dans les générations), la lecture à voix haute (`ai:tts`) et l'assistant vocal
  temps réel (`ai:live`, réservé au plan Usine par la feature `voice_assistant`, mais sans débit à la
  minute).
- Les libellés des features (clé → texte, en français et en anglais) vivent dans `FEATURE_LABELS` de
  `src/lib/billing/catalog.ts` ; `tests/billing-manifest.test.ts` échoue si une feature ou une
  opération du manifeste n'y est pas, ou si un prix diffère.
- Le branchement, app web : le drapeau public `NEXT_PUBLIC_BILLING_V2` (éteint par défaut) ; la page
  `/reglages/abonnement` (introuvable drapeau éteint ; ouverte par « Abonnement et crédits » du menu
  Mon compte et par la pastille de crédits), avec le paiement et le portail Stripe ; la fenêtre des
  refus `Paywall`, qui ne conseille jamais le plan actuel, seulement le moins cher des plans qui
  donnent vraiment plus (`src/lib/billing/advice.ts`). Pas de route serveur : le navigateur appelle
  la passerelle avec le jeton de l'utilisateur.
- La coquille mobile n'offre aucun achat : dans la coquille, le paywall ne montre ni prix ni lien de
  paiement. Avant de soumettre aux magasins, décider de la posture (vente dans le magasin par
  RevenueCat, ou app « miroir » permise seulement aux comptes d'entreprise sous contrat) ; le
  manifeste ne vend aujourd'hui que sur `web`.
- Le drapeau reste éteint partout tant que le catalogue n'est pas publié ; on l'allume en QA quand
  `GET /api/v2/billing/context` y répond pour `clip-v3`.
