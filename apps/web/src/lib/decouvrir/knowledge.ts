/**
 * La base de connaissance du conseiller de l'espace Découvrir : ce que Clip fait AUJOURD'HUI, comment (les
 * écrans, les gestes, les libellés), pour qui, ce qu'il ne fait pas encore, et ce qui est prévu, sans date.
 * Écrite à partir de VISION.md, README.md, docs/architecture.md, docs/pont-natif.md,
 * billing.manifest.yaml, des dictionnaires de src/lib/i18n/fr (les vrais libellés) et du code ; chaque
 * phrase s'y retrouve (règle 6 du skill espace-decouvrir). Une fonction qui change met cette base à jour
 * dans le même changement (CLAUDE.md, « Espace Découvrir »).
 *
 * Contenu donné au modèle, en français : il ne s'affiche jamais tel quel (comme src/lib/ai/prompts.ts).
 * Jamais de prix, de nom de client réel ni de nom d'outil interne (tests/decouvrir-advisor.test.ts).
 */

export const KNOWLEDGE = `# Clip (Intelligence Industrielle) — ce que le logiciel fait aujourd'hui

## En une phrase
Clip fait passer le savoir-faire d'un expert, de son téléphone au poste, en quelques minutes : on filme, on
parle, on photographie, ou on dépose ses vieilles procédures en PDF et en Word, et l'IA rédige une instruction
de travail claire et visuelle (une action par étape, le bon extrait vidéo, la bonne photo, les mises en garde
au bon moment). Une personne relit, corrige d'un geste et publie ; l'opérateur la trouve au poste par un code
QR ou une tablette, sans compte, la suit étape par étape et signale ce qui n'est pas clair. On écrit aussi CLIP.

## Pour qui
- Technicienne en méthodes (rédactrice) : documenter vite des dizaines de postes et garder les instructions à jour.
- Opérateur au poste (lecteur, sans compte) : faire la tâche du premier coup, avec de grosses images, la vidéo
  au bon moment et la lecture à voix haute ; il lit parfois difficilement, il a des gants, il est pressé.
- Technicien de maintenance : retrouver les procédures et les fiches de cadenassage de l'équipement devant
  lui, et capturer une réparation qu'il est seul à savoir faire.
- Superviseure, qualité ou SST (approbatrice) : que rien de faux ni de dangereux ne soit publié, sans ralentir.
- Direction d'usine ou amélioration continue (administrateur) : standardiser, former plus vite, voir l'adoption.
- Un employé qui s'abonne seul pour documenter ses propres tâches, puis convainc son usine.
Usines manufacturières ; la personne qui écrit peut aussi être celle qui approuve, ou l'usine a ses approbateurs.

## Les rôles et les accès
- Administrateur : configure l'usine, les postes et les membres ; crée, approuve et publie.
- Approbateur : crée et corrige ; approuve ce que les autres publient.
- Rédacteur : crée et corrige ; publie, ou demande l'approbation si l'usine l'exige.
- Lecteur : consulte les instructions publiées et signale ce qui n'est pas clair.
- Les opérateurs au poste n'ont pas de compte : tablette du poste, code QR ou lien direct.
- Chaque membre a un rôle et des « Responsabilités » (ce qu'il voit en premier) ; « Voir comme » montre
  l'application telle qu'une personne la voit (Réglages › Membres).

## Les écrans
- Le menu : Accueil · Instructions · Postes · Équipe · Retours · Registre · Rapports, plus « Importer des
  documents » et « Réglages » ; le bouton « Nouvelle instruction » (au téléphone, le « + » au centre de la
  barre du bas).
- L'accueil : la grande carte « Filmez. Parlez. L'IA rédige. », la mise en route (« Mettez votre usine en
  route » : publier une première instruction, créer un poste et son code QR, ajouter le logo de l'usine,
  inviter un collègue, ajuster le standard de rédaction), les tuiles (instructions publiées et postes
  couverts, consultations des 7 derniers jours, postes, la série de semaines de suite avec une publication),
  ce qui attend la personne (à approuver, à revoir, retours des opérateurs) et ses brouillons (« Reprendre »).
- Au navigateur (ordinateur, tablette, téléphone) et dans l'app mobile CLIP (iPhone et Android), qui ajoute
  la caméra, le micro, le scan et l'envoi des gros fichiers du téléphone. Clair ou sombre ; l'outil parle
  français ou anglais (Réglages › Apparence).

## 1. Capturer (« Nouvelle instruction »)
- « Montrez et expliquez comme à un nouvel employé. L'IA s'occupe de la rédaction. » Tout tient sur un
  écran, au téléphone aussi (la page prend alors tout l'écran, comme l'éditeur) : « Filmer le geste » en
  grand (« Montrez et expliquez à voix haute : c'est le plus rapide »), puis, sur une ligne, « Photos »
  (pièces, réglages), « Note vocale » (expliquez à voix haute), « Note » (une précision écrite) et
  « Fichiers » (PDF, Word, vidéos). « De quoi s'agit-il ? » (facultatif) dit la tâche en quelques mots
  (« nettoyage des rails, machine 1234 »).
- Une fois un média ajouté, ce qu'on a ajouté (« Vos notes ») passe en tête, « Ajouter » en propose
  d'autres, et « Générer l'instruction » paraît dans une barre en bas.
- On peut glisser des fichiers : vidéos d'une autre caméra, photos, anciennes instructions en PDF ou Word.
  « Médias déjà pris » reprend les médias des instructions précédentes, sans rien téléverser de nouveau.
- Des médias légers : l'app mobile filme en 720p (environ 19 Mo la minute) et ramène les photos à 1920 px ;
  une vidéo trop lourde est réduite automatiquement. L'envoi continue si le réseau coupe un instant. Au
  navigateur, la caméra et le micro de l'appareil servent aussi.
- Au plus 30 minutes de vidéo pour une instruction : au-delà, l'app demande de la séparer en plusieurs.
- Options : le format (« Automatique », « Étape par étape » pour une instruction de travail, « Énergies et
  isolement » pour une fiche de cadenassage) et « Annoter les images automatiquement » (l'IA encercle ce qu'il
  faut regarder sur chaque photo ou image figée qui en a besoin, jamais sur un extrait vidéo).

## 2. Générer l'instruction avec l'IA
- Un seul bouton, « Générer l'instruction » : l'IA regarde et écoute les médias et rédige les étapes,
  d'habitude en moins de 2 minutes.
- Une action par étape, le moins de texte possible (un titre de quelques mots, une ou deux phrases), 0 à 2
  points clés, une mise en garde à l'étape où le risque se présente (« Danger », « Attention », « Bon à
  savoir »), les équipements de protection (EPI), les outils et le matériel.
- Chaque étape reçoit son média : l'extrait de la vidéo d'origine à la seconde près (joué en boucle au
  poste, pas un GIF), une photo, une image figée tirée de la vidéo, ou une page d'un PDF.
- L'IA classe l'instruction (production, maintenance, qualité, santé et sécurité, nettoyage, changement de
  format, démarrage et arrêt) et devine son poste, rapproché des postes existants.
- Ce que les sources ne tranchent pas devient au plus quatre questions (la pastille « à vérifier »), avec des
  réponses proposées ; les réponses corrigent l'instruction.
- Le standard de rédaction de l'usine guide chaque génération (Réglages › Standard de rédaction : toujours
  commencer par la sécurité, mots au plus par étape, ton, règles, vocabulaire de l'usine ; « Décrire à
  l'IA » le rédige à partir d'une description). Sous une instruction générée, « Le résultat vous
  convient ? » : ce qui manque guide les générations suivantes (« Ce que l'IA a appris de vos avis »).
- La génération tourne dans l'appareil qui la lance et se voit sur les autres (« En création ») ; au
  navigateur, on peut quitter l'écran tant que l'onglet reste ouvert. Si l'appareil s'éteint, la création est
  « interrompue » et se relance d'un geste ; les médias sont gardés.
- Rien n'est publié sans un geste humain : l'IA propose, une personne relit et publie.

## 3. Retoucher, annoter, illustrer
- Deux façons de modifier, au choix, retenu sur l'appareil. « Comme au poste » : l'étape telle que
  l'opérateur la verra, chaque texte modifié là où il est ; à l'ordinateur, le grand média à gauche, le
  texte à droite, la bande des étapes en bas ; au téléphone, les étapes sous le pouce. « Fiche » : la liste
  des étapes, et tous les outils de l'étape choisie à découvert (le texte et ses retouches par l'IA, le
  média, la mise en garde, les points clés, les relevés, la section) ; à l'ordinateur, la liste à gauche ;
  au téléphone, la liste, puis l'étape touchée. On glisse une étape par sa poignée pour la changer de place.
- « Aperçu » (l'œil) : l'instruction comme l'opérateur la suivra, puis retour à la même étape.
- « Assistant », le bouton de l'IA dans l'éditeur : « Simplifier l'étape », « Rendre plus clair », « Ajouter
  un point clé », « Vérifier la sécurité », ou une conversation pour demander n'importe quel changement
  (réécrire, ajouter une étape, « encercle le bouton vert sur la photo de l'étape 3 », dessiner un schéma,
  montrer à faire / à éviter), écrit ou dicté. Il modifie l'instruction sous les yeux de la personne, et tout
  son passage s'annule d'un geste ; au besoin, il revoit les vidéos et les notes d'origine.
- « Direct » : parler à l'assistant d'édition à voix haute, en direct (forfait Usine).
- « Annoter l'image » : crayon, surligneur, flèche, ligne, distance (une cote : « 12 mm »), cercle, cadre,
  texte, numéro, icônes (danger, gants, cadenas, sens horaire…) et flou (cacher un visage, un nom, un écran).
  « Annoter par IA » place les flèches et les cercles sur ce qu'il faut voir.
- « Avec l'IA » : une illustration à partir de la photo, ou un schéma de l'étape (vue de face, de dessus, en
  coupe ou en 3D, avec très peu de mots).
- Jusqu'à six médias par étape, disposés « Un à la fois », « À faire / À éviter » côte à côte, ou en « Grille ».
- Annuler et rétablir (Ctrl+Z) ; l'historique (versions publiées et points de retour du brouillon) pour
  revenir en arrière ; l'édition en direct entre appareils (ce qui change sur le téléphone s'affiche sur
  l'ordinateur) ; les sections d'une longue instruction (« Démontage », « Remontage »).
- Le menu « … » de l'instruction (dans la fiche, ces outils sont à découvert, en tuiles) : ses infos,
  partager (lien et code QR), traduire, les questions de formation, historique, exporter en PDF ou en JSON,
  dupliquer, nouvelle instruction avec ces médias, régénérer avec l'IA, archiver.
- La fiche de cadenassage : équipement, emplacement, cadenas requis, chaque source d'énergie (électrique,
  pneumatique, hydraulique, mécanique, gravité, thermique, chimique, vapeur, eau) avec sa magnitude, son
  dispositif d'isolement, sa méthode de cadenassage et la vérification de l'absence d'énergie, le matériel
  requis, puis le retrait des cadenas et la remise en marche.

## 4. Traduire
- « Traduire pour les opérateurs » : 38 langues, dont les plus demandées dans les usines du Québec (anglais,
  espagnol, portugais, arabe, créole haïtien, tagalog, vietnamien, chinois, ukrainien, pendjabi, hindi,
  russe, roumain, persan). Les étapes, la fiche, les légendes, les annotations, les outils et le texte des
  schémas se traduisent avec le reste ; l'arabe, le persan, l'hébreu et l'ourdou s'affichent de droite à gauche.
- En option, « Refaire aussi les images où il y a du texte » : l'IA redessine ces images avec leur texte
  traduit, à vérifier avant de publier.
- Au poste, l'opérateur choisit sa langue dans le lecteur. Les boutons du lecteur existent en français, en
  anglais et en espagnol ; pour une autre langue, ils sont en anglais et le contenu, traduit.
- Après une modification importante, on retraduit (« Mettre à jour la traduction »).

## 5. Moderniser les anciennes procédures (import en lot)
- « Importer vos anciennes instructions » : on dépose des PDF et des documents Word (.docx, .doc, .odt),
  même par dizaines ; chacun devient un brouillon structuré, prêt à relire (« Brouillon créé »). L'onglet reste
  ouvert pendant l'analyse ; « Reprendre l'analyse » relance ce qui reste. Forfait Usine.
- Un seul document se dépose aussi dans une nouvelle instruction, avec des vidéos et des photos.

## 6. Approuver et publier
- Réglages › Approbation : « Personne : on publie directement », « Un approbateur valide avant
  publication », ou « Plusieurs signatures » (chaque groupe signe, par exemple Qualité et Production, quatre
  groupes au plus ; l'instruction se publie à la dernière signature). On change d'idée en tout temps.
- L'approbateur voit les étapes nouvelles ou modifiées, puis approuve et publie, ou « Demander des
  changements » avec un commentaire. Une signature vaut pour le contenu signé : modifié ensuite, il est à
  signer de nouveau.
- Publier crée une version (numéro, auteur, approbateur, résumé des changements) ; l'historique les garde
  toutes, et on peut remettre une version d'avant dans le brouillon. Le numéro de document (« IT-0042 »,
  préfixe réglable) se donne à la première publication.
- En publiant : où l'afficher (les postes), « À revoir dans » 6 mois, 1 an, 2 ans ou jamais (rappelé un mois
  avant dans l'éditeur, la liste et l'accueil ; « Toujours bonne » repousse la relecture sans nouvelle
  version), et « Il faut se re-former » pour un changement important.
- Avant de publier, l'app signale ce qui manque (des étapes sans média, des points à vérifier, aucun poste).

## 7. Au poste, sans compte
- Chaque poste (machine, équipement ou zone) a son code QR : la tablette du poste ou le téléphone de
  l'opérateur ouvre ses instructions, sans compte. Au choix : « Ce poste d'abord » (les autres instructions
  restent à un geste) ou « Seulement ce poste ». Une instruction se partage aussi par un lien direct et son
  code QR, qui montrent toujours la version publiée, jamais le brouillon.
- Le lecteur pas à pas : une étape à la fois, un grand média, de gros boutons (« Suivant », « Précédent »),
  les EPI, les outils et les mises en garde « Avant de commencer », l'extrait vidéo en boucle, une fois ou au
  toucher, le zoom sur les images, « Tout voir » pour toute l'instruction d'un coup, « Toutes les étapes »
  (le sommaire, par section).
- Au téléphone, le média prend ses vraies proportions et laisse au texte la place de se lire sans
  défiler : une photo cède un peu de place, jamais sous un peu plus du tiers de l'écran, et une vidéo garde
  toute sa largeur. Tourné à l'horizontale, l'image et le texte vont côte à côte. « Tout voir » s'ouvre
  aussi depuis le sommaire.
- « Écouter » : l'étape est lue à voix haute.
- « Pas clair ? » : l'opérateur signale en deux touchers ce qui ne va pas (« Pas clair », « Erreur »,
  « Danger », « Idée », « Merci »), avec un commentaire, son prénom et une photo s'il le veut. Le retour
  arrive à la page Retours, où la personne responsable corrige l'étape d'un geste ; l'opérateur verra la
  nouvelle version. Si l'usine active les avertissements, un danger signalé avertit les personnes choisies.
- « Assistant vocal » et « Poser une question » : au poste qui l'a demandé (« Assistant vocal au poste »),
  l'opérateur navigue et pose ses questions à voix haute ou à l'écrit, et la réponse vient de l'instruction
  (forfait Usine).
- « Qui êtes-vous ? » (réglage « Demander qui travaille ») : la personne touche son nom et tape son code à 4
  chiffres ; on sait qui a fait quoi, et quand. On peut continuer sans se nommer.
- À la fin : « Comment ça s'est passé ? » (« Facile », « Difficile ») et, si l'instruction en a, « Valider ma
  formation ».
- La recherche au poste (« Chercher une instruction, une pièce, un numéro… »), aussi en parlant. La
  consultation demande le réseau ; les relevés et les formations faits sans réseau attendent dans l'appareil
  et partent dès que la connexion revient.

## 8. Postes, codes QR et étiquettes
- Page Postes : nom, code, type (poste de travail, équipement, zone) et secteur (zone ou ligne) ; « Étiquettes
  QR » imprime la planche des étiquettes ; « Ouvrir le mode tablette » ; « Remplacer le code QR » (l'ancien
  ne fonctionne plus dans Clip). « À couvrir » marque un poste sans instruction.
- Une instruction va à un ou plusieurs postes, choisis dans sa fiche ou en publiant. Le filtre « Où ? »
  trouve par secteur ou par poste.
- Sur la tablette d'un poste : ouvrir le lien, « Ajouter à l'écran d'accueil », puis le mode d'accès guidé
  (iPad) ou l'épinglage d'écran (Android).

## 9. L'équipe, les rôles et la formation
- Réglages › Membres : inviter par courriel, choisir le rôle et les responsabilités. Un lecteur ne compte
  jamais : on peut toujours en inviter.
- Page Équipe (les personnes au poste, sans compte) : ajouter des personnes en collant une liste (une
  colonne d'Excel), avec leur quart, leur équipe et leurs postes habituels ; chacune reçoit un code à 4
  chiffres, sur une feuille à imprimer et à remettre.
- Formation : l'IA prépare 3 à 5 questions par instruction, que l'auteur retouche ; au poste, la personne
  nommée les passe à la fin (« Valider ma formation »), réussie à 80 %. La matrice des compétences (Équipe ›
  Compétences) croise personnes et postes : formé, en partie, pas formé, à refaire.
- Module Académie (en option) : qualifier chaque personne poste par poste (« Valider sur le terrain »,
  « Qualifié » ou « Peut former »), la revalidation tous les 6, 12 ou 24 mois, la couverture par quart, le
  registre en CSV et l'attestation à imprimer. Ce n'est pas un système de cours.

## 10. Relevés, registre, retours et rapports
- Relevés : une étape peut demander une mesure (unité et limites), un oui ou non, un choix, un texte (numéro de
  lot) ou une photo. Au poste, le verdict est immédiat (« Dans la norme », « Hors norme ») ; un écart demande de
  dire ce qui a été fait, et on ne passe pas une étape incomplète. L'IA propose des relevés à la génération ;
  l'auteur les garde ou les retire.
- Registre : le travail fait aux postes (qui, quand, chaque relevé), « Écarts » d'un geste, la fiche de chaque
  travail à imprimer.
- Module Relevés (en option) : liste à cocher, mesures répétées, « Comment mesurer », scan d'un numéro de lot,
  plusieurs photos, écart à faire autoriser ; au registre, les tendances de chaque mesure et l'export CSV.
- Retours : ce que le plancher signale, « À traiter » et « Traités » ; « Corriger » ouvre l'étape.
- Rapports : des modèles prêts (revue de la semaine, temps par instruction, qui a fait quoi, par poste et
  secteur, écarts et relevés, avant / après une révision, formation et qualification, retours des opérateurs,
  santé de la bibliothèque), sur 7, 30 ou 90 jours comparés à la période d'avant, par lieu et par quart. Le
  logiciel calcule chaque chiffre ; l'IA les commente et répond aux questions sur le rapport. Les personnes y
  vont par ordre alphabétique : un registre, jamais un palmarès.
- Statistiques : consultations (tablettes, liens, app), réalisations, retours, les instructions les plus
  consultées et celles jamais consultées, et une valeur estimée selon les hypothèses de l'usine (heures gagnées
  par instruction, minutes par réalisation, taux horaire) ; le dossier pour la direction les reprend dans une
  page à imprimer.

## 11. Avertir les bonnes personnes
- « À voir » (la cloche) : ce qui attend la personne (une instruction à approuver ou à signer, des changements
  demandés, un danger signalé, un écart relevé, une qualification à revalider).
- Réglages › Avertissements : par courriel et sur le téléphone (une notification de l'app mobile) ; l'usine
  choisit qui est averti d'un danger ou d'un écart.

## 12. Blocs communs
- Des étapes rédigées une fois (le cadenassage d'une presse, le démarrage d'une ligne, les EPI avant d'entrer),
  réutilisées dans plusieurs instructions et mises à jour partout : publier le bloc republie les instructions
  qui le contiennent.

## 13. Vos données
- Chaque instruction s'exporte en PDF et en JSON, à tous les forfaits ; « Exporter tout (JSON) » réunit toutes
  les instructions et leurs versions dans un seul fichier (forfait Usine).
- Le PDF suit la langue de l'instruction ; il porte sa version et rappelle qu'une copie imprimée peut être périmée.

## Intégrations
- Le scan de l'app mobile lit les codes QR et les codes-barres (Code 128, Code 39, EAN, UPC, DataMatrix) :
  « Scannez le code du poste ou de la pièce ». Une étiquette de recherche peut porter un numéro de pièce.
- Clip ne remplace ni un ERP ni un MES : il se branche sur leurs numéros (codes, étiquettes, QR).

## Forfaits (sans les prix)
- Les prix : un conseiller d'Intelligence Industrielle vous les donnera.
- Gratuit : une personne, pour essayer (1 rédacteur, 3 instructions publiées, 1 poste).
- Solo : une personne qui documente ses tâches (1 rédacteur, 30 instructions publiées, 5 postes), avec les
  statistiques d'adoption.
- Équipe : 5 rédacteurs, instructions illimitées, 25 postes, avec l'approbation, la traduction pour les
  opérateurs, les blocs communs, le logo et les couleurs de l'usine.
- Usine : 15 rédacteurs, 100 postes, avec en plus l'import en lot, l'assistant vocal au poste et l'export complet.
- Entreprise : sur mesure.
- Modules en option, avec Équipe ou Usine : Académie et Relevés avancés, 14 jours d'essai.
- Chaque forfait a sa banque mensuelle de crédits d'IA. Les lecteurs et les opérateurs ne se comptent jamais.
- L'offre peut encore changer : un conseiller d'Intelligence Industrielle la confirme.

## Ce qui n'existe pas encore (à dire franchement, et à noter comme besoin)
- Alerte avant l'échéance d'une instruction (un courriel ou une notification au responsable avant sa date de
  relecture) : pas encore ; aujourd'hui, « À revoir dans » 6 mois, 1 an, 2 ans ou jamais, rappelé dans l'app un
  mois avant (l'éditeur, la liste et l'accueil).
- Date d'échéance d'une instruction choisie au jour près, ou une instruction qui expire et se retire seule du
  poste : pas encore ; aujourd'hui, une relecture en retard se voit (« Révision en retard ») sans rien bloquer
  au poste.
- Écran TV synchronisé avec la tablette du poste : prévu ; aujourd'hui, un écran ouvre le même lien qu'une tablette.
- Réception des vidéos de caméras par une API : prévue ; aujourd'hui, on dépose les vidéos d'une autre caméra
  dans une nouvelle instruction.
- Connecteurs ERP, MES ou GMAO, API publique, webhooks : pas encore ; aujourd'hui, Clip se branche sur leurs
  numéros (codes QR, codes-barres, étiquettes).
- Connexion d'entreprise (SSO) : pas encore ; aujourd'hui, un courriel et un mot de passe.
- Inscription en libre-service : pas encore ouverte ; aujourd'hui, un compte s'ouvre sur invitation.
- Droits par rôle appliqués aussi côté serveur, sur les données : pas encore ; aujourd'hui, les rôles
  s'appliquent dans l'application.
- Hors ligne complet : non ; aujourd'hui, la capture tolère un réseau instable, et les relevés et les
  formations faits sans réseau partent ensuite.
- Mise en page libre à la Word : non ; la structure est imposée, c'est elle qui rend les instructions
  lisibles au plancher (l'export PDF existe).
- Système de cours (cours libres, catalogue de formations, examens certifiants, palmarès) : non ; aujourd'hui,
  les questions de formation à la fin d'une instruction, la matrice des compétences et le module Académie.
- Ordres de fabrication et temps de cycle : non, c'est le rôle de l'ERP ou du MES ; Clip se branche sur leurs numéros.
- Logiciel qualité complet (cartes de contrôle, capabilité, non-conformités et actions correctives) : non ;
  aujourd'hui, les relevés, le registre et, avec le module Relevés, les tendances et l'export CSV.
- Surveillance des personnes, palmarès ou note de performance : non ; les rapports vont par ordre alphabétique.
- Génération de vidéos par l'IA : non ; Clip garde les vraies vidéos de l'expert.

## Ce qu'on prévoit ensuite (sans date)
- L'écran TV synchronisé avec la tablette du poste : l'étape change sur les deux.
- La réception des vidéos de caméras par une API.

## Sécurité et données
- Les données sont sur la plateforme d'Intelligence Industrielle, cloisonnées par organisation : chaque usine
  voit seulement les siennes.
- Les opérateurs ouvrent les instructions par des liens à portée limitée, bâtie par le serveur : un lien de
  poste lit seulement les instructions publiées (jamais les brouillons) et envoie des retours ; un lien
  d'instruction ne montre jamais l'équipe. Remplacer un code QR rend l'ancien inutilisable dans Clip.
- Les codes à 4 chiffres des opérateurs ne sont gardés qu'en empreinte, jamais en clair.
- Rien ne part vers l'IA sans l'accord de la personne (une fois, par appareil) : l'IA passe par des services
  de Google et d'OpenAI, par la plateforme d'Intelligence Industrielle ; l'accord se retire dans Réglages ›
  Données. « Supprimer mon compte » est dans Mon compte ; les instructions de l'usine restent à l'équipe.
- Ne cite jamais le nom d'un client réel d'Intelligence Industrielle.

## Cet espace et la démo
- Cet espace Découvrir : des vidéos sur Clip et ce conseiller. Il n'y a pas de démo en libre accès : une
  démonstration se demande à votre contact chez Intelligence Industrielle.
- Les personnes et l'usine montrées dans les vidéos sont fictives (« Jacques », la « Machine 1234 »).

## Questions fréquentes
- Combien de temps pour une première instruction ? Quelques minutes : filmer quelqu'un qui fait la tâche en
  l'expliquant, puis « Générer l'instruction ». À la première ouverture, trois questions configurent l'usine
  (son nom, ce qu'on documente en premier, qui approuve).
- Faut-il un compte pour chaque opérateur ? Non : tablette du poste, code QR ou lien direct. Pour savoir qui a
  fait quoi, un nom et un code à 4 chiffres.
- L'IA publie-t-elle toute seule ? Non : elle propose ; une personne relit, corrige et publie (ou fait approuver).
- Nos vieilles procédures ? Les PDF et les Word se déposent par dizaines et deviennent des brouillons structurés.
- Des opérateurs d'autres langues ? Traduction en 38 langues, annotations et légendes comprises ; l'opérateur
  choisit sa langue au poste.
- Les fiches de cadenassage ? Oui : un format à part (sources d'énergie, isolement, vérification, remise en marche).
- Sur quels appareils ? Le navigateur (ordinateur, tablette, téléphone) et l'app mobile CLIP pour iPhone et
  Android ; au poste, une tablette ou le téléphone de l'opérateur. Où l'installer : votre contact chez
  Intelligence Industrielle vous le dira.
- Peut-on exporter ? Oui, chaque instruction en PDF et en JSON, à tous les forfaits.
- Peut-on voir l'adoption ? Oui : consultations, réalisations, retours, et les rapports (temps, écarts, formation).

## Glossaire
- Instruction de travail : la marche à suivre d'une tâche, étape par étape (aussi SOP ou gamme d'opérations).
- Fiche de cadenassage : comment isoler les énergies d'un équipement avant d'intervenir.
- EPI : équipements de protection individuelle (gants, lunettes, casque…).
- Poste : une machine, un équipement ou une zone, avec son code QR.
- Extrait : le bout de la vidéo d'origine qui montre l'étape, joué au poste.
- Point clé : ce qui compte dans une étape, et pourquoi (sécurité, qualité ou efficacité).
- Relevé : ce qu'on note au poste pour la trace (une mesure, un oui ou non, une photo…).
- Standard de rédaction : les règles d'écriture de l'usine, que l'IA suit.
- Bloc commun : des étapes rédigées une fois, réutilisées dans plusieurs instructions.
- Crédits d'IA : la banque mensuelle qui sert aux opérations d'IA de chaque forfait.
`
