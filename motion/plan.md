# Plan — film de présentation de Clip (75,0 s, 16:9)

Voix Aoede (qc, énergique) vérifiée par Whisper. Heures lues dans `work/words.txt`.

| # | Début–fin | Voix | Registre | Ce qu'on voit, sur quels mots | Raccord |
|---|---|---|---|---|---|
| 01 | 0,0–3,3 | v01 | clip IA C1 | Jacques explique à sa CNC ; pastille « Jacques · machiniste » sur « Jacques », point sur le rail sur « machine » | coupe franche |
| 02 | 3,3–6,2 | v02 | clip IA C2 | ses mains gantées brossent les rails ; pastille « Retraite · l'an prochain » sur « retraite » | coupe franche |
| 03 | 6,2–11,5 | v03 | clip IA C3 + texte | l'usine en travelling, assombrie ; « 20 à 30 % » court sur « vingt »/« trente », barre jusqu'à 2030 | la barre devient trait |
| 04 | 11,5–15,4 | v04 + silence | photo | le cartable (pousse lente) ; sur « nulle part », l'image se referme en carte ; le trait du logo se dessine pendant le silence (entrée de la musique) | le trait devient le logo |
| 05 | 15,4–18,2 | v05 | marque | « Voici… Clip » : logo et nom, fond à orbes de l'app | le logo devient la photo |
| 06 | 18,2–24,0 | v06 | photo + plongée | Mélanie filme Jacques (tenue 2,5 s, pastille du lieu) ; plongée dans le téléphone sur « Clip » : la caméra de Clip, 02:14 en rouge | l'écran devient l'app |
| 07 | 24,0–30,1 | v07 | interface | « Nouvelle instruction » : photo, note vocale, PDF et Word arrivent chacun sur son mot | même écran |
| 08 | 30,1–34,6 | v08 | interface | clic « Générer l'instruction » sur « bouton » ; « L'IA rédige votre instruction », les étapes se cochent | la carte devient l'instruction |
| 09 | 34,6–39,8 | v09 | interface + clips C4, C5 | les 5 étapes tombent sur « étape » ; l'extrait (huile, C4) joue sur « extrait vidéo » ; « Danger » et le cadenas (C5) sur « mises en garde » | coupe sur le temps |
| 10 | 39,8–45,2 | v10 | interface, 3 coupes | l'assistant réécrit l'étape (« mot ») ; l'IA encercle le bouton vert (« clic ») ; l'étape passe en espagnol, chinois, arabe (« secondes ») | coupes sur les temps |
| 11 | 45,2–51,4 | v11 | photo + interface | le cartable ; 40 PDF déposés sur « Déposez-les » ; « 40 sur 40 terminés » sur « modernisées » | coupe |
| 12 | 51,4–57,6 | v12 | interface + photo | « Approuver et publier » sur « approuver », confettis ; Kevin à la tablette du poste sur « déployez-la » ; le code QR sur « QR » ; « Sans compte » | plongée dans la tablette |
| 13 | 57,6–63,4 | v13 | interface (tablette) | « Suivant » sur « étape », « Écouter » sur « voix haute », « Pas clair ? » sur « signale » | coupe |
| 14 | 63,4–66,7 | v14 | interface | la page PDF sort sur « clic », se pose sur « PDF » | la page devient le logo |
| 15 | 66,7–75,0 | v15 v16 | marque | « Clip. » logo ; la promesse en trois temps ; « Demandez une démo » ; tenue 1,3 s | fin |

**Réel** : 5 clips IA (Kling 3.0 Pro, 5 s, sans son) ≈ 14 s sur 74 s (19 %), 43,75 crédits ; photos et
écrans incrustés déjà faits (partagés avec le deck). **Personnages** : Jacques (machiniste, ~62 ans, barbe
grise, chemise marine), Mélanie (méthodes, queue de cheval, veste grise), Kevin (opérateur, t-shirt vert).
**Son** : musique Eleven Music composée sur le montage (`musique.json` : électro de lancement, 125 BPM, la majeur ;
tension jusqu'au drop, qui tombe à 15,36 s sur la coupe vers « Voici Clip »), sous la voix à −11 LU, seule à −5 LU.
Effets sonores : la banque du film K2 V2 (`scripts/sfx.py`), environ 120 sons déclarés dans chaque scène (`SFX(...)`)
aux mêmes instants que son image : un whoosh par coupe, un tic et un pop par pastille, les clics, les touchers, les
étincelles de l'IA, l'impact et le riser du drop. **Énergie** : drop en éclat (05), coups de caméra (`PUNCH`) sur les
clics et les cartes, apparitions qui claquent (`POP`), les trois verbes de la scène 10 en pastilles.
