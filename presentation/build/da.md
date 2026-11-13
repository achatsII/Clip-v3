# Direction artistique — Présentation de Clip

Le deck reprend le design system de l'application Clip (apps/web/src/app/globals.css) : « verre »
clair sur un fond à orbes bleus, typographie Inter très grasse, dégradé bleu pour l'action et violet
pour l'IA. Chaque slide montre l'interface réelle de l'app, animée, à côté d'un texte court.

## Canevas

- 16:9, 1920 × 1080, échelle 1 sur `.sf-canvas`. Tout le contenu d'une slide est dans `<div class="stage">`.
- Fond clair `.bg` (base #f8f9fa, dégradé #f1f5f9 → #ffffff → #f8fafc, trois orbes floutés
  rgba(59,130,246,.3), rgba(6,182,212,.3), rgba(56,189,248,.2), grain léger). Fond de nuit
  `.bg.night` (#0a0f18) réservé à la clôture.
- Marque en haut à gauche (`.brand` : logo Clip 34 px + « CLIP », 96 px du bord, 64 px du haut).

## Palette (règle d'emploi)

| Rôle | Valeur | Emploi |
|---|---|---|
| Action, accent | dégradé 135° #00c6ff → #0078ff, ombre 0 10px 20px rgba(0,120,255,.3) | bouton principal, numéro d'étape, mot mis en relief dans un titre (`<em>`) |
| IA | dégradé 135° #9b2cfa → #2c62fa, ombre violette | tout ce que fait l'IA : assistant, « Annoter par IA », sur-titre des slides IA |
| Bleu fort / doux | #0056d6 / #e5f1ff | sur-titres, élément actif de la navigation, encadré « Points clés » |
| Danger / cadenassage | dégradé #FF2B5E → #FF6B00 | mises en garde « Danger », cadenas, statistique d'alerte |
| Attention | dégradé #FFC800 → #FF9F00, texte #0f172a | mises en garde « Attention » |
| Succès | #18c480 / #10b981 | coches, « Brouillon créé », publication |
| Encre | #0f172a ; secondaire #64748b ; tertiaire #94a3b8 | textes |

## Typographie

- Inter (Google Fonts), repli `ui-sans-serif, system-ui`.
- Titre `.title` : 78 px, graisse 900, interlettrage -0,055em, interligne 0,98 ; un ou deux mots en
  `<em>` (texte en dégradé).
- Sur-titre `.eyebrow` : 17 px, 900, majuscules, interlettrage 0,14em, couleur #0056d6, précédé d'une
  tuile d'icône 40 px en dégradé (`<i>` + icône Lucide).
- Sous-titre `.sub` : 27 px, 700, #64748b ; les mots clés en `<b>` (#0f172a, 900).
- Dans les maquettes, les tailles de l'app : 13–18 px, 700–900.

## Composition

- Slide de contenu : colonne de texte `.copy` à gauche (96 px, largeur 600 px, centrée verticalement),
  maquette `.mk` à droite (x ≥ 730 px), jamais de chevauchement.
- Verre : `.glass-panel` (blanc 72 %, flou 16 px), `.glass-card` (blanc 55 %, flou 24 px),
  `.glass-float` (blanc 95 %, ombre portée) ; rayons 16 à 40 px ; bordures blanches translucides.
- Fenêtre d'app `.win` (rayon 26 px, barre à trois pastilles, barre latérale `.side` de l'app),
  tablette `.tablet` (rayon 46 px), téléphone `.phone` (rayon 54 px) : l'écran montre toujours
  l'interface de Clip, jamais un écran noir.
- Photos (générées, illustratives) : plein cadre avec dégradé sombre `.shade-l` ou `.shade-b`, ou en
  carte arrondie (rayon 30–40 px) ; elles bougent lentement (`.a-kb`).
- Une seule action principale par maquette (le bouton en dégradé), les autres en verre.

## Patrons

```html
<!-- Slide de contenu -->
<div class="stage">BG + brand
  <div class="copy">
    <div class="eyebrow a-rise" style="--d:.1s"><i>[icône]</i>Traduire</div>
    <h2 class="title a-rise" style="--d:.22s">Traduisez en <em>quelques clics</em>.</h2>
    <p class="sub a-rise" style="--d:.38s">Une phrase, <b>un mot clé</b>.</p>
  </div>
  <div class="mk" style="left:740px;top:96px;width:1120px;height:880px"> maquette + curseur </div>
</div>

<!-- Photo plein cadre -->
<div class="stage"><div class="photo a-kb" style="background-image:url(…)"></div><div class="shade-b"></div>
  <div class="cap on-dark"> sur-titre + titre + sous-titre en bas à gauche </div></div>
```

## Mouvement

- Animations CSS seulement, qui redémarrent à chaque entrée sur la slide ; l'état final est l'état de
  repos (le PDF l'imprime, sans curseur). Classes : `.a-rise`, `.a-pop`, `.a-fade`, `.a-right`,
  `.a-out` (disparaît), `.a-blip` (paraît puis disparaît, `--len`), `.a-type` (frappe), `.a-draw`
  (trait SVG), `.a-press` (bouton enfoncé), `.a-bar` (barre qui se remplit) ; délai par `--d`.
- Le curseur `.cur` (souris, ou doigt `.is-touch` sur tablette et téléphone) se déplace et clique sur
  le vrai bouton, au moment où l'interface réagit ; une séquence dure 8 à 11 s, puis l'écran se pose.

## Navigation

Gabarit Master HTML de SlideFabrik : `var currentSlide`, `var totalSlides`, `updateSlide`,
`nextSlide`, `prevSlide`, `goToSlide` (0-indexé) et le bloc `#sf-ui` sont intouchables.

## Interdits

- Aucune couleur hors palette, aucun autre dégradé ; aucune autre police ; aucune icône hors Lucide.
- Pas de Tailwind ni de bibliothèque : le CSS est dans la page.
- Pas d'interface inventée : libellés exacts de l'app (français du Québec).
- Pas de texte dans les photos, pas d'écran d'appareil noir, pas de bloc gris à la place d'une image.
- Pas de classe contenant « slide », « controls », « deck » ; pas de trait d'union dans une étiquette de slide.
- Pas plus d'une idée par slide, pas plus de deux lignes de sous-titre.
