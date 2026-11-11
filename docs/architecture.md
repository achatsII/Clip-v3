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
| `GET /api/realtime/token` | **prévue, pas encore bâtie** : jeton Ably de courte durée pour l'écran TV synchronisé (avec `ABLY_KEY`) |

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

Régénérer un lien invalide l'ancien dans l'app (la page vérifie que l'uuid est bien le lien courant
du poste). La Gateway n'a pas de route de révocation : un jeton déjà émis reste valable jusqu'à son
expiration, ce que l'écran d'administration dit clairement.

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
3. **Post-traitement** : validation des références et des temps, identifiants stables, vignettes des
   extraits vidéo (`/files/gifs/generate`, captures), rapprochement du poste deviné avec les postes
   existants.

**Extrait vidéo plutôt que GIF** : un extrait joué en boucle depuis la vidéo source (début/fin) est
10 à 20 fois plus léger qu'un GIF, garde la qualité et le son, et se règle à la seconde dans
l'éditeur. Les captures servent de vignettes et d'images pour le PDF.

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
