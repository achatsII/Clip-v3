# Vision — CLIP V3

> Référence que Claude consulte avant tout changement (skill doctrine-ii).
> Change rarement : quand un changement contraire à la vision est confirmé, on met ce fichier à jour.

## Prompt fondateur

> Un seul passage a été retiré, à la demande de l'auteur : la valeur interne d'un crédit IA ne
> s'écrit nulle part dans le dépôt.

Je veux que tu développes un logiciel qu'on va appeler CLIP V2. OK, l'objectif du logiciel, c'est de faire des instructions de travail en usine. C'est des instructions de travail ou des SOP ou des gammes d'opérations ou des choses comme ça, OK? Fait qu'en gros, l'idée, c'est de bénéficier d'une application mobile Expo, OK, pour prendre des notes, que ce soit des notes vocales, des photos, des vidéos, tu filmes quelqu'un qui explique une instruction de travail, tu prends des photos des trucs, tu fais des notes vocales, tu mets des textes, tu remplis des formulaires, peu importe, OK, tu te sers vraiment de ton téléphone pour ça, OK? Tu peux prendre plein de médias puis tout ça. Puis après ça, bien, l'intelligence artificielle générative va analyser toutes tes prises de notes. Ça peut être aussi des anciennes instructions de travail que tu avais en PDF ou en Word ou en peu importe. Puis elle analyse tout ça pour générer une instruction de travail consommable pour le plancher de production. OK. C'est-à-dire que on peut déployer ça sur une tablette ou on peut y accéder aussi avec l'application mobile. Fait que je veux une appli web aussi desktop. Mais je veux une appli mobile aussi Expo aussi bien pour générer des instructions. Tu sais, tu peux dropper un vidéo aussi que tu avais déjà filmé sur une autre caméra si tu veux directement dans l'application web ou tu peux y aller directement depuis l'application Expo. Là, à nous de voir si c'est une application web qu'on vient encapsuler en Expo pour pas avoir à deux code base à modifier. Mais si c'est le cas, il faut quand même avoir des fonctionnalités natives pour la prise de photos, de vidéos, tout ça. Je ne veux pas utiliser juste l'appareil photo du iPhone qui filme en 120 images secondes en 4K puis qui est ultra lourd chaque vidéo. Je veux qu'on contrôle bien le poids des vidéos qui sont prises, le poids des images qui sont prises. En tout cas, tout ça pour dire que tu prends plein de notes, OK, comme ça, des photos, des vidéos, tu filmes des gens qui expliquent une instruction de travail, tu viens lui donner aussi un nom, peut-être des catégories. En tout cas, je sais pas trop des tags ou des choses comme ça. Puis l'intelligence artificielle générative avec la route AskAI v4, ça va venir analyser tout ça puis générer une instruction de travail. Puis là, il peut avoir différentes façons de la présenter, l'instruction de travail. Elle peut être step by step vraiment pour un plancher de production qui va suivre étape par étape avec des grosses images, des images qui ont été reprises des vidéos ou des photos. Tu sais, ça peut être une portion du vidéo qui est affichée directement à la bonne seconde ou ça peut être un GIF qui a été créé. Je ne sais pas c'est quoi qui est mieux. Est-ce que tu crées des GIF depuis le vidéo pour chaque étape ou c'est probablement mieux d'afficher juste une portion du vidéo d'un timestamp bien précis. Tu sais, fait qu'en gros, le but, c'est que je puisse créer une instruction de travail step by step que je vois ensuite sur une tablette, sur un écran ou même sur un téléphone pour pouvoir passer étape par étape depuis le vidéo que j'ai appris ou les instructions PDF que j'avais joint ou les photos. Ça nous crée un step by step où l'opérateur peut naviguer dans son instruction de travail. Il peut aussi naviguer par la voie avec un assistant live. Il peut poser des questions. Il peut naviguer par la voie. Il peut rentrer des non-conformités pour proposer des modifications, etc, etc. On peut avoir un prompt aussi de génération, un prompt standard sur c'est quoi nous une bonne instruction de travail dans une usine ou avoir un peu un template, peut-être créer des templates avec des couleurs, tu sais, les couleurs de l'entreprise, des logos, je ne sais pas trop. Peut-être qu'une entreprise, eux autres, son instruction de travail veut toujours commencer par une étape d'un message de santé sécurité, mais peut-être qu'une autre non, tu sais, fait qu'il faut pouvoir avoir un peu un principe de, je ne sais pas si c'est le prompt ou si c'est un modèle à utiliser ou les bonnes pratiques. Je ne sais pas comment tu vas faire. Moi, je te donne des idées, mais c'est probablement des idées de merde. Juste que tu comprennes le besoin. Je veux que ça soit un outil extrêmement simple, extrêmement intuitif pour générer des instructions de travail avec l'intelligence artificielle générative. Puis là, c'est toi-même aussi qui va penser au pricing model de cette appli-là. C'est une appli software as a service. Tu peux avoir différents plans, mais tu sais, je veux attirer de la clientèle. Je veux peut-être un principe peut-être de freemium aussi malgré que nous, à chaque fois qu'on utilise l'AI, ça consomme des crédits. Fait que c'est sûr que toi, tu vas avoir un nombre de crédits. Ça va être des tokens. C'est pas des tokens, mais des crédits AI. [Passage retiré : la valeur interne d'un crédit IA.] Fait qu'à chaque fois que tu utilises de l'AI, toi, tu vois le coût que ça coûte. Mais il faut que tu déduises les crédits puis que tu en prévois par mois, mettons, des affaires de même. Puis c'est ça, je veux aussi pouvoir visualiser les instructions de travail, les exporter en PDF ou les exporter en JSON aussi si on le souhaite. Mais c'est ça, je ne voudrais pas que les gens utilisent notre application pendant un mois pour générer toutes les instructions de travail puis après les exportent puis plus avoir besoin de notre application. Je veux vraiment que l'application soit super intéressante aussi pour modifier les instructions de travail, les versionner, les faire approuver par certaines personnes, bien les catégoriser pour pouvoir y accéder. Tu sais, sur une tablette, tu scannes un code QR ou un code barre ou je ne sais pas trop, tu accèdes avec le numéro de production à la bonne instruction qui pop au bon moment. Fait qu'il faut que ça soit extrêmement, extrêmement intuitif. On peut envoyer des vidéos aussi par API si mettons, on utilise des caméras ou je ne sais pas trop. Faut que ça soit une application où on gagnerait des prix internationaux de simplicité d'utilisation, même si c'est une application extrêmement avancée qui permet de faire des instructions de travail tellement bien faites, tellement simples, peut-être sous différents formats. Il y a peut-être, tu sais, je te disais step by step, mais ça pourrait être aussi en PDF plus traditionnel. Ça pourrait être des fiches de cadenasage aussi qui respectent les règles de cadences. Il peut avoir plein de façons de présenter des instructions de travail, mais moi, je veux vraiment bénéficier de l'intelligence artificielle générative partout dans l'application pour que ça soit simple à éditer, simple à générer, à modifier, à déployer sur le plancher de production. Après ça, je peux mettre des tablettes sur un plancher de production qui accèdent directement aux bonnes instructions au bon moment. Mettons, on a une tablette pour le poste de travail de la machine 1, 2, 3, 4, mais ça l'accède juste sur les instructions de travail de la machine 1, 2, 3, 4. À moins que l'utilisateur, il veuille aller voir d'autres instructions, mais qu'à par défaut, ça lui donne accès plus à ces choses-là. Tandis que si toi, t'es un utilisateur, mettons un gars de maintenance qui se déplace dans l'usine, tu te déplaces avec ta tablette ou ton téléphone, mais c'est sûr que toi, ça va t'intéresser plus les instructions qui sont taggées de maintenance ou des choses comme ça. Je ne sais pas c'est quoi la meilleure façon de... Une usine à l'autre, ça va être différent. Il va avoir des nomenclatures différentes, des façons de catégoriser différentes. Il va falloir qu'on soit capable de traiter des anciennes instructions de travail aussi qui avaient déjà été faites par le passé en PDF ou en différents formats. Il faut pouvoir les transformer en bulk. Tu sais, pas juste une à la fois, mais d'y aller pour voir en bulk. Il faut pouvoir, c'est ça, si mettons, on génère des instructions puis on les aime pas, pouvoir donner du feedback pour que les prochaines fois, ça soit généré mieux, peut-être avoir du versionning comme ça des configurations, je ne sais pas trop, pouvoir peut-être selon l'utilisateur, tu sais, il faut pouvoir partager aussi les instructions de travail. Il faut pouvoir y accéder sans un username password aussi si on souhaite avoir des liens directs partagés. Il y a peut-être des principes de droits, tu sais, les utilisateurs, qui a les droits d'approbation, de création, d'accès, accès à quoi? Il faut tout réfléchir ça, mais il faut que ça reste extrêmement intuitif. Je veux que ce soit une application où tu la vois sur le App Store, mettons, ou le Android Store, tu la télécharges, t'es capable directement de l'utiliser, tu es capable d'aller télécharger la version aussi web ou pas la télécharger, mais accéder à la version web. Tu peux t'abonner, tu peux accéder à des versions pas trop chères, mais que ça soit super intelligent pour essayer de convertir vers, tu sais, puis là, tu peux être ultra intelligent sur

