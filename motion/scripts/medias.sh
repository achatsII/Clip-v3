#!/usr/bin/env bash
# Bascule les médias des scènes entre l'aperçu (léger : l'artefact doit tenir sous 16 Mo) et l'export (pleine qualité).
#   bash scripts/medias.sh export   → clips 1920 × 1080 (VP9 CRF 20), photos et affiches pleine résolution, photos de
#                                     l'interface en 1600 px depuis les originaux Higgsfield (inputs/gen)
#   bash scripts/medias.sh apercu   → les versions légères commitées, clips 1280 × 720
# Lancer `export` avant export.py, puis `apercu` après (l'aperçu dira alors que le MP4 diffère : seuls les médias changent).
set -e
cd "$(dirname "$0")/.."
if [ "$1" = export ]; then
  bash clips-webm.sh export
  cp clips/assets/hq/*.jpg clips/assets/            # affiches des clips, cartable, filmer et poste-tablette (vitres incrustées)
  for n in cadenas rails-brosse rails-huile panneau; do
    ffmpeg -v error -y -i "inputs/gen/$n.png" -vf scale=1600:-2:flags=lanczos -q:v 2 "clips/assets/$n.jpg"
  done
  echo "MEDIAS export"
elif [ "$1" = apercu ]; then
  git checkout -- clips/assets/*.jpg
  bash clips-webm.sh apercu
  echo "MEDIAS apercu"
else
  echo "usage : bash scripts/medias.sh export|apercu" >&2; exit 1
fi
