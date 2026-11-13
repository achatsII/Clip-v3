# L'espace Découvrir

`/decouvrir` : l'espace où un prospect découvre Clip à son rythme, avec les vidéos du produit et un conseiller
IA. Il est public par défaut. Derrière un interrupteur, il n'ouvre qu'aux personnes à qui Intelligence
Industrielle l'a ouvert, et tout ce qu'elles y font part à Sandboxes, l'application centrale d'II (le contrat :
`docs/INTEGRATION.md` du dépôt `sandboxes`). La référence suivie est l'espace d'Ordonnancement.

L'espace ne touche ni l'app, ni ses données, ni la connexion de Clip : sa session n'ouvre que lui. Rien d'un
prospect ne s'écrit dans les données de Clip.

## Ce qu'il y a dedans

| Page | Ce qu'on y fait |
|---|---|
| `/decouvrir` | Les vidéos, en trois niveaux (commencer ici, les fonctions une à une, aller plus loin). Une vidéo tournée se lit avec ses chapitres, ses sous-titres (offerts, éteints au départ) et sa transcription (repliée). Les autres sont « Bientôt », sans lien. La progression reste dans le navigateur ; une vidéo vue à 92 % compte comme vue. |
| `/decouvrir/conseiller` | Le conseiller IA (plus bas). |
| `/decouvrir/entrer` | L'écran d'entrée, interrupteur allumé : courriel, mot de passe, et l'annonce du suivi. |
| `/decouvrir/v/<id>` | Un lien court vers une vidéo (`/decouvrir?v=<id>`). |

Clip n'a pas de démo publique : l'espace n'a ni « Essayer la démo », ni suivi de démo. Jamais de prix, de nom de
client réel ou d'outil interne dans l'espace.

Le code : les pages dans `apps/web/src/app/decouvrir`, les routes dans `apps/web/src/app/api/decouvrir`,
l'intercepteur dans `apps/web/src/proxy.ts`, les écrans dans `apps/web/src/components/decouvrir`, la logique dans
`apps/web/src/lib/decouvrir` (`server/` : serveur seulement), les textes dans le dictionnaire `decouvrir`
(`src/lib/i18n/fr` et `en`), les fichiers des vidéos dans `apps/web/public/decouvrir/videos`.

## L'interrupteur et les variables

