#!/usr/bin/env bash
# Les clips IA, coupés à la portion que chaque scène joue.
#   bash clips-webm.sh apercu   → 1280 × 720, léger (aperçu en artefact, ≤ 16 Mo)
#   bash clips-webm.sh export   → 1920 × 1080, qualité finale (à lancer avant export.py)
set -e
cd "$(dirname "$0")"
SK=${SK:-/root/.claude/plugins/synced/032cda44-35a7-40ff-bc4b-e5f9bead7b20_4c043618-6207-43bd-bea8-8d3dbf921d24/videos-produit/skills/motion-animation-reel}
if [ "$1" = export ]; then Q="--W 1920 --H 1080 --crf 28"; else Q="--W 1280 --H 720 --crf 37"; fi
while read f start dur; do
  python3 "$SK/scripts/media.py" webm "inputs/gen/$f.mp4" "clips/assets/$f.webm" $Q --start "$start" --dur "$dur" < /dev/null
done <<'LIST'
c1-expert 0 3.3
c2-brosse 0.6 2.8
c3-usine 0 4.5
c4-huile 0.3 1.7
c5-cadenas 0.2 2.3
LIST
