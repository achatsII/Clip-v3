# Brief — vidéo de présentation de Clip

| Paramètre | Valeur |
|---|---|
| Produit | **Clip** (CLIP V3) : instructions de travail en usine générées par l'IA, de la capture au poste |
| Type | Film de présentation produit, énergique (« introducing »), sur le modèle du film manifeste K2 V2 (`intelligence-industrielle/k2-cadence`, `motion/campagne`) |
| Objectif | Faire comprendre en une minute à quoi sert Clip (capturer le savoir-faire avant les départs à la retraite) et montrer ses fonctions principales ; donner envie de l'essayer |
| Public | Directions d'usine, méthodes, amélioration continue, maintenance, qualité, SST (manufacturier) |
| Appel à l'action | à confirmer avec l'utilisateur |
| Durée cible | ~72 s (entre 1 min et 1 min 15) |
| Format | 16:9, 1920 × 1080 |
| Langue, accent | français québécois (TTS `qc`) |
| Voix | une voix off, la même réglage que K2 V2 : Gemini **Aoede**, `qc`, `medium_fast`, `narrator`, énergie `high` ; un passage sans voix au moment fort (« Voici Clip ») |
| Sous-titres | à part (`.srt`), non gravés |
| Musique | **oui, demandée** (« ça bouge vite, il y a de la musique, des petits effets sonores ») : composée sur le montage approuvé ; effets sonores synthétisés comme K2 (`scripts/sfx.py`) |
| Réel (Higgsfield) | photos déjà générées et partagées avec le deck (même usine, mêmes personnes) ; ~5 clips IA de 5 s après validation des images clés et du coût |
| Source du produit | ce dépôt (`apps/web`) : design « verre » (`globals.css`), écrans et libellés exacts (`src/lib/i18n/fr`) ; maquettes déjà reproduites pour le deck (`presentation/build`) |
| Vrai contenu | usine et personnes illustratives (« Usine Démo », Jacques, Mélanie, Kevin, Nathalie) ; aucun chiffre présenté comme un résultat client. Seule statistique : 20 à 30 % des technologues à la retraite d'ici 2030 (donnée fournie par l'utilisateur) |
| Hors vidéo | la date d'échéance et l'alerte (pas encore dans l'app) : montrées dans le deck seulement, sauf demande |
| Export MP4 | seulement sur demande explicite ; chaque tour = aperçu en artefact |
