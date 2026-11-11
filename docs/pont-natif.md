# Pont natif de CLIP V3

La coquille Expo (`apps/mobile`) affiche l'app web dans une WebView et n'ajoute que ce que le
navigateur fait mal. Le contrat des messages est dans `packages/bridge/src/index.ts` ; l'architecture
d'ensemble, dans `docs/architecture.md`.

## Capacités

La coquille annonce ses capacités dans `window.__CLIP_NATIVE__.capabilities` (injecté avant le
chargement de la page). La page n'appelle que ce qui est annoncé ; sinon, elle prend le chemin web.

| Capacité | Ce qu'elle fait | Module natif |
|---|---|---|
| `camera.photo` | Écran plein, plusieurs photos d'affilée, bande de vignettes, « Terminé (n) » | expo-camera, expo-image-manipulator |
| `camera.video` | Vidéo 720p à débit imposé, minuterie, durée max, lampe | expo-camera, expo-video-thumbnails |
| `audio.record` | Note vocale, minuterie et niveau du micro | expo-audio |
| `media.pick` | Photos et vidéos de la galerie, plusieurs à la fois | expo-image-picker |
| `file.pick` | PDF et Word | expo-document-picker |
| `upload.put` | PUT binaire sur une URL présignée, avec progression | expo-file-system |
| `upload.multipart` | POST multipart avec les en-têtes de la page (ex. transcription) | expo-file-system |
| `media.discard` | Libère les fichiers envoyés | expo-file-system |
| `scan` | Codes QR et codes-barres (code128, code39, EAN, UPC, DataMatrix) | expo-camera |
| `haptics`, `keepAwake` | Vibration, écran allumé pendant la lecture | expo-haptics, expo-keep-awake |
| `share`, `print`, `openExternal` | Feuille de partage, impression (PDF), navigateur du système | expo-sharing, expo-print, expo-web-browser |
| `context.set` | Organisation et utilisateur connectés, pour les journaux | — |
| `ui.language` | La langue de l'outil, dite par la page au chargement et à chaque changement : les écrans natifs (caméra, note vocale, scan, mise à jour, hors ligne) la suivent et la gardent pour le prochain démarrage ; sans elle, la langue de l'appareil. Une langue que la coquille ne parle pas encore prend l'anglais | — |
| `store.connect`, `store.offers`, `store.purchase`, `store.restore` | Achat d'un abonnement dans l'App Store ou Google Play : l'organisation comme acheteur, les prix du magasin, l'achat, « Restaurer mes achats ». Annoncée seulement avec une clé RevenueCat, hors Expo Go, toggle `storePurchases` allumé | react-native-purchases |