je t'ai donné plein d'idées puis peut-être je t'ai donné des fonctionnalités plus avancées que d'autres, mais moi, c'est super important que ça soit intuitif. OK? Surtout pour les premières fois quand tu te connectes, t'as peut-être pas la version complète, tu peux peut-être pas, je sais pas, capturer des données ou des informations comme ça. C'est ça. Donc, je veux que tu réfléchisses à ce que ça reste simple, OK? Il faut que ce soit une app tellement intuitive, tellement simple. Peut-être que tu peux avoir une version plus avancée si tu payes plus. Tu peux faire plus d'affaires, mais que ça soit bien stratégique pour pas que les interfaces aillent surcharger de plein de fonctions, d'options qu'on ne comprend rien, là, tu sais. Fait que soit stratégique là-dedans, il faut qu'elle soit accompagnante, il faut qu'elle soit bien guidée, que t'aies des... tu sais, il faut avoir, il faut qu'il y ait de la gamification aussi, il faut qu'il y ait des statistiques d'adoption, tu sais. Puis il y a des stratégies de conversion pour pas que les interfaces, elles aillent surcharger de plein de fonctions, d'options qu'on ne comprend rien. Aussi bien sur la version mobile que sur la version web. Puis peut-être, comme je te dis, c'est la même qui est juste encapsulée à toi de déterminer. C'est peut-être moins, je ne sais pas, c'est peut-être moins complexe de supporter juste un code, plutôt que de deux. À toi de décider, mais en même temps, je veux les fonctionnalités natives, que ça soit bien fait. Je veux que si l'utilisateur, mettons, il débute une instruction de travail, il dit OK, là, ça, c'est l'instruction de travail pour la machine 1, 2, 3, 4. C'est pour le nettoyage des rails qu'on fait une fois par mois. Mais tu sais, que ça le comprenne tout seul, ça catégorise bien tout seul ou peut-être qu'après, t'as un formulaire à confirmer certaines catégories ou des choses comme ça. Mais après, t'es capable de le lire, l'analyser, tu peux le modifier, tu peux l'éditer, tu peux le versionner, tu peux le faire approuver. Peut-être que toi, dans ton usine, t'as des approbateurs. Peut-être que dans ton usine, t'as pas d'approbateurs puis la personne qui écrit, c'est la même personne qui est approbateur. Il faut que tu sois capable de t'adapter à ça, de les déployer ensuite, d'y accéder vraiment facilement, d'y accéder. Si le client, lui, s'il faut un username, password find, s'il veut y aller en lien direct, on peut aussi. Il faut être stratégique à pas que les gens utilisent notre application pour générer puis après, ils exportent tout puis ils s'en servent plus. Mais en même temps, les clients, souvent, ça a été bien important pour eux de pouvoir exporter la donnée en PDF parce qu'ils se disent, je ne veux pas tout perdre si je me désabonne. Fait qu'il va avoir juste un milieu entre ces clients qui sont propriétaires de sa donnée. Mais il faut vraiment que ça lui donne le goût de continuer à utiliser l'application. Peut-être que l'opérateur qui utilise l'instruction de travail, il peut donner son feedback aussi de dire, ah ça, c'était pas clair, ça, ça aurait dû être amélioré ou lui-même proposer des nouvelles photos, des nouvelles images, des nouveaux vidéos qui pourraient donner une nouvelle version soit approuvée ou pas selon ce que l'usine a configuré comme paramètres, je ne sais pas trop. Si je te lance plein d'idées puis la plupart, peut-être qu'elles rendent ça trop complexe. Mais toi, il faut que ça soit simple, il faut que ça soit performant. Mais quand je dis simple, ce n'est pas simple d'utilisation, intuitif.

