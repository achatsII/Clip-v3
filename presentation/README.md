# Présentation de Clip (SlideFabrik)

15 slides animées qui présentent Clip avant une démo : le constat, la capture, la génération par
l'IA, puis les principales fonctions (pas-à-pas, IA, annotations, traduction, import, approbation,
déploiement au poste, échéance, PDF). Design de l'app (`apps/web/src/app/globals.css`).

- `Presentation-Clip.html` : à ouvrir dans un navigateur pour présenter (← →, `O`, `F`) ; il lui faut
  Internet (images hébergées, police Inter).
- `Presentation-Clip.json` : à importer dans SlideFabrik (avec sa direction artistique et les notes).

## Reconstruire

```bash
LUCIDE_DIR=<dossier icons de lucide-static> node build/build.mjs --local   # aperçu local (assets/)
node build/measure.mjs measure && node build/build.mjs --local            # recale le curseur
node build/build.mjs                                                       # version hébergée (build/hosted.json)
```

Puis, avec le skill slidefabrik-export : `validate-master-html.mjs`, `html-to-json.mjs --da build/da.md
--prompt-file build/demande.txt`, `node build/notes.mjs <json>` (notes du présentateur), `validate.mjs`.

Les photos sont générées par IA (Higgsfield) : illustratives, pas une usine réelle. La slide
« Garder à jour » (date de révision et alerte) montre une fonction qui n'existe pas encore dans l'app.
