# Génération au serveur de CLIP V3 dans le n8n de prod

État au 2026-11-17, relu en lecture seule dans les deux n8n :

- **QA** (`qa.n8n-ai.intelligenceindustrielle.com`) : `Job_start` a la branche clip-v3, et
  `Job_Generate_CLIP_V3` existe (id QA `IOKVXaiMlWMmo5hK`).
- **Prod** (`n8n-ai.intelligenceindustrielle.com`) : `Job_start` (id `Kwt0SDCxBSoXoh88`) n'a pas changé
  depuis le 2026-10-28 et n'a que 4 sorties (SPEC, CLIP, SlideFabrik, rapport_html) ;
  `Job_Generate_CLIP_V3` n'existe pas.
- Les sous-workflows appelés gardent le même id en prod : `Ask_AI_V4` `AwP1NDtf9yFY3tuf`,
  `Route_MongoDB_POST_insert_one` `SqLiePHovcaUKU9F`, `Route_MongoDB_GET_one` `xsvJzHAN7eRvWh4c`,
  `Route_MongoDB_PATCH_update_one` `xbQfhS6Z6YRZZBP4`, `Job_start` `Kwt0SDCxBSoXoh88`. Seul le nouveau
  `Job_Generate_CLIP_V3` aura un id à lui en prod.

Ce n'est **pas** la cause de « Cannot POST /gemini/upload » : l'envoi chez Gemini passe par le
microservice `octopus-uploads-service`, pas par n8n. En prod, il répond 404 sur `/gemini/upload` (il
l'a en QA) : il faut le déployer en prod à part.

## Les fichiers

| Fichier | Où il va |
|---|---|
| `Job_Generate_CLIP_V3.json` | Un **nouveau** workflow en prod (importé tel quel) |
| `job_start-branche-clip-v3.json` | Les 11 nœuds de la branche clip-v3, **collés** dans le canevas de `Job_start` en prod |
| `job_start-regle-switch-clip-v3.json` | La 5ᵉ règle du nœud Switch « App identifier » de `Job_start` (pour référence) |

## Les étapes, dans l'ordre

1. **Créer `Job_Generate_CLIP_V3`**, avec le même compte que celui qui possède `Job_start` et
   `Ask_AI_V4` (les sous-workflows n'acceptent souvent que les workflows de leur propriétaire).
   - Workflows › Create › menu « … » › Import from File, choisir `Job_Generate_CLIP_V3.json`
     (ou coller son contenu dans un canevas vide).
   - Nom : `Job_Generate_CLIP_V3`. Dans Settings, « This workflow can be called by » doit être
     « Workflows from a list » avec `Kwt0SDCxBSoXoh88` (le fichier le porte déjà).
   - Ouvrir le nœud « Run AskAI V4 » : il doit pointer `Ask_AI_V4` (sinon, le choisir dans la liste).
   - Enregistrer, puis **Publish / activer**. Noter l'id dans l'URL : `/workflow/<ID>`.
2. **Dans `job_start-branche-clip-v3.json`**, remplacer `__ID_PROD_JOB_GENERATE_CLIP_V3__` par cet id
   (un seul endroit, le nœud « Analyse CLIP V3 »).
3. **Ouvrir `Job_start`** en prod, cliquer dans le canevas, puis coller (Ctrl/Cmd + V) le contenu de
   `job_start-branche-clip-v3.json`. Onze nœuds apparaissent, déjà reliés entre eux.
   - Vérifier « Analyse CLIP V3 » : il doit montrer `Job_Generate_CLIP_V3`. Sinon, choisir le workflow
     « From list ».
4. **Ajouter la sortie clip-v3** au nœud Switch « App identifier » : Add Routing Rule,
   - valeur `{{ $json.appIdentifier }}`, « is equal to », `clip-v3` (type String) ;
   - Rename Output : activé, nom `CLIP V3`.
5. **Relier** cette 5ᵉ sortie « CLIP V3 » à l'entrée du nœud « CLIP V3 phase ».
6. **Enregistrer et publier `Job_start`**. Rien d'autre ne change dans les quatre autres branches.

## Vérifier

- Lecture seule (Claude, n8n de prod) : `Job_start` a 32 nœuds et un Switch à 5 sorties ;
  `Job_Generate_CLIP_V3` est actif et appelable par `Kwt0SDCxBSoXoh88`.
- Dans CLIP (prod), Réglages › Usine : génération « Au serveur », puis générer une instruction **à partir
  de photos ou d'une note écrite** (une vidéo ou une note vocale échoue encore tant que
  `octopus-uploads-service` n'est pas à jour). Dans n8n, deux exécutions de `Job_start` (le premier
  passage qui répond, puis `phase: run`), et une de `Job_Generate_CLIP_V3`, au succès.