Je pense au fait, si je te dis le média, mettons, c'est un step-by-step, puis que ça a repris des images ou des portions du vidéo qui avaient été utilisées, il faut juste que tu repenses que peut-être que certains clients où ce que c'est pas une image qu'il aurait voulu mettre, c'est un PDF, je sais pas, un dessin, une mise en plan, tu sais, le média d'une étape peut être différentes affaires. Il faut juste que tu penses à ça aussi. Puis peut-être même qu'on voudrait qu'il soit synchronisé sur une TV en même temps. Fait que quand tu changes l'étape sur une tablette, bien ça change aussi le média qui est sur la TV, en gros, je ne sais pas trop. Ultimement, il faudrait connecter ça en WebSocket peut-être si on veut faire ça. Là, je n'étais pas créé le API pour l'instant. Tu peux peut-être en utiliser un en test si tu en as un ou je ne sais pas. Ou peut-être que ça, c'est des fonctionnalités trop avancées. Je veux que ça soit simple.

Finalement, pour l'instant, on ne va pas appeler ça Clip V2, on va appeler ça Clip V3.

Je pense aussi qu'il y a des fonctionnalités comme annoter les images, pour pouvoir les annoter ou les dessiner ou peut-être même à partir des images générer une image par intelligence artificielle, comme de, tu sais, tu peux les annoter, mais générer par intelligence artificielle. Fait qu'au lieu, puis tu sais, ça peut même être du genre de AR par-dessus l'image qui a été générée avec les routes de génération d'images ou des flèches qui sont mis par-dessus mais de façon automatique, c'est sûr que ça consomme plus de crédits AI là. Puis il faut être sûr que tout, à chaque fois qu'on appelle le AI, t'a bien les coûts qui soient déduits de ton nombre de crédits AI que t'as par mois, mettons. Puis que tu peux acheter d'autres banques de crédits quand t'as plus de usage ou tu peux passer à un plan supérieur. Je sais pas trop là. Encore une fois, c'est peut-être des fonctionnalités plus avancées qui ne sont pas nécessaires pour tout le monde. Faut que tu choisisses bien quelles fonctionnalités. Tu sais, il faut vraiment que tu sois intelligent dans ton abonnement pour que l'outil reste simple au départ dans un produit d'appel. Puis à chaque fois que le client se dit « Ah, c'est dommage qu'il n'y ait pas telle affaire » mais en fait, « Ah oui, il le voit mais il doit le débloquer ou il peut peut-être l'essayer pendant un bout de temps ou peut-être qu'il peut se le faire proposer à des moments stratégiques selon son utilisation ou peut-être qu'il peut débloquer dans un plan supérieur ou juste acheter ce fonc... Moi, je veux juste trouver les stratégies les plus intelligentes, modernes, 2026-2027 avec, tu sais, vraiment d'intelligence, selon l'utilisation pour réussir à convertir le plus de ARR possible pour ce produit-là, d'avoir le plus bas taux des abonnements possibles. On ne veut pas de churn. C'est pour ça qu'on veut bien monitorer l'utilisation, que ce soit pour ceux qui créent des instructions à l'intérieur du département de méthode que ceux qui l'utilisent, etc.