Un achat ou une restauration qui n'aboutit pas répond normalement, avec sa raison
(`failure` : `not_ready`, `product_missing`, `other_account`, `network`, `not_allowed`, `store`) ;
l'abandon (`cancelled`) n'est pas une erreur. Chaque autre erreur revient avec un code du contrat :
`cancelled` (la personne a fermé l'écran),
`permission_denied`, `unsupported` (type inconnu ou capacité non annoncée en ce moment),
`too_large` (fichier choisi de plus de 1 Go), `network` (envoi qui n'aboutit pas après une
nouvelle tentative), `failed` (requête invalide ou échec d'un module).

## Préréglages de poids (`CAPTURE_PRESETS`)

| Média | Réglage | Poids typique |
|---|---|---|
| Photo | côté long ramené à 1920 px, JPEG ~0,72 | 300 à 600 Ko |
| Vidéo filmée | 720p, ~2,5 Mb/s (iOS : codec H.264 imposé, sans quoi le débit est ignoré) | ≈ 19 Mo la minute (contre ~400 Mo en 4K/60) |
| Note vocale | AAC mono 44,1 kHz, 64 kb/s, `.m4a` | ≈ 0,5 Mo la minute |
| Vidéo de la galerie | iOS : réencodée en H.264 720p à l'export ; Android : telle quelle | selon la source |

À savoir pour la page : une vidéo filmée sur iOS est un `.mov` (H.264, `video/quicktime`), sur
Android un `.mp4`. Une vidéo de galerie Android peut être lourde : la page la réduit par la Gateway
(`/api/v1/files/video/process`, 720p) si besoin.

## Cycle d'une capture

1. La page appelle `camera.video` ; la coquille ouvre son écran natif, puis rend
   `{ items: [CapturedMedia] }` (identifiant local, type, poids, durée, vignette en data URL).
2. Le fichier est rangé dans `Documents/clip-media/` (pas le cache, que le système peut vider) et
   inscrit à l'index local.
3. La page demande une URL présignée à la Gateway et appelle `upload.put` ; la coquille envoie le
   fichier, émet `upload.progress`, réessaie une fois sur coupure réseau, et marque le média envoyé.
4. La page enregistre la source dans l'instruction, puis appelle `media.discard`.

Au démarrage, la coquille retire ce qui a plus de 48 h **et** a déjà été envoyé, et les fichiers
orphelins de plus de 48 h. Un média inscrit mais jamais envoyé est gardé : il peut être la seule
copie d'une capture.

## Pilotage par le serveur

Au démarrage (attente de 2,5 s au plus) et au retour au premier plan (au plus toutes les 30 s), la
coquille lit `GET {web}/api/config` avec l'en-tête `X-App-Version` :

- **mise à jour forcée** : si `forceUpdate[ios|android].versions` (contrainte semver, ex. `<1.2.0`)
  vise la version installée, un écran bloquant propose « Mettre à jour » vers `storeUrl` ;
- **feature toggle `nativeCapture`** : à `false`, les capacités de capture ne sont plus annoncées (la
  page passe à la capture du navigateur ; les envois en cours peuvent finir) ;
- **feature toggle `storePurchases`** : l'achat dans le magasin n'est annoncé que s'il est à `true` ;
- **serveur injoignable** : rien ne bloque, et la capture native reste annoncée (le comportement de
  base de la coquille) ; l'achat dans le magasin, lui, ne l'est pas (une fonction nouvelle).

## Sécurité

- Le pont n'écoute que les messages de l'origine de l'app web ; une navigation de la page entière
  vers un autre site s'ouvre dans le navigateur du système.
- Les envois ne partent que vers des adresses `https`. L'ouverture externe n'accepte que `https:`,
  `http:`, `mailto:` et `tel:`.
- Un cadre intégré (iframe) d'une autre origine partage la page : n'en intégrez pas qui ne soient
  pas de confiance.

## Stockage local et journaux

- `clip.shell.state` (AsyncStorage), versionné par `schemaVersion` avec migrations au démarrage, sans
  réseau : un état illisible est mis de côté sous une autre clé, jamais effacé ; un état écrit par une
  version plus récente garde ses champs inconnus.
- `logEvent` / `logError` (`src/logging/log.ts`) ajoutent toujours la version de la coquille,
  l'organisation connectée (`context.set`) et le contexte. Ils écrivent dans la console : brancher un
  outil d'observabilité ne touchera que ce fichier.

## Tester

```bash
cd apps/mobile
```

```bash
npm install
```

```bash
cp .env.example .env
```

Renseignez `EXPO_PUBLIC_CLIP_WEB_URL` (l'app web déployée, ou l'adresse IP de votre poste en
développement, pas `localhost`), puis :

```bash
npx expo start
```

- **Expo Go suffit pour tout le pont** : WebView, caméra, vidéo, micro, galerie, documents, scan,
  envoi, impression, partage. Dans Expo Go, l'app porte le nom, l'icône, l'écran de démarrage et les
  textes de permission d'Expo Go, et la version lue est celle d'`app.json`.
- **Une build de développement ou de distribution** (EAS) est nécessaire pour l'identité de l'app
  (nom « CLIP », icône, écran de démarrage, textes de permission en français, identifiant
  `com.intelligenceindustrielle.clip`), et le sera pour les achats des magasins.
- **Assistant vocal de la page** : le micro dans une WebView exige un contexte sécurisé ; une page
  servie en `http://` sur l'adresse IP du poste ne l'obtiendra pas. Utilisez l'adresse `https` de
  l'app web.

Vérifications automatiques : `npm test` (routage du pont, mise à jour forcée, toggles, migrations,
configuration, navigation) et `npm run typecheck`.

## Variables

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_CLIP_WEB_URL` | Adresse de l'app web, figée dans la build. Sans elle, la coquille affiche un écran de configuration. |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Clés **publiques** de RevenueCat (projet `clip-v3`), variables d'EAS figées dans la build. Sans elles, aucun achat dans l'app. |

## Ce qui reste à faire

- **Achats des magasins** : le code est en place (capacités `store.*`). Restent la mise en route des
  magasins et de RevenueCat (skill `mobile`), puis `billing-publish`. Les achats ne s'essaient que
  sur une build de développement, TestFlight ou le test interne (jamais Expo Go).
- **Liens universels** : ouvrir directement dans l'app les liens `https://…/p/…` des postes.
- **Confirmer** l'identifiant `com.intelligenceindustrielle.clip` avant la création des fiches dans les
  magasins (skill `mobile`).
