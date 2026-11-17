Mettre la génération au serveur de CLIP V3 dans le n8n de PROD, avec le navigateur intégré de
l'app Claude (pas l'extension Chrome).

Contexte : dans le dépôt Clip-v3 (branche main, à jour avec `git pull`), le dossier `docs/n8n/prod/`
contient le guide (`README.md`) et les JSON exacts, tirés du n8n de QA où tout marche. Lis d'abord
`docs/n8n/prod/README.md` en entier et suis ses étapes dans l'ordre.

- n8n de prod : https://n8n-ai.intelligenceindustrielle.com. Je m'y connecte moi-même dans le
  navigateur intégré ; si la page demande une connexion, attends-moi, ne saisis aucun mot de passe.
- Ne touche qu'à deux workflows : le nouveau `Job_Generate_CLIP_V3` et `Job_start`
  (id `Kwt0SDCxBSoXoh88`). Aucun autre nœud, aucune autre branche, aucun identifiant.
- Pour importer ou coller un JSON : ouvre le fichier du dépôt, copie son contenu exact dans le
  presse-papiers, puis colle-le dans le canevas n8n. Ne retape jamais un JSON à la main.

Étapes (détail dans le README) :
1. Crée `Job_Generate_CLIP_V3` depuis `docs/n8n/prod/Job_Generate_CLIP_V3.json`, vérifie que « Run
   AskAI V4 » pointe `Ask_AI_V4` et que Settings › appelable par = liste avec `Kwt0SDCxBSoXoh88`,
   enregistre, publie, et note l'id de l'URL.
2. Dans une copie de `docs/n8n/prod/job_start-branche-clip-v3.json`, remplace
   `__ID_PROD_JOB_GENERATE_CLIP_V3__` par cet id.
3. Ouvre `Job_start`, colle les 11 nœuds, vérifie que « Analyse CLIP V3 » montre
   `Job_Generate_CLIP_V3`.
4. Dans le Switch « App identifier », ajoute la 5ᵉ règle : `{{ $json.appIdentifier }}` est égal à
   `clip-v3`, sortie renommée `CLIP V3` ; relie cette sortie à « CLIP V3 phase ».
5. Montre-moi une capture du canevas de `Job_start` avant d'enregistrer. **Attends mon accord**, puis
   enregistre et publie.

À la fin, dis-moi l'id de `Job_Generate_CLIP_V3` en prod, le nombre de nœuds de `Job_start` (32
attendus) et le nombre de sorties du Switch (5). Si une étape ne se passe pas comme le README le dit,
arrête-toi et décris ce que tu vois, sans improviser.
