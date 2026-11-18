#!/usr/bin/env bash
# Les deux photos où l'app est dans un appareil (le téléphone de Mélanie, la tablette du poste), avec l'interface
# ANGLAISE dans la vitre : sur la photo d'origine écran éteint (inputs/gen, adresses dans plan.json « remote »), on pose
# l'écran tel que la plongée y arrive (scène 06 : la caméra de Clip ; scène 13 : le lecteur à l'étape 2).
#   bash scripts/ecrans.sh            → photos d'aperçu (1800 px, comme le film français)
#   bash scripts/ecrans.sh 2688       → pleine résolution, pour l'export
# Les coins de chaque vitre sont ceux du film français (ECRAN_TELEPHONE, ECRAN_TABLETTE de clips/_shared.js).
# À refaire si l'écran d'arrivée change (un libellé, une couleur) : la photo montre toujours l'état d'arrivée.
set -e
cd "$(dirname "$0")/.."
SK=${SKILL:-/root/.claude/plugins/synced/032cda44-35a7-40ff-bc4b-e5f9bead7b20_4c043618-6207-43bd-bea8-8d3dbf921d24/videos-produit/skills/motion-animation-reel}
PY=${PYTHON:-python3}
LONG=${1:-1800}
$PY "$SK/engine/build.py" work/sonde-ecrans clips/06-filmer.html clips/13-poste.html --timeline work/timeline.json --plan plan.json --stand-in > /dev/null
# l'instant de l'arrivée : 0,24 s après la fin de la plongée (couche de l'interface entièrement là)
T06=$($PY -c "import json;P=json.load(open('plan.json'));TL=json.load(open('work/timeline.json'));s=[s for s in P['scenes'] if s['id']=='06'][0];w=[x for x in TL['words'] if x[3]=='v06' and x[2].startswith('Clip')][0];print(round(w[0]-s['in']+0.2+0.24,3))")
node "$SK/engine/beats.js" work/sonde-ecrans/06-filmer.html work/ecran-cam.png "$T06" --el "#Lcam .ui"
node "$SK/engine/beats.js" work/sonde-ecrans/13-poste.html work/ecran-tablette.png 1.4 --el "#Ltab .scr"
rm -f clips/assets/filmer.jpg clips/assets/poste-tablette.jpg
$PY "$SK/scripts/screen_composite.py" plongee inputs/gen/filmer-noir.png work/ecran-cam.png clips/assets/filmer.jpg \
  --name TELEPHONE --long "$LONG" --quad "550.1,896.9 985.0,895.6 981.2,1111.5 544.6,1109.3"
$PY "$SK/scripts/screen_composite.py" plongee inputs/gen/poste-tablette-noire.png work/ecran-tablette.png clips/assets/poste-tablette.jpg \
  --name TABLETTE --long "$LONG" --quad "784.7,485.5 1606.5,485.4 1605.7,980.0 782.6,983.7"
# l'aperçu : le poids des photos d'aperçu du film français (l'artefact tient sous 16 Mo)
if [ "$LONG" -le 1800 ]; then $PY scripts/alleger.py clips/assets/filmer.jpg clips/assets/poste-tablette.jpg; fi
echo "ECRANS $LONG px"
