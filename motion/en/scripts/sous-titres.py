"""Écrit les sous-titres du film anglais dans les 17 langues du site, tous calés sur la voix ANGLAISE :
../out-en/subtitles/clip-film-en.<langue>.vtt (depuis motion/en/ : python3 scripts/sous-titres.py).

Le texte et le découpage viennent de sous-titres.json ; l'heure de chaque réplique vient de work/timeline.json :
début du premier mot ; fin du dernier + 0,15 s, prolongée dans le silence qui suit jusqu'au temps de lecture de la
plus longue traduction (1,2 s de plus au plus), sans passer la coupe de scène suivante ni s'approcher à moins de
0,08 s de la réplique suivante ; l'appel final reste 2,5 s avec la carte. Mêmes heures dans toutes les langues.
Contrôle chaque langue : deux lignes au plus, longueur des lignes (≈ 42 signes en alphabet latin, moins en chinois,
japonais, coréen et thaï), vitesse de lecture. À relancer après tout changement de la voix (timeline.py, musique.py)."""
import json, pathlib, re, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT.parent / 'out-en' / 'subtitles'
S = json.load(open(ROOT / 'sous-titres.json', encoding='utf-8'))
TL = json.load(open(ROOT / 'work' / 'timeline.json', encoding='utf-8'))
P = json.load(open(ROOT / 'plan.json', encoding='utf-8'))
D = max(s['out'] for s in P['scenes'])

CUTS = sorted(s['in'] for s in P['scenes'] if s['in'] > 0)


def width(line, lang):
    """Longueur affichée d'une ligne : un idéogramme ou une syllabe hangul compte pour un, une lettre latine pour un
    demi en chinois, japonais et coréen ; en thaï, les voyelles et tons combinés ne comptent pas."""
    if lang in ('zh', 'ja', 'ko'):
        return sum(1 if unicodedata.east_asian_width(ch) in 'WF' else 0.5 for ch in line)
    if lang == 'th':
        return sum(1 for ch in line if unicodedata.category(ch) not in ('Mn', 'Mc'))
    return len(line)


LIMITE = {'zh': 18, 'ja': 17, 'ko': 22, 'th': 40}
VITESSE = {'zh': 7, 'ja': 7, 'ko': 9, 'th': 14}   # signes lus par seconde ; 17 en alphabet latin

words = {}
for w in TL['words']: words.setdefault(w[3], []).append(w)
cues = []
for k, c in enumerate(S['cues']):
    ws = words[c['p']]; a, b = c.get('mots', [0, len(ws) - 1])
    # le temps de lecture que demande la plus longue des traductions de cette réplique
    lire = max(sum(width(ln, lg) for ln in S['textes'][lg][k].split('\n')) / VITESSE.get(lg, 17) for lg in S['textes'])
    cues.append([ws[a][0], ws[b][1], ' '.join(w[2] for w in ws[a:b + 1]), lire])
for i, c in enumerate(cues):
    t0, said_end, _, lire = c
    nxt = cues[i + 1][0] if i + 1 < len(cues) else D
    cut = next((x for x in CUTS if said_end < x < nxt), None)          # une coupe dans le silence qui suit
    fin = max(said_end + 0.15, t0 + max(lire, 1.2))                     # au moins le temps de lire, et 1,2 s
    if i + 1 == len(cues): fin = max(fin, min(t0 + 2.5, D - 0.2))        # l'appel final reste avec la carte
    c[1] = round(min(fin, nxt - 0.08, (cut - 0.04) if cut else 1e9, D - 0.2, said_end + 1.2 if i + 1 < len(cues) else 1e9), 3)
    c[1] = max(c[1], round(min(said_end + 0.15, nxt - 0.08), 3))
    del c[3]

ts = lambda t: f'{int(t // 60):02d}:{t % 60:06.3f}'
OUT.mkdir(parents=True, exist_ok=True)
bad = 0
for lang, textes in S['textes'].items():
    if len(textes) != len(cues): sys.exit(f'{lang} : {len(textes)} répliques pour {len(cues)} répliques de la voix')
    lim = LIMITE.get(lang, 43); worst = 0; fast = 0
    blocks = ['WEBVTT', '']
    for (t0, t1, _), txt in zip(cues, textes):
        lines = txt.split('\n')
        if len(lines) > 2: print(f'ERREUR {lang} : plus de deux lignes : {txt!r}'); bad += 1
        for ln in lines:
            w = width(ln, lang); worst = max(worst, w)
            if w > lim: print(f'ERREUR {lang} : ligne trop longue ({w:.0f} > {lim}) : {ln!r}'); bad += 1
        cps = sum(width(ln, lang) for ln in lines) / (t1 - t0); fast = max(fast, cps)
        blocks += [f'{ts(t0)} --> {ts(t1)}', txt, '']
    f = OUT / f'clip-film-en.{lang}.vtt'
    f.write_text('\n'.join(blocks), encoding='utf-8')
    print(f'VTT {f.relative_to(ROOT.parent.parent)} · {len(cues)} répliques · ligne la plus longue {worst:.0f}/{lim} · lecture max {fast:.0f} signes/s')
print('SOUS_TITRES ' + ('OK' if not bad else f'{bad} problème(s)') + f' · {len(S["textes"])} langues · répliques de {cues[0][0]:.2f} à {cues[-1][1]:.2f} s')
# les mêmes répliques anglaises en .srt : les sous-titres de l'aperçu, et le .srt que l'export pose à côté du MP4
srt = lambda t: f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
open(ROOT / 'work' / 'captions.srt', 'w', encoding='utf-8').write(
    '\n'.join(f'{i}\n{srt(t0)} --> {srt(t1)}\n{txt}\n' for i, ((t0, t1, _), txt) in enumerate(zip(cues, S['textes']['en']), 1)))
print('SRT work/captions.srt (les répliques anglaises : aperçu et export)')
for (t0, t1, said), en in zip(cues, S['textes']['en']):   # le texte anglais dit bien ce que la voix dit
    if re.sub(r'\W', '', said.lower()) != re.sub(r'\W', '', en.replace('\n', ' ').lower()):
        print(f'NOTE réplique {ts(t0)} : voix « {said} » / sous-titre « {en} »')
