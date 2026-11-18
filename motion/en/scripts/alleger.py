"""Allège les photos composées (l'interface dans la vitre) pour l'aperçu : screen_composite.py les écrit en qualité 92,
deux fois le poids des photos d'aperçu du film français ; l'artefact doit tenir sous 16 Mo. Réenregistre en qualité 80
(le poids du film français) et met à jour work/ecrans.json (la taille sert à reconnaître une vitre déjà remplie).
usage (depuis motion/en/) : python3 scripts/alleger.py clips/assets/filmer.jpg clips/assets/poste-tablette.jpg"""
import json, pathlib, sys
from PIL import Image

reg_f = pathlib.Path('work/ecrans.json'); R = json.load(open(reg_f, encoding='utf-8')) if reg_f.exists() else {}
for f in map(pathlib.Path, sys.argv[1:]):
    before = f.stat().st_size
    Image.open(f).convert('RGB').save(f, quality=80, optimize=True, progressive=True)
    if f.name in R: R[f.name]['taille'] = f.stat().st_size
    print(f'ALLEGE {f} {before / 1e3:.0f} → {f.stat().st_size / 1e3:.0f} ko')
json.dump(R, open(reg_f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
