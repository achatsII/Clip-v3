"""Recale sur la voix réelle les mots que Whisper fait commencer dans un silence.

Après une pause à l'intérieur d'une phrase (« Meet… Clip. », « Edit with a word. Annotate… »), Whisper fait souvent
démarrer le mot suivant dans le silence, jusqu'à une demi-seconde trop tôt ; timeline.py ne recale que le premier
mot de chaque phrase. Ici, un mot qui commence dans un silence de son clip est posé sur la reprise de la voix (le
début du passage parlé suivant, mesuré sur l'enveloppe du clip, comme timeline.py). Les scènes qui demandent
M.at('Clip') tombent alors sur ce qu'on entend.

À lancer juste après `timeline.py cues … --out work` (avant `musique.py plan`, qui garde les heures des mots) :
    SKILL=<skill> python3 scripts/caler-mots.py            (depuis motion/en/)
Réécrit work/timeline.json, words.txt et captions.srt ; dit quels mots ont bougé.
"""
import json, os, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKILL = os.environ.get('SKILL') or sys.exit('SKILL=<dossier du skill motion-animation-reel> manque')
sys.path.insert(0, str(pathlib.Path(SKILL) / 'scripts'))
import timeline as T   # noqa: E402  (load, speech_intervals, finish : les mêmes mesures que timeline.py)

work = ROOT / 'work'; tl_p = work / 'timeline.json'; TL = json.load(open(tl_p, encoding='utf-8'))
moved = []
phrases = []
for p in TL['phrases']:
    f = pathlib.Path(p['file']); f = f if f.exists() else ROOT / f if (ROOT / f).exists() else work / 'clips' / f.name
    iv = T.speech_intervals(T.load(f))
    a0 = max(0, iv[0][0] - 0.03); cs = float(p['clip_start'])
    V = [(cs + a - a0, cs + b - a0) for a, b in iv]          # passages parlés, en heure de la vidéo
    ws = [list(w[:3]) for w in TL['words'] if w[3] == p['id']]
    for k, w in enumerate(ws):
        if k == 0: continue                                    # le premier mot est déjà sur la première syllabe
        t = w[0]
        if any(a - 0.05 <= t <= b for a, b in V): continue     # il commence dans la voix : rien à faire
        nxt = [a for a, b in V if a > t]
        if not nxt or nxt[0] - t > 0.8: continue               # pas de reprise proche : on ne devine pas
        new = round(nxt[0], 3)
        moved.append(f"{p['id']} « {w[2]} » {t:.2f} → {new:.2f} s")
        w[0] = new; w[1] = round(max(w[1], new + 0.05), 3)
        for j in range(k + 1, len(ws)):                        # les mots suivants ne passent jamais devant lui
            if ws[j][0] < new: ws[j][0] = new; ws[j][1] = round(max(ws[j][1], new + 0.05), 3)
    # une reprise après un vrai silence (0,25 s ou plus) commence toujours un mot : si Whisper a posé tous les mots
    # avant elle (« Meet… Clip. » : « Clip » dans le « Meet »), le dernier mot posé avant la reprise y est déplacé
    for j in range(1, len(V)):
        o = V[j][0]
        if o - V[j - 1][1] < 0.25: continue
        end_j = V[j + 1][0] if j + 1 < len(V) else 1e9
        if any(o - 0.05 <= w[0] < end_j for w in ws): continue
        cand = [k for k, w in enumerate(ws) if k > 0 and w[0] < o - 0.05]
        if not cand: continue
        k = cand[-1]; old = ws[k][0]; new = round(o, 3)
        moved.append(f"{p['id']} « {ws[k][2]} » {old:.2f} → {new:.2f} s (reprise après un silence)")
        ws[k][0] = new; ws[k][1] = round(max(ws[k][1], new + 0.05), 3)
        for i in range(k + 1, len(ws)):
            if ws[i][0] < new: ws[i][0] = new; ws[i][1] = round(max(ws[i][1], new + 0.05), 3)
    q = {k_: v for k_, v in p.items()}
    q['start'] = ws[0][0] if ws else p['start']; q['words'] = ws
    phrases.append(q)

extra = {k: v for k, v in TL.items() if k not in ('source', 'duration', 'audio', 'phrases', 'words', 'niveau')}
audio = (work / TL['audio']) if TL.get('audio') else None
T.finish(work, TL.get('source', 'cues'), float(TL['duration']), phrases, audio, extra or None)
print('MOTS recalés sur la voix : ' + ('; '.join(moved) if moved else 'aucun'))