garde les interfaces simples, pas trop de questions en même temps dans la même interface, d'être bien guidé. Si t'as besoin d'une configuration initiale, ben, t'as un outil, t'as une entrevue guidée où tu peux répondre par la voix avec un assistant live ou tu peux répondre par du chat ou tu peux répondre question par question plus par du texte comme un formulaire. Je ne sais pas trop, là, je te donne des idées encore une fois peut-être de merde là, mais je veux que ça soit guidé, je ne veux pas qu'il y ait trop d'informations en même temps, je veux que ça soit intuitif. Je veux qu'il y ait différents modes de vue, tu sais, pour que ça plaise aux différents goûts, mais encore une fois, il faut trouver une manière d'aller chercher du revenu récurrent. Il faut trouver une manière de répondre aux besoins de tout le monde, mais il faut que ça reste simple.

Il faut que ça soit self-serve. Tu sais que tu t'abonnes, t'es capable de te configurer. T'as pas eu besoin d'accompagnement, personne qui tient par la main. Peut-être même qu'il y a des fois des travailleurs dans l'usine qui vont s'abonner pour eux-mêmes, puis après vont convaincre l'organisation de déployer ça à plus grande échelle. Peut-être qu'on peut même avoir des stratégies où on vise le travailleur que c'est lui qui va... Tu sais, comme un peu ChatGPT, si la compagnie ne veut pas payer le ChatGPT et ben des employés qui ont décidé de se le payer eux-mêmes parce que ça leur sert trop. Mais on peut avoir ce principe-là aussi un peu en produit d'appel, puis après ça, là, ça encourage à le déployer pour l'ensemble de l'organisation si tu veux partager des instructions de travail avec d'autres membres de ton organisation ou des affaires de même. Puis là, c'est sûr que c'est peut-être des prix différents ou peut-être t'es moins limité, tu peux en faire plus. Peut-être que tu peux voir aussi, c'est peut-être pas juste les tokens, les crédits AI qui viennent te limiter, c'est peut-être aussi le nombre d'instructions, le nombre de postes de travail ou de... je sais pas trop. Les statistiques aussi, je veux avoir des stats, je veux que l'utilisateur puisse voir ses stats, l'adoption, l'utilisation, le retour sur investissement. Je veux que selon le type de personna dans l'usine, l'expérience soit peut-être adaptée aussi, mais là, encore une fois, peut-être que j'en demande trop puis que ça va complexifier là. Moi, pour moi, il faut que ce soit simple, intuitif. Il faut que ce soit l'application la plus simple possible d'utilisation. Tu la télécharges sur l'App Store puis tu peux directement l'utiliser sans même avoir été sur la version web encore pour me dire ah merde, j'aimerais ça pouvoir la déployer sur... tu sais, la voir en desktop, ah OK, oui, je vois sur l'application web comment y accéder ou vice versa, l'application web t'encourage à aller télécharger la version mobile, tu sais, des affaires de même. Ou tu peux même déployer des codes QR si tu ne veux pas déployer une tablette à chaque poste de travail, mais tu veux que l'opérateur il scanne juste le code QR puis boom, ça lui pop sur son device, soit en partagé, tu sais, des liens partagés qui n'ont pas besoin de username et password, mais en même temps, si on avait voulu faire des modèles d'affaires où il y a des users ou un nombre de users max, des affaires de même, peut-être que ça nous bloque. Peut-être selon la version pro Enterprise ou individuelle ou tu sais, je ne sais pas trop. À toi de voir.

