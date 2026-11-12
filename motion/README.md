# Film de présentation de Clip (~74 s, 16:9)

Fait avec le skill `videos-produit:motion-animation-reel`, sur le modèle du film K2 V2
(`intelligence-industrielle/k2-cadence`, `motion/campagne`). Les écrans de l'app sont ceux du deck
(`presentation/build`), repris par `build-ui.mjs` → `clips/_ui*.js`.

- `brief.md`, `script.md`, `plan.md` : la demande, le script validé, le plan des scènes.
- `voix.json` : la voix (Gemini Aoede, québécois, énergique), vérifiée par Whisper ; `work/timeline.json` : l'heure de chaque mot.
- `plan.json` : les 15 scènes (`clips/NN-*.html`), la distribution, les générations Higgsfield (`media_jobs`, `remote`).
- `couts.json` : crédits Higgsfield et coût de la voix.

## Reconstruire l'aperçu

```bash
# médias Higgsfield : télécharger les adresses de plan.json « remote » dans inputs/gen/, puis
bash clips-webm.sh apercu            # clips légers (aperçu ≤ 16 Mo)
LUCIDE_DIR=<icons de lucide-static> node build-ui.mjs
python3 <skill>/scripts/timeline.py cues voix.json --whisper
python3 <skill>/scripts/apercu.py plan.json
```

Avant l'export MP4 : `bash clips-webm.sh export` (clips en 1920 × 1080), et remettre les grandes photos de
`clips/assets/hq/` (ou les refaire depuis `inputs/gen/`).

Photos et clips générés par IA : usine, personnes et données illustratives. La date d'échéance n'apparaît
que dans le deck (fonction pas encore dans l'app).
