Poser la branche CLIP V2 dans le `Job_start` du n8n de PROD, avec le navigateur intégré de l'app
Claude (pas l'extension Chrome).

Contexte : dans le dépôt de CLIP (branche main, à jour avec `git pull`), le dossier `docs/n8n/prod/`
contient le guide (`README.md`) et les JSON exacts, tirés du n8n de QA où tout marche. Lis d'abord
`docs/n8n/prod/README.md` en entier et suis ses étapes dans l'ordre.

- n8n de prod : https://n8n-ai.intelligenceindustrielle.com. Je m'y connecte moi-même dans le
  navigateur intégré ; si la page demande une connexion, attends-moi, ne saisis aucun mot de passe.
- Ne touche qu'au workflow `Job_start` (id `Kwt0SDCxBSoXoh88`). `Job_Generate_CLIP_V2` existe déjà
  (id `Jhgd4KgBBK716vTU`) : n'y touche pas. Aucune autre branche, aucun identifiant.
- Pour coller un JSON : ouvre le fichier du dépôt, copie son contenu exact dans le presse-papiers,
  puis colle-le dans le canevas n8n. Ne retape jamais un JSON à la main.

Étapes (détail dans le README) :
1. Ouvre `Job_start`. S'il reste des nœuds de l'ancienne branche (« … CLIP V3 … »), supprime-les.
2. Colle les 11 nœuds de `docs/n8n/prod/job_start-branche-clip-v2.json` ; vérifie que « Analyse
   CLIP V2 » montre `Job_Generate_CLIP_V2`.
3. Dans le Switch « App identifier », la règle de la sortie « CLIP V2 » : `{{ $json.appIdentifier }}`
   est égal à `clip-v2`, et rien d'autre ; relie cette sortie à « CLIP V2 phase ».
4. Montre-moi une capture du canevas de `Job_start` avant d'enregistrer. **Attends mon accord**, puis
   enregistre et publie.

À la fin, dis-moi le nombre de nœuds de `Job_start` (32 attendus), le nombre de sorties du Switch (5)
et la valeur de la règle « CLIP V2 » (`clip-v2`). Si une étape ne se passe pas comme le README le dit,
arrête-toi et décris ce que tu vois, sans improviser.