| Variable (serveur seulement) | Rôle |
|---|---|
| `DECOUVRIR_ACCES` | Absente ou `ouvert` : l'espace est public. `sandboxes` : il demande une connexion et le suivi part à Sandboxes. Lue au build (les pages sont statiques) et à l'exécution (l'intercepteur, les routes) : la changer, c'est redéployer. |
| `SANDBOXES_URL` | L'API de Sandboxes (QA : `https://sandboxes-gamma.vercel.app`). |
| `SANDBOXES_CLE` | La clé de Clip (`sbxk_clip-v3_…`, générée dans Sandboxes › Produits). Jamais dans le code. |
| `SANDBOXES_APP` | L'application des prospects à la passerelle (`sandboxes` par défaut). |
| `DECOUVRIR_GATEWAY_URL` | La passerelle où vivent les comptes des prospects : `https://gateway.intelligenceindustrielle.com` en production. Absente : celle de `NEXT_PUBLIC_GATEWAY_URL`. Elle doit être celle de Sandboxes. |
| `SESSION_SECRET` | 32 caractères aléatoires ou plus (`openssl rand -base64 36`). Scelle le cookie de l'espace ; sa clé est tirée à part (`sha256("clip_decouvrir|" + secret)`) et ne sert à rien d'autre. |

Aucune n'est en `NEXT_PUBLIC_*`. Sans `SANDBOXES_URL` ou `SANDBOXES_CLE`, les prospects sont refusés avec « pas
encore ouvert » (le journal du serveur dit pourquoi). Sans `SESSION_SECRET`, l'entrée répond « La connexion ne
répond pas pour le moment » (même chose au journal).

**Interrupteur éteint** : tout est public, comme une page du site. `/decouvrir/entrer` renvoie à `/decouvrir`,
`/api/decouvrir/*` répond 404, rien ne part à Sandboxes. Le conseiller répond en démonstration, à partir de la même
base de connaissance (`advisorDemo.ts`), sans IA, sans pièce jointe, et rien n'est enregistré.

**Interrupteur allumé** :

- **L'intercepteur** (`src/proxy.ts`, seulement `/decouvrir`, ses pages et `/api/decouvrir/*`) : sans session
  valide, l'écran d'entrée, avec la page demandée (`suite`), le courriel prérempli (`?courriel=`, le lien « Ouvrir
  l'espace » du portail de Sandboxes) et, si l'accès a pris fin, son message. Les fichiers des vidéos restent
  publics.
- **La connexion** (`POST /api/decouvrir/entrer`, `src/lib/decouvrir/server/access.ts`) : Clip se connecte encore
  par l'application partagée `html`, qui ne dit pas « client de Clip » : l'étape client est sautée. Elle s'allume
  d'elle-même le jour où `NEXT_PUBLIC_APP_IDENTIFIER=clip-v3` (la passerelle, puis une lecture de `clip_org` qui
  confirme la cliente, et `POST /acces` avec `via: "produit"`). Aujourd'hui : `POST /auth/token?app_identifier=sandboxes`
  à la passerelle de Découvrir, puis `POST /api/v1/acces` (`via: "sandboxes"`) : un prospect entre jusqu'à `fin`,
  l'équipe d'II sans fin. Un client de Clip qui veut voir l'espace reçoit un accès dans Sandboxes, comme un prospect.
- **Les messages**, mot pour mot ceux du contrat : `identifiants` « Courriel ou mot de passe incorrect. » ·
  `aucun_acces` « Votre accès à cet espace n'est pas encore ouvert. Votre contact chez Intelligence Industrielle peut
  l'ouvrir. » · `expire` « Votre accès a pris fin le 12 décembre. Votre contact chez Intelligence Industrielle peut le
  prolonger. » (le dernier jour, heure de Toronto). Une panne (passerelle ou Sandboxes injoignable, clé refusée) n'est
  jamais un mauvais mot de passe : « La connexion ne répond pas pour le moment. Réessayez dans un instant. »
- **La session** : le cookie `clip_decouvrir` (HttpOnly, Secure, SameSite=Lax, AES-256-GCM, 30 jours au plus) garde
  les jetons, qui ne vont jamais au navigateur. Chaque route la revérifie au plus tard toutes les 15 minutes
  (`withDecouvrir`, `src/lib/decouvrir/server/route.ts`) : un accès révoqué ou échu la ferme, et la personne revient à
  l'écran d'entrée avec le message. Sandboxes injoignable pendant une revérification : la session tient et réessaie
  une minute plus tard (pendant une panne, un accès révoqué reste donc ouvert quelques minutes de plus).
- **Le relais de l'IA** (`/api/decouvrir/gw/*`) : seulement `POST /api/v4/assistant/ask` et
  `POST /api/v1/files/upload/direct`, avec les jetons de la session (renouvelés avant leur fin, et une fois sur 401).
- **Le suivi** (`src/lib/decouvrir/tracker.ts` → `POST /api/decouvrir/suivi` → `POST /api/v1/suivi`) : les pages, la
  vidéo (toutes les 15 s de lecture, à la pause, `video_fin` à 92 %), le parcours (« <niveau> : terminé », « Parcours
  complet »), le conseiller (`ouvre`, `question`, `fichier`) et la sortie (durée de la visite). Des lots de 100
  événements et 64 Ko au plus ; la personne vient de la session, jamais du navigateur. Un lot refusé attend dans
  l'onglet (`sessionStorage`) et s'abandonne au troisième échec : le suivi ne bloque jamais personne.
- **Le conseiller** envoie la conversation entière à chaque échange (`PUT /api/v1/conversations/:id`, 256 Ko au plus,
  les plus vieux messages tombent d'abord) et chaque besoin reformulé (`POST /api/v1/besoins`, « Ajouté à nos
  propositions d'ajout »). La conversation elle-même reste dans l'onglet.

## Le conseiller

- Il répond d'après la base de connaissance de `src/lib/decouvrir/knowledge.ts`, tirée de `VISION.md`, de la doc et
  du code. **Chaque phrase y est vérifiée** : une fonction qui change dans Clip (ajoutée, retirée, renommée) se
  reporte là, avec ses limites. Elle ne nomme ni prix, ni client, ni outil interne ; « Ce qui n'existe pas encore »
  et « Ce qu'on prévoit ensuite » disent ce qu'il ne doit pas promettre.
- Il recommande la vidéo et le chapitre (seulement des vidéos tournées), pose une question de découverte à la fois, ne
  dit jamais seulement « non » (« Pas encore dans Clip aujourd'hui. », ce qui s'en approche, ce qui est prévu sans
  date, l'invitation, deux ou trois questions), puis reformule le besoin dans un bloc `besoin` que l'écran retire du
  message et envoie à Sandboxes.
- Sa consigne et l'appel sont dans `src/lib/decouvrir/advisor.ts` (sortie structurée, la réponse et ce qu'il retient).
  Un document joint (4 Mo au plus, interrupteur allumé seulement) : un PDF ou une image part au stockage de la
  passerelle, puis à l'assistant ; un CSV ou un texte est lu dans la page et joint à la question.

## Brancher Clip à Sandboxes (les gestes humains)

1. **Sandboxes › Produits › Inscrire** : l'identifiant `clip-v3` (celui que Clip aura à la passerelle), le nom
   « Clip », l'adresse de l'espace `https://clip-v3.vercel.app/decouvrir`.
2. **Générer une clé** (elle ne se montre qu'une fois). Dans le projet Vercel `clip-v3` (Production, et Preview pour
   la QA) : `SANDBOXES_URL`, `SANDBOXES_CLE`, `SESSION_SECRET`, et `DECOUVRIR_GATEWAY_URL` (la passerelle de
   Sandboxes ; en production `https://gateway.intelligenceindustrielle.com`, alors que Clip lui-même peut rester en
   QA). Redéployer.
3. Vérifier `GET ${SANDBOXES_URL}/api/v1/sante`, puis attendre que Sandboxes › Produits montre Clip **« Relié »**
   (un appel signé reçu dans les dernières 24 h).
4. Poser `DECOUVRIR_ACCES=sandboxes`, puis **redéployer** (les pages lisent l'interrupteur au build).
5. Pour chaque entreprise prospect, dans admin-gateway (sur la passerelle de Sandboxes) ou par Sandboxes ›
   Entreprises › Nouvelle : l'organisation, la première personne (rôle admin), un accès `sandboxes` avec les scopes
   `assistant:ask` et `files:write_upload_direct` (le conseiller répond et lit des documents). Puis, dans Sandboxes ›
   l'entreprise : ouvrir Clip pour la durée voulue, et envoyer le lien de l'espace, le courriel et le mot de passe.
6. Vérifier le branchement (contrat, § 5) : un compte sans accès voit « pas encore ouvert » ; avec un accès, il entre ;
   après sa fin, il est refusé ; une vidéo vue à moitié paraît dans Sandboxes à 50 % ; une question sur une fonction
   absente y fait paraître un besoin.

## Ajouter une vidéo

Les douze vidéos du parcours sont fixées dans `src/lib/decouvrir/catalog.ts` (`VIDEO_IDS`, `VIDEO_LEVEL`) ; leur
titre, leur résumé et « Pour qui » sont dans le dictionnaire (`decouvrir.videos`, français et anglais), et leur
icône dans `LOOK` (`src/components/decouvrir/Library.tsx`). Un identifiant publié ne change plus : Sandboxes compte les
vidéos par lui ; un ancien identifiant passe par `RENAMED` (les vieux liens suivent).

Publier une vidéo tournée :

1. Le MP4 va au stockage de fichiers de la passerelle (une adresse `https://` publique), **jamais dans git** : un test
   le vérifie.
2. Dans `apps/web/public/decouvrir/videos/` : `<id>.jpg` (l'affiche, 16:9), `<id>.vtt` (les sous-titres en français)
   et `<id>.json` :

   ```json
   {
     "id": "02-capturer",
     "title": "Capturer : vidéo, photos, notes vocales",
     "summary": "Filmer l'expert au téléphone, ajouter photos, notes et documents.",
     "durationSec": 142.5,
     "mp4": "https://…/02-capturer.mp4",
     "poster": "/decouvrir/videos/02-capturer.jpg",
     "vtt": "/decouvrir/videos/02-capturer.vtt",
     "chapters": [{ "t": 0, "title": "Filmer le geste" }, { "t": 31.2, "title": "Ajouter une photo" }],
     "transcript": [{ "t": 0.6, "text": "On filme l'expert qui fait le geste." }]
   }
   ```

   Les chapitres et la transcription suivent la langue de la vidéo (le français). Sans MP4, ou avec un JSON illisible,
   la vidéo reste « Bientôt ».
3. `npm test` (le format et le catalogue), puis déployer : les métadonnées se lisent au build. Le conseiller
   recommande la vidéo et ses chapitres dès le déploiement suivant.
4. Un nouveau sujet (une treizième vidéo) : un identifiant `NN-slug` dans `VIDEO_IDS` et `VIDEO_LEVEL`, son icône
   dans `LOOK`, ses textes dans les deux dictionnaires ; les tests disent ce qui manque.

## Vérifier

- `npm test` : l'accès et ses messages, la session (clé à part), le suivi et ses lots, le relais, le bloc `besoin`,
  les métadonnées des vidéos, les écrans (`apps/web/tests/decouvrir-*.test.ts*`), la passerelle et Sandboxes
  simulés.
- Interrupteur éteint : `/decouvrir` public, le film joue, le conseiller répond, `/api/decouvrir/*` répond 404.
- Interrupteur allumé, sans clé : l'écran d'entrée ; un prospect est refusé avec « pas encore ouvert », jamais une
  erreur technique.
