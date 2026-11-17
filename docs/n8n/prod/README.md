# Génération au serveur de CLIP V2 dans le n8n de prod

CLIP s'appelle `clip-v2` partout, en QA comme en prod (décision du 2026-11-17) : l'app envoie
`appIdentifier: 'clip-v2'` à `POST /api/v1/ai/job/start` (`APP_DATA_IDENTIFIER`,
`apps/web/src/lib/config.ts`), et la branche de `Job_start` qui la prend s'appelle CLIP V2.

État relu le 2026-11-17 :

- **QA** (`qa.n8n-ai.intelligenceindustrielle.com`) : `Job_start` a la branche CLIP V2 (11 nœuds) et
  sa règle accepte `clip-v2` (et encore `clip-v3`, le temps de la transition) ; `Job_Generate_CLIP_V2`
  (id QA `IOKVXaiMlWMmo5hK`).
- **Prod** (`n8n-ai.intelligenceindustrielle.com`) : `Job_Generate_CLIP_V2` existe (id prod
  `Jhgd4KgBBK716vTU`). `Job_start` (id `Kwt0SDCxBSoXoh88`) est en cours de modification : à
  17 h 00, sa règle « CLIP V2 » attendait encore `clip-v3`, et les nœuds de la branche n'y étaient plus.
- Les sous-workflows gardent le même id dans les deux n8n : `Ask_AI_V4` `AwP1NDtf9yFY3tuf`,
  `Route_MongoDB_POST_insert_one` `SqLiePHovcaUKU9F`, `Route_MongoDB_GET_one` `xsvJzHAN7eRvWh4c`,
  `Route_MongoDB_PATCH_update_one` `xbQfhS6Z6YRZZBP4`, `Job_start` `Kwt0SDCxBSoXoh88`.

Sans la branche, rien ne casse : `Job_start` ne rend pas d'identifiant de travail, et l'app fait la
génération sur l'appareil (`job_not_started`). La branche sert surtout au téléphone, où iOS coupe une
génération quand l'app quitte l'écran.

## Les fichiers

| Fichier | Où il va |
|---|---|
| `job_start-branche-clip-v2.json` | Les 11 nœuds de la branche CLIP V2, **collés** dans le canevas de `Job_start` en prod. « Analyse CLIP V2 » pointe déjà `Job_Generate_CLIP_V2` de prod (`Jhgd4KgBBK716vTU`). |
| `job_start-regle-switch-clip-v2.json` | La 5ᵉ règle du Switch « App identifier » : `{{ $json.appIdentifier }}` égal à `clip-v2`, sortie « CLIP V2 ». |
| `Job_Generate_CLIP_V2.json` | Le workflow de génération, pour référence (déjà créé en prod) : à réimporter seulement s'il manque. |

## Les étapes dans `Job_start` (prod)

1. Ouvrir `Job_start`, cliquer dans le canevas, coller (Ctrl/Cmd + V) le contenu de
   `job_start-branche-clip-v2.json` : onze nœuds apparaissent, déjà reliés entre eux.
2. Ouvrir « Analyse CLIP V2 » : il doit montrer `Job_Generate_CLIP_V2` (sinon, le choisir « From list »).
3. Dans le Switch « App identifier », la règle de la sortie « CLIP V2 » : `{{ $json.appIdentifier }}`,
   « is equal to », **`clip-v2`** (type String). Aucune autre valeur.
4. Relier la sortie « CLIP V2 » à l'entrée du nœud « CLIP V2 phase ».
5. Enregistrer et publier `Job_start`. Les quatre autres branches ne changent pas.

## Vérifier

- Lecture seule (Claude, n8n de prod) : `Job_start` a 32 nœuds, la règle « CLIP V2 » vaut `clip-v2`,
  aucun nœud ni texte ne dit plus « V3 ».
- Dans CLIP (prod), générer une instruction : dans n8n, deux exécutions de `Job_start` (le premier
  passage qui répond, puis `phase: run`) et une de `Job_Generate_CLIP_V2`, au succès.

## L'envoi des vidéos chez Gemini

Ce n'est pas n8n : en prod, la route directe `/api/v1/ai/gemini/upload/direct` répond 404 (son
microservice `octopus-uploads-service` n'a pas `/gemini/upload`). Depuis la version 2.0.6, l'app passe
alors par la voie n8n de la Gateway (`/api/v1/ai/gemini/upload`, flux `Route_Gemini_File_Upload`,
celle de Clip V1), par son serveur (`/api/gemini-upload`). Déployer en prod la version QA du
microservice reste la vraie correction, côté plateforme.