## Intention

CLIP V3 fait passer le savoir-faire d'un expert, de son téléphone au plancher, en quelques minutes.
On filme, on parle, on photographie — ou on dépose ses vieux PDF et documents Word — et l'IA rédige
une instruction de travail claire et visuelle : une action par étape, le bon bout de vidéo, la
bonne photo, les mises en garde au bon moment. L'humain relit, corrige d'un geste, publie.

Ensuite, l'instruction vit : chaque opérateur la trouve au bon poste (tablette de poste, code QR,
lien direct, sans compte), la suit étape par étape, la fait lire à voix haute, signale ce qui
n'est pas clair. Ces retours reviennent à la personne qui l'a écrite, qui corrige avec l'IA et
publie une nouvelle version, approuvée ou non selon les règles de l'usine. C'est cette boucle
vivante — capturer, publier, consulter, améliorer — qui fait la valeur du produit, bien plus que
le document lui-même.

**On saura que c'est réussi quand** une première instruction utilisable sort en moins de
10 minutes après l'inscription, qu'un opérateur trouve la sienne en un toucher, et que les
instructions publiées sont réellement consultées au plancher semaine après semaine.

## Pour qui

### Mélanie — technicienne en méthodes (rédactrice)
- **Maturité numérique :** moyenne à élevée. **Appareils :** téléphone au plancher, PC au bureau.
- **Ce qu'elle cherche :** documenter vite des dizaines de postes, garder les instructions à jour,
  ne plus jamais refaire une mise en page dans Word.
