# CLIP V3

Des instructions de travail claires et visuelles, faites en quelques minutes : on filme le geste,
on parle, on ajoute des photos ou un vieux PDF, et l'IA rédige une instruction étape par étape
(procédure, changement de format, fiche de cadenassage). L'opérateur la trouve au poste par un code
QR ou une tablette, sans compte, la suit en grandes images et en extraits vidéo, la lit dans sa
langue et signale ce qui cloche.

- La vision, les personas et ce qu'il faut protéger : [`VISION.md`](VISION.md)
- L'architecture, les données et le pipeline de génération : [`docs/architecture.md`](docs/architecture.md)
- Le pont entre l'app web et la coquille mobile : [`docs/pont-natif.md`](docs/pont-natif.md)
- L'offre (plans, crédits, opérations d'IA) : [`billing.manifest.yaml`](billing.manifest.yaml)
- L'espace Découvrir des prospects (vidéos, conseiller, accès par Sandboxes) : [`docs/DECOUVRIR.md`](docs/DECOUVRIR.md)

## Le dépôt

| Dossier | Ce que c'est |
|---|---|
| `apps/web` | **Toute l'interface** : Next.js 16 (App Router), React 19, Tailwind 4. Bureau, tablette de poste, téléphone, écran TV. Parle directement à la Gateway Octopus. |
| `apps/mobile` | La **coquille** Expo (SDK 58) : affiche l'app web et lui prête la caméra, le micro, le scan, l'envoi des gros fichiers et l'impression, à poids contrôlé. Hors des workspaces npm. |
| `packages/bridge` | Le contrat du pont (`@clip/bridge`), partagé par les deux ; la coquille en garde une copie synchronisée (`npm run sync-bridge` dans `apps/mobile`). |

## Démarrer l'app web

Node 20.9 ou plus.

```bash
npm install
```

```bash
cp apps/web/.env.example apps/web/.env.local
```

```bash
npm run dev
```

L'app s'ouvre sur http://localhost:3000. On s'y connecte avec un compte de la Gateway Octopus (QA par
défaut). Au premier passage, `/bienvenue` pose trois questions et prépare l'usine.

Vérifier avant de livrer :

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

### Variables d'environnement (`apps/web`)

| Variable | Rôle | Par défaut |
|---|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | Adresse de la Gateway Octopus | la QA |
| `NEXT_PUBLIC_APP_IDENTIFIER` | Identifiant de connexion à la Gateway | `html` |
| `NEXT_PUBLIC_SELF_SERVICE` | Inscription en libre-service sur `/connexion` | `false` |
| `NEXT_PUBLIC_BILLING_V2` | Facturation v2 : plans, crédits, paywall | `false` |
| `CLIP_TOGGLES` | Feature toggles servis par `GET /api/config` (JSON) | valeurs par défaut du code |
| `CLIP_FORCE_UPDATE_IOS`, `CLIP_FORCE_UPDATE_ANDROID` | Versions de la coquille à bloquer (contrainte semver, ex. `<1.2.0`) | personne |
| `CLIP_STORE_URL_IOS`, `CLIP_STORE_URL_ANDROID` | Lien « Mettre à jour » de l'écran bloquant | la page du magasin |
| `ABLY_KEY` | Réservée au temps réel entre appareils (pas encore utilisée) | — |

Les variables `NEXT_PUBLIC_*` sont figées dans le code livré au navigateur : rien de secret dedans.

### Déployer

En ligne : **https://clip-v3.vercel.app** (projet Vercel `clip-v3`, dossier racine `apps/web`).
Chaque poussée sur la branche de production du dépôt redéploie l'app. L'app n'a que deux routes
serveur (`/api/config`, `/api/share`) et aucun secret de la Gateway ; sans variable, elle parle à la
Gateway de QA, facturation éteinte. Seule l'adresse `clip-v3.vercel.app` est publique : les autres
adresses de Vercel (alias d'équipe, déploiements) demandent une connexion à Vercel.

## Démarrer la coquille mobile

```bash
cd apps/mobile && npm install
```

```bash
cd apps/mobile && EXPO_PUBLIC_CLIP_WEB_URL=http://192.168.1.20:3000 npx expo start
```

Remplacez l'adresse par celle du poste qui fait tourner l'app web (pas `localhost` : le téléphone ne
le verrait pas). Sans `EXPO_PUBLIC_CLIP_WEB_URL`, la coquille affiche la production
(https://clip-v3.vercel.app). Les tests de la coquille : `cd apps/mobile && npm test`.

## L'espace Découvrir

`/decouvrir` montre Clip aux prospects : les vidéos du produit (seul le film de 75 secondes est tourné, les autres
sont « Bientôt ») et un conseiller IA qui répond d'après une base de connaissance vérifiée. Il est public par défaut.
Avec `DECOUVRIR_ACCES=sandboxes`, il n'ouvre qu'aux personnes à qui Intelligence Industrielle l'a ouvert dans
Sandboxes, et tout ce qu'elles y font part à Sandboxes ; rien ne s'écrit dans les données de Clip. Ses variables,
toutes côté serveur :

| Variable | Rôle | Par défaut |
|---|---|---|
| `DECOUVRIR_ACCES` | `sandboxes` : l'accès passe par Sandboxes (lue au build : redéployer après un changement) | `ouvert` |
| `SANDBOXES_URL`, `SANDBOXES_CLE` | L'API de Sandboxes et la clé de Clip (Sandboxes › Produits) | — (prospects refusés) |
| `SANDBOXES_APP` | L'application des prospects à la Gateway | `sandboxes` |
| `DECOUVRIR_GATEWAY_URL` | La Gateway des comptes des prospects (la production) | `NEXT_PUBLIC_GATEWAY_URL` |
| `SESSION_SECRET` | Scelle le cookie de l'espace (32 caractères ou plus) | — |

Comment ça marche, les gestes pour brancher Clip à Sandboxes et comment ajouter une vidéo :
[`docs/DECOUVRIR.md`](docs/DECOUVRIR.md).

## Ce qui reste à faire avant la production

- **Enregistrer l'application `clip-v3` à la Gateway**, puis changer `NEXT_PUBLIC_APP_IDENTIFIER` :
  aujourd'hui l'app se connecte avec l'application partagée `html` et cloisonne ses données par le
  champ `json_data.app_identifier`. Les données écrites sous `html` n'y suivront pas : basculer avant
  d'avoir de vraies données, ou les recopier.
- **Publier le catalogue de facturation** (skill `billing-publish`) une fois l'application
  enregistrée, puis allumer `NEXT_PUBLIC_BILLING_V2` là où les routes `/api/v2/billing` répondent.
- **Coquille mobile** : confirmer l'identifiant de bundle (`com.intelligenceindustrielle.clip`),
  décider de l'achat dans les magasins avant la soumission (voir `CLAUDE.md`, « Facturation »), faire
  les builds.
- Écran TV synchronisé et réception des vidéos de caméras par API : prévus, pas bâtis.
