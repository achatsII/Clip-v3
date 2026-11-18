#!/usr/bin/env bash
# Les médias des scènes de la version anglaise, comme scripts/medias.sh du film français, sans rien écrire dans motion/.
#   bash scripts/medias.sh apercu   → clips 1280 × 720 légers (artefact ≤ 16 Mo) ; photos : liens vers motion/clips/assets
#   bash scripts/medias.sh export   → clips 1920 × 1080 (VP9 CRF 20) ; photos des écrans et cartable en pleine résolution
#                                     depuis les originaux Higgsfield (inputs/gen, adresses dans plan.json « remote »)
# Les clips IA sont coupés à la portion que chaque scène anglaise joue, avec une marge (les scènes anglaises durent un
# peu plus que les françaises : 01 3,75 s, 09 jusqu'à 2,6 s de cadenas).
# Les photos où l'interface est incrustée (filmer.jpg, poste-tablette.jpg) sont propres à la version anglaise :
# scripts/ecrans.sh les refait (aperçu et export).
set -e
cd "$(dirname "$0")/.."
SK=${SKILL:-/root/.claude/plugins/synced/032cda44-35a7-40ff-bc4b-e5f9bead7b20_4c043618-6207-43bd-bea8-8d3dbf921d24/videos-produit/skills/motion-animation-reel}
PY=${PYTHON:-python3}
if [ "$1" = export ]; then Q="--W 1920 --H 1080 --crf 20"; elif [ "$1" = apercu ]; then Q="--W 1280 --H 720 --crf 39"; else
  echo "usage : bash scripts/medias.sh apercu|export" >&2; exit 1; fi
while read f start dur; do
  $PY "$SK/scripts/media.py" webm "inputs/gen/$f.mp4" "clips/assets/$f.webm" $Q --start "$start" --dur "$dur" < /dev/null
done <<'LIST'
c1-expert 0 4.0
c2-brosse 0.6 3.0
c3-usine 0 4.7
c4-huile 0.3 1.9
c5-cadenas 0.2 2.9
LIST
# un fichier de motion/clips/assets n'est jamais réécrit : on retire le lien, puis on écrit le fichier (ou le lien revient)
for n in cartable cadenas rails-brosse rails-huile panneau; do
  rm -f "clips/assets/$n.jpg"
  if [ "$1" = export ]; then
    W=1600; [ "$n" = cartable ] && W=2400
    ffmpeg -v error -y -i "inputs/gen/$n.png" -vf "scale=$W:-2:flags=lanczos" -q:v 2 "clips/assets/$n.jpg"
  else
    ln -s "../../../clips/assets/$n.jpg" "clips/assets/$n.jpg"
  fi
done
echo "MEDIAS $1"
