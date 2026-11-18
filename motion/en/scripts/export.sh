#!/usr/bin/env bash
# Le MP4 du film anglais, en pleine qualité, seulement quand l'utilisateur le demande (sa phrase en argument) :
#   bash scripts/export.sh "<la demande d'export de l'utilisateur>"        (depuis motion/en/)
# 1. médias pleine qualité (clips 1080p, photos pleine résolution, écrans incrustés en 2688 px) ;
# 2. export.py : rendu image par image avec flou de mouvement, voix + musique + effets → ../out-en/clip-film-en.mp4 et .srt ;
# 3. une copie 1280 × 720 pour les téléphones (H.264, faststart, son gardé) → ../out-en/clip-film-en-720p.mp4 ;
# 4. les médias légers de l'aperçu reviennent (l'artefact tient sous 16 Mo).
# Demande Python avec numpy et Pillow (PYTHON=…), Node et le Chromium de Playwright, ffmpeg. Long : ~30 à 60 min sur 4 cœurs.
set -e
cd "$(dirname "$0")/.."
[ -n "$1" ] || { echo "usage : bash scripts/export.sh \"<la demande d'export de l'utilisateur>\"" >&2; exit 1; }
SK=${SKILL:-/root/.claude/plugins/synced/032cda44-35a7-40ff-bc4b-e5f9bead7b20_4c043618-6207-43bd-bea8-8d3dbf921d24/videos-produit/skills/motion-animation-reel}
export SKILL=$SK PYTHON=${PYTHON:-python3}
for n in cartable cadenas panneau rails-brosse rails-huile; do   # les originaux Higgsfield (plan.json « remote »)
  [ -f "inputs/gen/$n.png" ] || curl -sSf -o "inputs/gen/$n.png" "$($PYTHON -c "import json;print(json.load(open('plan.json'))['remote']['inputs/gen/$n.png'])")"
done
bash scripts/medias.sh export
bash scripts/ecrans.sh 2688
$PYTHON "$SK/scripts/export.py" plan.json --demande "$1"
ffmpeg -v error -y -i ../out-en/clip-film-en.mp4 -vf "scale=1280:720:flags=lanczos" -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -c:a copy -movflags +faststart ../out-en/clip-film-en-720p.mp4
bash scripts/medias.sh apercu
bash scripts/ecrans.sh
echo "EXPORT_EN ../out-en/clip-film-en.mp4 · ../out-en/clip-film-en-720p.mp4 · ../out-en/clip-film-en.srt"