- **Ce qui l'en empêche aujourd'hui :** rédiger prend des heures, les photos sont éparpillées, les
  cartables ne sont jamais à jour, personne ne les lit.
- **User stories :**
  - Je filme Jacques qui explique le nettoyage des rails de la machine 1234, j'ajoute deux photos
    et une note vocale, je touche « Générer » et j'obtiens une instruction déjà classée au bon poste.
  - Je corrige une étape d'un mot à l'IA (« simplifie », « ajoute les gants ») et je publie.
  - Je dépose 40 vieux PDF d'un coup et je les retrouve en brouillons structurés.
  - Je vois qu'un opérateur trouve l'étape 3 pas claire, je la corrige avec son commentaire.

### Kevin — opérateur au poste (lecteur sans compte)
- **Maturité numérique :** faible ; lit parfois difficilement. **Appareils :** tablette du poste
  ou son propre téléphone (code QR). **Environnement :** debout, gants, bruit, pressé.
- **Ce qu'il cherche :** faire la tâche correctement, du premier coup, sans demander.
- **User stories :**
  - Je touche l'instruction de mon poste et je suis les étapes avec de grosses images et la vidéo
    au bon moment ; je fais lire l'étape à voix haute.
  - Je signale en deux touchers que l'étape 3 n'est pas claire, avec une photo si je veux.
  - Je demande à voix haute « c'est quoi le couple de serrage ? » et j'ai la réponse.

### Luc — technicien de maintenance (lecteur mobile, parfois rédacteur)
- **Maturité numérique :** moyenne. **Appareils :** téléphone, tablette ; se déplace dans l'usine.
- **Ce qu'il cherche :** les procédures de maintenance et de cadenassage de l'équipement devant lui.
- **User stories :**
  - Je scanne le code QR de la presse et je vois d'abord ses procédures de maintenance et sa fiche
    de cadenassage.
  - Je capture une réparation que je suis le seul à savoir faire, pour qu'elle devienne une
    instruction.

### Nathalie — superviseure, qualité ou SST (approbatrice)
- **Maturité numérique :** moyenne. **Appareils :** PC, téléphone.
- **Ce qu'elle cherche :** que rien de faux ou de dangereux ne soit publié, sans ralentir les équipes.
- **User stories :**
  - Je vois en ouvrant l'app les instructions qui attendent mon approbation, avec ce qui a changé.
  - J'approuve, ou je demande une correction par un commentaire.
  - Je suis alertée tout de suite quand un opérateur signale un danger.

### Daniel — directeur d'usine ou responsable de l'amélioration continue (administrateur)
- **Maturité numérique :** moyenne. **Appareils :** PC surtout.
- **Ce qu'il cherche :** standardiser le travail, former plus vite, prouver le retour sur
  investissement.
- **User stories :**
  - Je configure l'usine en trois questions, notre logo et notre couleur, et notre standard de
    rédaction (« on commence toujours par la sécurité »).
  - Je vois combien de postes sont couverts, ce qui est consulté, ce qui est signalé, et le temps
    gagné.
  - J'invite mes rédacteurs et je choisis qui approuve.

### Le champion — un employé qui s'abonne seul
- Il découvre CLIP sur l'App Store, documente ses propres tâches avec le plan Solo, partage par
  lien et code QR, puis convainc son usine de passer au plan Usine pour travailler en équipe.

## Ce qui ne doit pas changer

1. **Créer = un geste.** « Nouvelle instruction » → capturer → « Générer ». Aucune configuration
   préalable n'est exigée ; tout a une valeur par défaut sensée.
2. **Le lecteur pas-à-pas se comprend sans lire** : média géant, une action par étape, gros
   boutons (≥ 44 px, idéalement bien plus), pictogrammes d'EPI, lecture à voix haute.
3. **L'opérateur n'a jamais besoin d'un compte** : tablette de poste, code QR et lien direct.
4. **L'IA propose, l'humain dispose** : rien n'est publié sans un geste humain ; le chemin manuel
   existe partout.
5. **Des médias légers** : capture contrôlée (vidéo 720p, photos ≤ 1920 px) ; une vidéo trop
   lourde est optimisée automatiquement.
6. **Un écran = une intention, une seule action primaire.** L'avancé se cache, se regroupe ou se
   débloque ; il ne s'empile jamais sur l'essentiel.
7. **Les lecteurs ne sont jamais facturés au siège** : on vend la création, les postes et l'IA,
   pas la consultation. C'est ce qui permet l'adoption sur tout le plancher.
8. **Le client possède ses données** : chaque instruction s'exporte en PDF et en JSON, à tous les
   plans.
9. **Une seule base de code d'interface** : l'app web est l'interface partout ; la coquille Expo
   n'ajoute que le natif (capture, scan, envoi, achats des magasins).

## Ce qui est hors de portée

- Un traitement de texte à la Word (mise en page libre) : la structure est imposée, c'est elle qui
  rend les instructions lisibles au plancher.
- Un LMS (cours libres, catalogue de formations, examens certifiants, palmarès) : sans module, on
  vérifie la compréhension d'une instruction en quelques questions, à la fin, au poste, et on garde
  la trace de qui est formé, à quel poste (la matrice de la page Équipe). Le module Académie
  (demandé en novembre 2026) va plus loin, toujours à partir des instructions : le parcours d'un
  poste, ce sont ses instructions publiées ; un superviseur valide sur le terrain ; la qualification
  se revalide ; la couverture par quart et le registre servent l'audit. Il ne crée pas de cours.
- Un MES ou un ERP (ordres de fabrication, temps de cycle) : on se branche sur leurs numéros
  (codes, étiquettes, QR), on ne les remplace pas.
- Un logiciel qualité complet (cartes de contrôle, SPC, non-conformités et actions correctives) : à
  une étape, on relève une valeur, on juge l'écart, on note ce qui a été fait et on garde la trace.
  Le module Relevés (novembre 2026) montre la tendance de chaque mesure avec ses limites et exporte
  le registre pour le tableur ; l'analyse statistique (capabilité, cartes de contrôle) et le suivi
  des actions restent ailleurs.
- Un outil de BI ou de surveillance des personnes : les rapports (novembre 2026) répondent à des
  questions de l'usine (combien de temps, qui a fait quoi, où ça accroche, qui est formé) ; les
  personnes y vont par ordre alphabétique, comme dans un registre, jamais en palmarès ni en note de
  performance. Le code calcule les chiffres ; l'IA les commente, elle n'en invente pas.
- La génération de vidéos par l'IA.
- Le hors ligne complet : la capture tolère un réseau instable, la consultation demande le réseau.

## Versions de référence

- v0.1 — première version alignée sur la vision (ce dépôt, branche `claude/eager-euler-wp2u8b`).
