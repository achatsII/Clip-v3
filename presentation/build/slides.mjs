// Les slides du deck Clip. Chaque slide : { label, notes, html, css }. Les maquettes reprennent l'app
// (apps/web : AppShell, CaptureBoard, GenerationProgress, Player, AgentPanel, Annotator, Postes, impression),
// avec ses libellés exacts (src/lib/i18n/fr). Le curseur suit des cibles mesurées (measure.mjs → targets.json).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ic, logoMark, cursor } from './lib.mjs'
import { img, at, pt, BG, brand, copy, side, win, STEPS, TITLE, WARN, playerFrame, PLAYER_CSS } from './ui.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const [QRN, QRD] = fs.readFileSync(path.join(HERE, 'qr.txt'), 'utf8').split('|')
const qr = (size) => `<svg width="${size}" height="${size}" viewBox="-2 -2 ${+QRN + 4} ${+QRN + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${+QRN + 4}" height="${+QRN + 4}" fill="#fff"/><path d="${QRD}" fill="#0f172a"/></svg>`
const NNBSP = ' '

/* ═════════════════════════════ 1 · Couverture ═════════════════════════════ */
function s01() {
  return {
    label: 'COUVERTURE',
    notes: 'Clip, c’est l’outil qui transforme le savoir-faire de vos experts en instructions de travail claires, déployées au poste, en quelques minutes.',
    css: `
.s1 .photo { background-position: 58% 50%; }
.s1 .hero { position:absolute; left:110px; top:0; bottom:0; width:1000px; display:flex; flex-direction:column; justify-content:center; gap:30px; }
.s1 .wm { display:flex; align-items:center; gap:22px; }
.s1 .wm b { display:block; font-size:80px; font-weight:900; letter-spacing:-.06em; color:#fff; line-height:1; }
.s1 .wm small { display:block; margin-top:8px; font-size:15px; font-weight:900; letter-spacing:.16em; color:#7cc4ff; text-transform:uppercase; }
.s1 h1 { font-size:86px; line-height:.98; font-weight:900; letter-spacing:-.055em; color:#fff; }
.s1 h1 em { font-style:normal; background-image:linear-gradient(135deg,#5ad8ff,#3b9bff); -webkit-background-clip:text; background-clip:text; color:transparent; }
.s1 .lead { font-size:28px; line-height:1.42; font-weight:700; color:rgba(255,255,255,.84); max-width:780px; }
.s1 .by { position:absolute; left:110px; bottom:66px; font-size:14px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.6); }
`,
    html: `<div class="stage s1">
  <div class="photo a-kb" style="background-image:url(${img('usine-large.jpg')})"></div>
  <div class="shade-l"></div>
  <div class="hero">
    <div class="wm a-rise" style="--d:.2s">${logoMark(92)}<span><b>CLIP</b><small>Instructions de travail · IA</small></span></div>
    <h1 class="a-rise" style="--d:.45s">Le savoir-faire de vos experts, <em>au poste</em>, en quelques minutes.</h1>
    <p class="lead a-rise" style="--d:.7s">Filmez un expert. L’IA en fait une instruction de travail claire et visuelle, prête pour le plancher.</p>
  </div>
  <p class="by a-fade" style="--d:1.1s">Intelligence Industrielle</p>
</div>`,
  }
}

/* ═════════════════════════════ 2 · Le constat ═════════════════════════════ */
function s02() {
  return {
    label: 'LE CONSTAT',
    notes: 'On estime que 20 à 30 % des technologues en usine partiront à la retraite d’ici 2030. Leur savoir-faire n’est écrit nulle part : il faut le capturer maintenant et en faire la propriété de l’entreprise.',
    css: `
@property --c2a { syntax:'<integer>'; inherits:false; initial-value:0; }
@property --c2b { syntax:'<integer>'; inherits:false; initial-value:0; }
.s2 .stat { white-space:nowrap; font-size:128px; line-height:.9; font-weight:900; letter-spacing:-.06em; background-image:linear-gradient(135deg,#FF2B5E,#FF6B00); -webkit-background-clip:text; background-clip:text; color:transparent; --c2a:20; --c2b:30; counter-reset: a var(--c2a) b var(--c2b); animation: c2n 1.4s cubic-bezier(.2,.7,.2,1) .5s both; }
.s2 .stat::after { content: counter(a) " à " counter(b) "${NNBSP}%"; }
@keyframes c2n { from { --c2a:0; --c2b:0; } to { --c2a:20; --c2b:30; } }
.s2 .statline { font-size:38px; line-height:1.15; font-weight:900; letter-spacing:-.04em; color:#0f172a; }
.s2 .tl { margin-top:6px; width:560px; }
.s2 .tl-bar { position:relative; height:14px; border-radius:99px; background:rgba(15,23,42,.08); overflow:hidden; }
.s2 .tl-bar i { position:absolute; left:0; top:0; bottom:0; width:100%; border-radius:99px; background-image:linear-gradient(90deg,#FFC800,#FF6B00,#FF2B5E); }
.s2 .tl-y { display:flex; justify-content:space-between; margin-top:10px; font-size:16px; font-weight:900; color:#64748b; letter-spacing:.06em; }
.s2 .tl-y b { color:#FF2B5E; }
.s2 .pic { position:absolute; left:770px; top:110px; width:1050px; height:860px; border-radius:40px; overflow:hidden; box-shadow:0 50px 120px -30px rgba(15,23,42,.5); }
.s2 .pic .photo { background-position: 64% 40%; }
.s2 .tag { position:absolute; left:36px; bottom:36px; display:flex; align-items:center; gap:14px; padding:16px 22px 16px 16px; border-radius:26px; }
.s2 .tag .av { width:54px; height:54px; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#fff; background-image:linear-gradient(135deg,#FF2B5E,#FF6B00); }
.s2 .tag b { display:block; font-size:21px; font-weight:900; letter-spacing:-.02em; }
.s2 .tag small { display:block; font-size:15px; font-weight:700; color:#64748b; }
.s2 .tag2 { position:absolute; right:36px; top:36px; padding:12px 18px; border-radius:20px; font-size:17px; font-weight:900; color:#0f172a; display:flex; gap:10px; align-items:center; }
`,
    html: `<div class="stage s2">${BG()}${brand()}
  <div class="copy" style="gap:22px">
    <div class="eyebrow a-rise" style="--d:.1s"><i>${ic('hourglass', 20)}</i>Le constat</div>
    <div class="stat tnum" aria-label="20 à 30 %"></div>
    <p class="statline a-rise" style="--d:.7s">des technologues en usine partiront à la retraite d’ici 2030.</p>
    <p class="sub a-rise" style="--d:1.1s">Leur savoir-faire part avec eux. Il faut le capturer <b>maintenant</b>, et en faire la propriété de l’entreprise.</p>
    <div class="tl a-rise" style="--d:1.5s"><div class="tl-bar"><i class="a-bar" style="--d:1.8s;--len:2.4s"></i></div><div class="tl-y tnum"><span>AUJOURD’HUI</span><b>2030</b></div></div>
  </div>
  <div class="pic a-right" style="--d:.25s">
    <div class="photo a-kb" style="background-image:url(${img('expert-machine.jpg')})"></div>
    <div class="tag glass-float a-rise" style="--d:1.3s"><span class="av">${ic('user-round', 28)}</span><span><b>Jacques, machiniste</b><small>Il prend sa retraite l’an prochain.</small></span></div>
    <div class="tag2 glass-float a-pop" style="--d:2.2s">${ic('brain', 20)} Son savoir-faire : nulle part par écrit</div>
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 3 · Capturer (grande photo) ═════════════════════════════ */
function s03() {
  return {
    label: 'CAPTURER',
    notes: 'Première étape : on filme l’expert pendant qu’il explique, avec son téléphone, directement dans l’app. La vidéo est légère (720p).',
    css: `
.s3 .photo { background-position: 50% 55%; }
.s3 .cap { position:absolute; left:96px; right:96px; bottom:64px; display:flex; flex-direction:column; gap:14px; }
.s3 .title { font-size:70px; }
.s3 .sub { font-size:25px; }
`,
    html: `<div class="stage s3">
  <div class="photo a-kb" style="background-image:url(${img('filmer.jpg')})"></div>
  <div class="shade-b"></div>
  ${brand(true)}
  <div class="cap on-dark">
    <div class="eyebrow a-rise" style="--d:.2s"><i>${ic('video', 20)}</i>Capturer</div>
    <h2 class="title on-dark a-rise" style="--d:.35s">Filmez l’expert pendant qu’il explique.</h2>
    <p class="sub on-dark a-rise" style="--d:.55s">Son téléphone suffit : la vidéo s’enregistre dans Clip, en 720p, légère.</p>
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 4 · Déposer (capture) ═════════════════════════════ */
function s04() {
  const S = 's4', T = 9.5
  const c = cursor('c4', T, [
    pt(0, 820, 760),
    at(S, 'files', 1.9, { dx: 6, dy: 4 }),
    at(S, 'files', 2.2, { dx: 6, dy: 4, click: true }),
    at(S, 'drop', 3.3),
    at(S, 'drop', 3.45, { click: true }),
    at(S, 'gen', 5.9, { dx: -30 }),
    at(S, 'gen', 6.2, { dx: -30, click: true }),
    at(S, 'gen', 9.5, { dx: -10, dy: 30 }),
  ])
  // Le paquet de fichiers suit le curseur pendant le glisser (2,2 → 3,3 s).
  const f0 = globalThis.TARGETS?.s4?.files || [100, 760]
  const f1 = globalThis.TARGETS?.s4?.drop || [560, 470]
  const p = (t) => ((t / T) * 100).toFixed(3) + '%'
  const dragCss = `@keyframes s4drag{0%{transform:none;opacity:1}${p(2.2)}{transform:none;opacity:1;animation-timing-function:cubic-bezier(.55,0,.2,1)}${p(3.3)}{transform:translate(${f1[0] - f0[0]}px,${f1[1] - f0[1]}px) scale(.9);opacity:1}${p(3.5)}{transform:translate(${f1[0] - f0[0]}px,${f1[1] - f0[1]}px) scale(.6);opacity:0}100%{transform:translate(${f1[0] - f0[0]}px,${f1[1] - f0[1]}px) scale(.6);opacity:0}}`
  const tiles = [
    ['video', 'Vidéo', 'Filmez le geste', '#0ea5e9,#2563eb'],
    ['image-plus', 'Photos', 'Pièces, réglages', '#2dd4bf,#059669'],
    ['mic', 'Note vocale', 'Expliquez à voix haute', '#8b5cf6,#4f46e5'],
    ['pen-line', 'Note', 'Une précision écrite', '#fbbf24,#f97316'],
    ['file-up', 'Fichiers', 'PDF, Word, vidéos', '#64748b,#334155'],
  ]
  return {
    label: 'DÉPOSER',
    notes: 'On dépose la vidéo dans Clip, avec des photos, une note vocale… ou une vieille procédure en PDF ou Word. Puis un seul bouton : Générer l’instruction.',
    css: `${c.css}${dragCss}
.s4 .mk { left:740px; top:96px; width:1120px; height:880px; }
.s4 .main { padding:30px 34px; display:flex; flex-direction:column; gap:16px; }
.s4 .intent { border-radius:30px; padding:18px 20px; }
.s4 .intent .caps { color:#64748b; margin-bottom:10px; display:block; }
.s4 .intent .caps span { text-transform:none; letter-spacing:0; opacity:.7; font-weight:700; }
.s4 .row { display:flex; gap:10px; }
.s4 .inp { flex:1; height:54px; border-radius:16px; display:flex; align-items:center; padding:0 16px; font-size:16px; font-weight:600; color:#0f172a; position:relative; overflow:hidden; white-space:nowrap; }
.s4 .inp .ph { position:absolute; left:16px; color:#94a3b8; }
.s4 .mic { width:54px; height:54px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#475569; }
.s4 .tiles { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
.s4 .tile { position:relative; overflow:hidden; height:126px; border-radius:26px; padding:14px; color:#fff; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 10px 24px -8px rgba(15,23,42,.35); }
.s4 .tile .gp { position:absolute; inset:0; opacity:.6; }
.s4 .tile .blob { position:absolute; right:-32px; top:-32px; width:96px; height:96px; border-radius:99px; background:rgba(255,255,255,.2); filter:blur(16px); }
.s4 .tile .it { position:relative; width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.25); background:rgba(255,255,255,.15); }
.s4 .tile b { position:relative; display:block; font-size:17px; font-weight:900; line-height:1.1; }
.s4 .tile small { position:relative; display:block; font-size:11.5px; font-weight:700; color:rgba(255,255,255,.82); }
.s4 .notes h4 { display:flex; justify-content:space-between; font-size:18px; font-weight:900; letter-spacing:-.02em; margin:4px 0 10px; }
.s4 .notes h4 span { position:relative; color:#94a3b8; font-size:14px; width:20px; text-align:right; }
.s4 .notes h4 span i { position:absolute; right:0; font-style:normal; }
.s4 .cards { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.s4 .src { display:flex; align-items:center; gap:14px; padding:10px; border-radius:22px; }
.s4 .src .th { position:relative; width:62px; height:62px; flex-shrink:0; border-radius:16px; overflow:hidden; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color:#fff; }
.s4 .src .th.vid::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,.25); }
.s4 .src .th .ic { position:relative; z-index:1; }
.s4 .src b { display:block; font-size:14.5px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s4 .src .meta { display:block; position:relative; height:18px; margin-top:3px; font-size:12px; font-weight:700; color:#64748b; }
.s4 .src .meta > span { position:absolute; left:0; top:0; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.s4 .src .meta .ok .ic { color:#10b981; }
.s4 .src .bar { margin-top:6px; height:5px; border-radius:99px; background:rgba(15,23,42,.08); overflow:hidden; }
.s4 .src .bar i { display:block; height:100%; background-image:var(--grad); }
.s4 .src .q { margin-top:2px; font-size:12.5px; font-weight:600; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s4 .float { position:absolute; left:298px; right:34px; bottom:26px; border-radius:30px; padding:12px 12px 12px 22px; display:flex; align-items:center; gap:14px; }
.s4 .float .msg { position:relative; flex:1; height:20px; font-size:14px; font-weight:700; color:#64748b; }
.s4 .float .msg span { position:absolute; left:0; top:0; white-space:nowrap; }
.s4 .gen { height:58px; padding:0 28px; font-size:16px; position:relative; }
.s4 .gen .spin { position:absolute; left:26px; }
.s4 .drop { position:absolute; left:264px; right:0; top:0; bottom:0; z-index:20; display:flex; align-items:center; justify-content:center; background:rgba(0,120,255,.12); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); }
.s4 .drop div { border-radius:30px; padding:28px 40px; text-align:center; font-size:22px; font-weight:900; }
.s4 .drop .ic { color:var(--primary); margin:0 auto 8px; display:block; }
.s4 .files { position:absolute; left:-60px; top:700px; z-index:50; width:300px; animation:s4drag ${T}s linear both; }
.s4 .fcard { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:16px; margin-top:6px; font-size:13.5px; font-weight:800; color:#0f172a; }
.s4 .fcard .fi { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#fff; }
.s4 .fcount { position:absolute; right:-10px; top:-14px; width:34px; height:34px; border-radius:99px; background:#0078ff; color:#fff; font-size:15px; font-weight:900; display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-p); }
`,
    html: `<div class="stage s4">${BG()}${brand()}
  ${copy({ eyebrow: 'Déposer', title: 'Déposez tout dans Clip.', sub: 'La vidéo, des photos, une note vocale… et même vos <b>vieilles procédures</b> en PDF ou Word.', extra: `<div class="a-rise" style="--d:.55s;display:flex;gap:10px;flex-wrap:wrap">${['video|Vidéo', 'image|Photos', 'mic|Notes vocales', 'file-text|PDF et Word'].map((x) => { const [i, l] = x.split('|'); return `<span class="chip glass-card">${ic(i, 18)} ${l}</span>` }).join('')}</div>` }).replace('<i></i>', `<i>${ic('upload', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s4" data-k="1" style="--d:.15s">
    ${win(
      `${side({ active: 'instructions' })}
      <div class="main">
        <h1 class="h1">Nouvelle instruction</h1>
        <div class="intent glass-panel">
          <label class="caps">De quoi s’agit-il ? <span>(facultatif)</span></label>
          <div class="row"><div class="inp glass-input"><span class="ph a-out" style="--d:.75s">Ex. : nettoyage des rails de la machine 1234, une fois par mois</span><span class="a-type" style="--d:.8s;--len:1.3s;--n:40">Nettoyage des rails de la machine 1234, une fois par mois</span></div><span class="mic glass-card">${ic('mic', 20)}</span></div>
        </div>
        <div class="tiles">${tiles.map(([i, l, h, g]) => `<div class="tile" style="background-image:linear-gradient(135deg,${g})"><span class="gp grid-pattern"></span><span class="blob"></span><span class="it">${ic(i, 26)}</span><span><b>${l}</b><small>${h}</small></span></div>`).join('')}</div>
        <div class="notes">
          <h4>Vos notes <span class="tnum"><i class="a-out" style="--d:3.6s;opacity:0">1</i><i class="a-fade" style="--d:3.6s">4</i></span></h4>
          <div class="cards">
            <div class="src glass-card"><span class="th" style="background-image:linear-gradient(135deg,#8b5cf6,#4f46e5)">${ic('mic', 26)}</span><span style="min-width:0;flex:1"><b>Note vocale</b><span class="meta"><span class="ok">${ic('check', 14)} Note vocale · 0:48</span></span><p class="q">« Toujours cadenasser avant d’ouvrir la porte. »</p></span></div>
            <div class="src glass-card a-pop" style="--d:3.55s"><span class="th vid" style="background-image:url(${img('expert-machine.jpg')})">${ic('video', 24)}</span><span style="min-width:0;flex:1"><b>nettoyage-rails-M1234.mp4</b><span class="meta"><span class="a-out" style="--d:5.3s;opacity:0">Optimisation de la vidéo…</span><span class="ok a-fade" style="--d:5.3s">${ic('check', 14)} Vidéo · 4:12</span></span><div class="bar a-out" style="--d:5.3s;opacity:0"><i class="a-bar" style="--d:3.7s;--len:1.6s"></i></div></span></div>
            <div class="src glass-card a-pop" style="--d:3.7s"><span class="th" style="background-image:url(${img('rails-brosse.jpg')})"></span><span style="min-width:0;flex:1"><b>rails-copeaux.jpg</b><span class="meta"><span class="a-out" style="--d:4.4s;opacity:0">Envoi…</span><span class="ok a-fade" style="--d:4.4s">${ic('check', 14)} Photo</span></span></span></div>
            <div class="src glass-card a-pop" style="--d:3.85s"><span class="th" style="background-image:linear-gradient(135deg,#64748b,#334155)">${ic('file-text', 26)}</span><span style="min-width:0;flex:1"><b>procedure-rails-2019.pdf</b><span class="meta"><span class="a-out" style="--d:4.9s;opacity:0">Conversion en PDF…</span><span class="ok a-fade" style="--d:4.9s">${ic('check', 14)} Document · 3 pages</span></span></span></div>
          </div>
        </div>
      </div>
      <div class="float glass-float">
        <p class="msg"><span class="a-out" style="--d:3.55s;opacity:0">1 note prête. L’IA va les analyser.</span><span class="a-blip" style="--d:3.55s;--len:2s">Envoi en cours… vous pouvez continuer à capturer.</span><span class="a-fade" style="--d:5.5s;color:#0f172a;font-weight:800">4 notes prêtes. L’IA va les analyser.</span></p>
        <span class="btn btn-p gen a-press" data-t="gen" style="--d:6.15s"><span class="a-out" style="--d:6.25s;opacity:0;display:inline-flex">${ic('sparkles', 20)}</span><span class="spin a-fade" style="--d:6.25s;display:inline-flex"><span class="a-spin" style="display:inline-flex">${ic('loader-circle', 20)}</span></span> Générer l’instruction</span>
      </div>
      <div class="drop a-blip" style="--d:2.75s;--len:.85s" data-t="drop"><div class="glass-panel">${ic('file-up', 40)}Déposez vos fichiers</div></div>`,
      { x: 0, y: 0, w: 1120, h: 880 },
    )}
    <div class="files" data-t="files">
      <span class="fcount">3</span>
      <div class="fcard glass-float"><span class="fi" style="background:#2563eb">${ic('video', 16)}</span>nettoyage-rails-M1234.mp4</div>
      <div class="fcard glass-float"><span class="fi" style="background:#059669">${ic('image', 16)}</span>rails-copeaux.jpg</div>
      <div class="fcard glass-float"><span class="fi" style="background:#e11d48">${ic('file-text', 16)}</span>procedure-rails-2019.pdf</div>
    </div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 5 · Générer ═════════════════════════════ */
function s05() {
  const stages = [
    ['loader-circle', 'Préparation des médias', 0.5, 1.6],
    ['eye', 'L’IA regarde et écoute vos notes', 1.6, 3.9],
    ['wand-sparkles', 'Mise en forme des étapes', 3.9, 5.2],
    ['crosshair', 'Annotation des images', 5.2, 6.2],
  ]
  return {
    label: 'GÉNÉRER',
    notes: 'L’IA regarde la vidéo, écoute les notes et lit les documents. En moins de deux minutes, elle rédige l’instruction : une action par étape, le bon extrait vidéo, les mises en garde au bon moment.',
    css: `
@property --m5 { syntax:'<integer>'; inherits:false; initial-value:0; }
@property --s5 { syntax:'<integer>'; inherits:false; initial-value:0; }
.s5 .mk { left:760px; top:120px; width:1100px; height:840px; }
.s5 .gp { position:absolute; left:0; top:40px; width:540px; border-radius:40px; padding:36px; overflow:hidden; }
.s5 .gp .blob { position:absolute; right:-80px; top:-80px; width:224px; height:224px; border-radius:99px; background-image:var(--grad); opacity:.2; filter:blur(40px); }
.s5 .hd { position:relative; display:flex; align-items:center; gap:16px; }
.s5 .hd .t { width:64px; height:64px; border-radius:24px; display:flex; align-items:center; justify-content:center; color:#fff; }
.s5 .hd h3 { font-size:24px; font-weight:900; letter-spacing:-.05em; }
.s5 .el { font-size:14px; font-weight:700; color:#64748b; --m5:1; --s5:42; counter-reset: m var(--m5) s var(--s5); animation: c5t 6.2s linear .3s both; }
.s5 .el::before { content: counter(m) ":" counter(s, decimal-leading-zero) " · d’habitude moins de 2 minutes"; }
@keyframes c5t { 0% { --m5:0; --s5:0; } 70% { --m5:0; --s5:59; } 70.01% { --m5:1; --s5:0; } 100% { --m5:1; --s5:42; } }
.s5 ol { position:relative; margin-top:30px; display:flex; flex-direction:column; gap:10px; }
.s5 li { position:relative; display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:16px; animation: k5act var(--len) linear var(--d) both; }
@keyframes k5act { 0% { background:transparent; opacity:.7; } 4%, 96% { background:var(--primary-soft); opacity:1; } 100% { background:transparent; opacity:1; } }
.s5 .ico { position:relative; width:36px; height:36px; }
.s5 .ico > span { position:absolute; inset:0; border-radius:12px; display:flex; align-items:center; justify-content:center; }
.s5 .ico .pend { background:rgba(15,23,42,.05); color:#94a3b8; }
.s5 .ico .act { background-image:var(--grad); color:#fff; }
.s5 .ico .done { background:#10b981; color:#fff; }
.s5 li b { flex:1; font-size:15.5px; font-weight:900; color:#1e293b; }
.s5 li small { font-size:12px; font-weight:700; color:#64748b; }
.s5 li.thumbs { animation:none; display:flex; gap:8px; padding:0 0 0 64px; }
.s5 li.late { animation: k5late 1.05s linear 5.2s both; }
@keyframes k5late { 0% { opacity:0; transform:translateY(12px); background:var(--primary-soft); } 10% { opacity:1; transform:none; } 94% { background:var(--primary-soft); } 100% { opacity:1; transform:none; background:transparent; } }
.s5 .thumbs span { width:70px; height:46px; border-radius:10px; background-size:cover; background-position:center; box-shadow:0 4px 10px rgba(15,23,42,.15); }
.s5 .tip { position:relative; margin-top:26px; text-align:center; font-size:14px; font-weight:600; color:#64748b; }
.s5 .res { position:absolute; left:575px; top:0; width:525px; border-radius:34px; padding:26px; }
.s5 .res .cat { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:99px; background:var(--primary-soft); color:var(--primary-strong); font-size:12.5px; font-weight:900; }
.s5 .res h3 { margin-top:12px; font-size:30px; line-height:1.02; font-weight:900; letter-spacing:-.05em; }
.s5 .meta { margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; }
.s5 .meta span { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 13px; border-radius:16px; font-size:14px; font-weight:900; }
.s5 .meta .ic { color:var(--primary); }
.s5 .meta .lock { color:#fff; background-image:linear-gradient(135deg,#FF2B5E,#FF6B00); }
.s5 .meta .lock .ic { color:#fff; }
.s5 .ppe { margin-top:14px; display:flex; gap:8px; }
.s5 .ppe span { display:flex; align-items:center; gap:8px; padding:9px 13px; border-radius:18px; color:#fff; font-size:13px; font-weight:900; background-image:linear-gradient(135deg,#2563eb,#0ea5e9); box-shadow:0 8px 20px rgba(37,99,235,.25); }
.s5 .steps { margin-top:16px; display:flex; flex-direction:column; gap:8px; }
.s5 .st { display:flex; align-items:center; gap:12px; padding:8px; border-radius:18px; }
.s5 .st .n { width:32px; height:32px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; font-weight:900; flex-shrink:0; }
.s5 .st .th { width:74px; height:48px; border-radius:11px; background-size:cover; background-position:center; flex-shrink:0; }
.s5 .st b { font-size:15.5px; font-weight:900; letter-spacing:-.01em; }
.s5 .st small { display:block; font-size:12px; font-weight:700; color:#64748b; margin-top:2px; }
`,
    html: `<div class="stage s5">${BG()}${brand()}
  ${copy({ eyebrow: 'Générer', title: 'L’IA rédige l’<em>instruction</em>.', sub: 'Une action par étape, le bon extrait vidéo, les mises en garde au bon moment. <b>En moins de 2 minutes.</b>' }).replace('<i></i>', `<i>${ic('sparkles', 20)}</i>`)}
  <div class="mk" data-mk="s5" data-k="1">
    <div class="gp glass-panel a-pop" style="--d:.15s">
      <span class="blob"></span>
      <div class="hd"><span class="t grad sh-p a-float">${ic('sparkles', 32)}</span><div><h3>L’IA rédige votre instruction</h3><p class="el tnum"></p></div></div>
      <ol>${stages
        .map(
          ([i, l, a, b], k) => `<li style="--d:${a}s;--len:${(b - a).toFixed(2)}s" ${k === 3 ? 'class="late"' : ''}>
          <span class="ico"><span class="pend a-out" style="--d:${a}s">${ic(i, 20)}</span><span class="act a-blip" style="--d:${a}s;--len:${(b - a + 0.05).toFixed(2)}s"><span class="a-spin" style="display:inline-flex">${ic('loader-circle', 20)}</span></span><span class="done a-pop" style="--d:${b}s">${ic('check', 20)}</span></span>
          <b>${l}</b>${k === 1 ? '<small class="a-blip" style="--d:1.7s;--len:2.2s">Vignettes des extraits</small>' : ''}
        </li>${k === 1 ? `<li class="thumbs">${['rails-brosse.jpg', 'rails-huile.jpg', 'cadenas.jpg', 'panneau.jpg'].map((f, j) => `<span class="a-pop" style="--d:${(1.9 + j * 0.45).toFixed(2)}s;background-image:url(${img(f)})"></span>`).join('')}</li>` : ''}`,
        )
        .join('')}</ol>
      <p class="tip">💡 Chaque étape garde le bon extrait de votre vidéo, à la seconde près.</p>
    </div>
    <div class="res glass-float a-right" style="--d:6.4s">
      <span class="cat">${ic('wrench', 14)} Maintenance</span>
      <h3>${TITLE}</h3>
      <div class="meta"><span class="glass-card">${ic('layers', 18)} 5 étapes</span><span class="glass-card">${ic('clock', 18)} 15 min</span><span class="lock">${ic('lock', 18)} 1 cadenas</span></div>
      <div class="ppe"><span>${ic('glasses', 18)} Lunettes</span><span>${ic('hand', 18)} Gants anticoupure</span></div>
      <div class="steps">${STEPS.map((s, i) => `<div class="st glass-card a-rise" style="--d:${(6.8 + i * 0.18).toFixed(2)}s"><span class="n grad">${i + 1}</span><span class="th" style="background-image:url(${img(s.img)})"></span><span><b>${s.t}</b><small>${s.text.length > 52 ? s.text.slice(0, 50) + '…' : s.text}</small></span></div>`).join('')}</div>
    </div>
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 6 · Pas-à-pas (tablette) ═════════════════════════════ */
function s06() {
  const S = 's6', T = 8.5
  const c = cursor('c6', T, [pt(0, 900, 560), at(S, 'next', 2.0, { dx: 40 }), at(S, 'next', 2.25, { dx: 40, click: true }), at(S, 'listen', 4.6), at(S, 'listen', 4.85, { click: true }), at(S, 'listen', 8.5, { dx: -60, dy: 120 })], { kind: 'touch' })
  const st2 = STEPS[1], st3 = STEPS[2]
  const states = [
    { cls: 'a-out', style: 'style="--d:2.35s"', stepOf: 'Étape 2 sur 5', n: 2, t: st2.t, img: st2.img, w: st2.w, text: st2.text, kp: st2.kp },
    { cls: 'a-fade', style: 'style="--d:2.35s"', stepOf: 'Étape 3 sur 5', n: 3, t: st3.t, img: st3.img, w: st3.w, text: st3.text, kp: st3.kp },
  ]
  return {
    label: 'PAS À PAS',
    notes: 'Au poste, l’opérateur suit l’instruction étape par étape : grosses images, le bon extrait vidéo, une seule action à la fois. Il peut la faire lire à voix haute, poser une question ou signaler une étape pas claire.',
    css: `${c.css}${PLAYER_CSS}
.s6 .mk { left:740px; top:130px; width:1120px; height:780px; }
.s6 .tablet { left:0; top:0; width:1120px; height:760px; }
.s6 .pl-prog i { animation: k6p .6s var(--ease) 2.35s both; width:60%; }
@keyframes k6p { from { width:40%; } to { width:60%; } }
.s6 .listen { animation: k6l .3s ease-out 4.85s both; }
@keyframes k6l { from { background:rgba(255,255,255,.55); color:#0f172a; box-shadow:none; } to { background:#0078ff; color:#fff; box-shadow:var(--sh-p); } }
.s6 .listen .ic { animation: k6v 1s ease-in-out 4.9s infinite; }
@keyframes k6v { 50% { transform:scale(1.15); } }
.s6 .pl-step.a-fade .pl-text > * { animation: k-rise .5s var(--ease) both; }
.s6 .pl-step.a-fade .pl-text > *:nth-child(1) { animation-delay:2.4s; } .s6 .pl-step.a-fade .pl-text > *:nth-child(2) { animation-delay:2.5s; } .s6 .pl-step.a-fade .pl-text > *:nth-child(3) { animation-delay:2.6s; } .s6 .pl-step.a-fade .pl-text > *:nth-child(4) { animation-delay:2.7s; }
.s6 .reading { position:absolute; left:0; right:0; height:4px; }
.s6 .wave { position:absolute; left:24px; bottom:24px; display:flex; gap:5px; align-items:flex-end; height:34px; padding:8px 12px; border-radius:14px; background:rgba(15,23,42,.55); }
.s6 .wave i { width:5px; border-radius:3px; background:#fff; animation: k6w .8s ease-in-out infinite; }
@keyframes k6w { 0%,100% { height:6px; } 50% { height:18px; } }
.s6 .vid { position:absolute; left:20px; right:20px; bottom:20px; display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:18px; background:rgba(15,23,42,.55); color:#fff; font-size:13px; font-weight:800; }
.s6 .vid .tr { flex:1; height:5px; border-radius:99px; background:rgba(255,255,255,.3); overflow:hidden; }
.s6 .vid .tr i { display:block; height:100%; background:#fff; animation: k-bar 6s linear 2.4s both; }
`,
    html: `<div class="stage s6">${BG()}${brand()}
  ${copy({ eyebrow: 'Consulter', title: 'Un pas-à-pas qui se comprend <em>sans lire</em>.', sub: 'Grosses images, le bon extrait vidéo, une action à la fois. Lecture à voix haute, questions, signalements.' }).replace('<i></i>', `<i>${ic('layers', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s6" data-k="1" style="--d:.15s">
    <div class="tablet"><div class="scr">${playerFrame({
      states: states.map((s, i) => ({ ...s, media: `<div class="vid a-fade" style="--d:${i ? 2.5 : 0.6}s">${ic('play', 16)} Extrait 0:42<span class="tr"><i></i></span>0:51</div>` })),
      header: { progStyle: 'width:60%' },
    })}</div></div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 7 · Retoucher avec l'IA ═════════════════════════════ */
function s07() {
  const S = 's7', T = 9.5
  const ask = 'Ajoute les gants anticoupure à l’étape 2 et simplifie l’étape 3'
  const c = cursor('c7', T, [pt(0, 520, 640), at(S, 'input', 1.0, { dx: -60 }), at(S, 'input', 1.2, { dx: -60, click: true }), at(S, 'send', 3.6), at(S, 'send', 3.8, { click: true }), at(S, 'send', 9.5, { dx: -160, dy: -40 })])
  return {
    label: 'RETOUCHER AVEC L’IA',
    notes: 'On corrige d’un mot. Ici, on demande à l’assistant d’ajouter les gants à l’étape 2 et de simplifier l’étape 3 : il modifie l’instruction sous nos yeux, et on peut annuler d’un clic.',
    css: `${c.css}
.s7 .mk { left:730px; top:96px; width:1140px; height:880px; }
.s7 .main { padding:24px 26px; }
.s7 .eh { display:flex; align-items:center; gap:10px; }
.s7 .eh h1 { font-size:22px; font-weight:900; letter-spacing:-.04em; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s7 .badge2 { height:30px; padding:0 12px; border-radius:99px; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:900; background:#fef3c7; color:#92400e; }
.s7 .list { position:absolute; left:290px; top:84px; width:470px; display:flex; flex-direction:column; gap:10px; }
.s7 .sc { position:relative; display:flex; gap:12px; padding:10px; border-radius:22px; }
.s7 .sc .n { width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:15px; flex-shrink:0; }
.s7 .sc .th { width:96px; height:66px; border-radius:14px; background-size:cover; background-position:center; flex-shrink:0; }
.s7 .sc b { display:block; font-size:15.5px; font-weight:900; letter-spacing:-.01em; }
.s7 .sc .tx { display:block; position:relative; margin-top:3px; font-size:12.5px; line-height:1.35; font-weight:600; color:#475569; min-height:51px; }
.s7 .sc .tx .old { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.s7 .sc .tx > span { display:block; }
.s7 .sc .tx .old { position:absolute; left:0; top:0; }
.s7 .sc .pp { display:inline-flex; align-items:center; gap:5px; margin-top:6px; padding:4px 10px; border-radius:99px; color:#fff; font-size:11.5px; font-weight:900; background-image:linear-gradient(135deg,#2563eb,#0ea5e9); }
.s7 .glow { position:absolute; inset:-2px; border-radius:24px; border:2px solid #8b5cf6; box-shadow:0 0 0 4px rgba(139,92,246,.15), 0 0 30px rgba(139,92,246,.35); }
.s7 .ag { position:absolute; right:22px; top:72px; bottom:22px; width:340px; border-radius:30px; padding:18px; display:flex; flex-direction:column; }
.s7 .ag-h { display:flex; align-items:center; gap:12px; }
.s7 .ag-h .t { width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; }
.s7 .ag-h b { display:block; font-size:17px; font-weight:900; }
.s7 .ag-h small { display:block; font-size:12px; font-weight:700; color:#64748b; }
.s7 .ag-i { margin-top:14px; font-size:13px; line-height:1.45; font-weight:600; color:#64748b; }
.s7 .conv { position:absolute; left:18px; right:18px; top:84px; display:flex; flex-direction:column; gap:10px; }
.s7 .ab { position:relative; }
.s7 .ub { align-self:flex-end; max-width:92%; padding:11px 14px; border-radius:20px 20px 6px 20px; color:#fff; font-size:13.5px; line-height:1.4; font-weight:700; background-image:var(--grad); box-shadow:var(--sh-p); }
.s7 .ab { align-self:flex-start; width:100%; padding:12px 14px; border-radius:20px 20px 20px 6px; background:rgba(255,255,255,.75); border:1px solid rgba(255,255,255,.9); font-size:13px; font-weight:700; color:#334155; }
.s7 .ab .rd { display:flex; align-items:center; gap:8px; color:#7a14d6; }
.s7 .ab .act { display:flex; align-items:flex-start; gap:8px; margin-top:7px; }
.s7 .ab .act .ic { color:#10b981; margin-top:1px; }
.s7 .ab .undo { display:inline-flex; align-items:center; gap:6px; margin-top:10px; color:var(--primary-strong); font-weight:900; font-size:12.5px; }
.s7 .ag-in { margin-top:auto; display:flex; align-items:flex-end; gap:8px; }
.s7 .ag-in .f { position:relative; flex:1; min-height:52px; border-radius:18px; padding:9px 14px; font-size:13.5px; line-height:1.4; font-weight:600; color:#0f172a; }
.s7 .ag-in .f .ph { position:absolute; left:14px; top:15px; color:#94a3b8; }
.s7 .ag-in .sd { width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
.s7 .ag-in .mc { width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#475569; flex-shrink:0; }
`,
    html: `<div class="stage s7">${BG()}${brand()}
  ${copy({ ai: true, eyebrow: 'Retoucher avec l’IA', title: 'Corrigez d’un <em>mot</em>.', sub: '« Simplifie », « ajoute les gants »… L’assistant modifie l’instruction <b>sous vos yeux</b>. Un clic pour annuler.' }).replace('<i></i>', `<i>${ic('wand-sparkles', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s7" data-k="1" style="--d:.15s">
    ${win(
      `${side({ active: 'instructions' })}
      <div class="main">
        <div class="eh">${ic('arrow-left', 20)}<h1>${TITLE}</h1><span class="badge2">${ic('pencil', 13)} v3 · modifiée</span><span class="btn btn-g b-sm">${ic('eye', 16)} Aperçu</span><span class="btn btn-p b-sm">Publier</span></div>
      </div>
      <div class="list">
        ${[0, 1, 2, 3].map((i) => {
          const s = STEPS[i]
          const tx =
            i === 2
              ? `<span class="old a-out" style="--d:5.55s;opacity:0">Appliquez l’huile pour glissières sur toute la longueur de chaque rail, en un mince filet régulier, puis essuyez soigneusement l’excédent avec un chiffon propre.</span><span class="a-fade" style="--d:5.55s">${s.text}</span>`
              : `<span>${s.text}</span>`
          const pp = i === 1 ? `<span class="pp a-pop" style="--d:5.05s">${ic('hand', 13)} Gants anticoupure</span>` : ''
          const glow = i === 1 ? '<span class="glow a-blip" style="--d:4.95s;--len:2.4s"></span>' : i === 2 ? '<span class="glow a-blip" style="--d:5.45s;--len:2.4s"></span>' : ''
          return `<div class="sc glass-card">${glow}<span class="n grad">${i + 1}</span><span class="th" style="background-image:url(${img(s.img)})"></span><span style="flex:1;min-width:0"><b>${s.t}</b><span class="tx">${tx}</span>${pp}</span></div>`
        }).join('')}
      </div>
      <div class="ag glass-float">
        <div class="ag-h"><span class="t grad-ai sh-a">${ic('sparkles', 22)}</span><span style="flex:1"><b>Assistant</b><small>Il modifie l’instruction sous vos yeux</small></span>${ic('minus', 20, 'muted')}</div>
        <p class="ag-i a-out" style="--d:3.9s;opacity:0">Demandez n’importe quel changement : réécrire ou ajouter une étape, « encercle le bouton vert sur la photo de l’étape 3 », dessiner un schéma… Vous pouvez aussi dicter au micro.</p>
        <div class="conv">
          <p class="ub a-pop" style="--d:3.95s">${ask}</p>
          <div class="ab a-rise" style="--d:4.25s">
            <p class="rd a-blip" style="--d:4.25s;--len:.75s;position:absolute">${ic('sparkles', 15)} Je lis l’instruction…</p>
            <p class="act a-fade" style="--d:4.95s">${ic('circle-check', 16)} Étape 2 : gants anticoupure ajoutés aux équipements</p>
            <p class="act a-fade" style="--d:5.45s">${ic('circle-check', 16)} Étape 3 : texte simplifié</p>
            <p class="undo a-fade" style="--d:6s">${ic('undo-2', 14)} Annuler ces changements</p>
          </div>
        </div>
        <div class="ag-in">
          <div class="f glass-input" data-t="input"><span class="ph a-out" style="--d:1.25s;opacity:0">Demandez un changement…</span><span class="a-blip" style="--d:1.25s;--len:2.65s;display:block"><span class="a-type" style="--d:1.3s;--len:2.1s;--n:60;display:inline">${ask}</span><span class="caret"></span></span></div>
          <span class="mc glass-card">${ic('mic', 20)}</span>
          <span class="sd grad sh-p a-press" data-t="send" style="--d:3.75s">${ic('send', 20)}</span>
        </div>
      </div>`,
      { x: 0, y: 0, w: 1140, h: 880 },
    )}
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 8 · Annoter ═════════════════════════════ */
function s08() {
  const S = 's8', T = 9.5
  const tools = [
    ['mouse-pointer-2', 'Sélection'], ['pencil', 'Crayon'], ['highlighter', 'Surligneur'], ['move-up-right', 'Flèche'], ['minus', 'Ligne'], ['circle', 'Cercle'], ['square', 'Cadre'], ['type', 'Texte'], ['hash', 'Numéro'], ['sticker', 'Icônes'], ['droplet', 'Flouter'],
  ]
  const c = cursor('c8', T, [
    pt(0, 700, 600),
    at(S, 'ai', 1.1), at(S, 'ai', 1.3, { click: true }),
    at(S, 'arrow', 4.4), at(S, 'arrow', 4.6, { click: true }),
    at(S, 'a0', 5.3), at(S, 'a0', 5.45, { click: true }),
    at(S, 'a2', 6.35),
    at(S, 'a2', 9.5, { dx: 90, dy: 90 }),
  ])
  // Coordonnées des marques dans la photo (repère du canevas de la photo : 900 × 506).
  return {
    label: 'ANNOTER',
    notes: 'On annote les images en un clic : l’IA encercle ce qu’il faut regarder. On ajuste ensuite au crayon, à la flèche ou au texte.',
    css: `${c.css}
.s8 .mk { left:730px; top:110px; width:1140px; height:860px; }
.s8 .an { position:absolute; inset:0; border-radius:26px; overflow:hidden; background:#020617; box-shadow:0 50px 120px -30px rgba(15,23,42,.55); }
.s8 .an-top { height:70px; display:flex; align-items:center; gap:12px; padding:0 18px; color:#fff; }
.s8 .an-top .x { width:46px; height:46px; border-radius:16px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.1); }
.s8 .an-top h3 { flex:1; font-size:19px; font-weight:900; letter-spacing:-.02em; }
.s8 .aib { position:relative; height:48px; padding:0 20px; font-size:14px; }
.s8 .aib small { font-size:12px; opacity:.8; font-weight:800; }
.s8 .aib .sp { position:absolute; left:18px; }
.s8 .tools { position:absolute; left:16px; top:86px; width:62px; padding:8px; border-radius:22px; background:rgba(255,255,255,.08); display:flex; flex-direction:column; gap:4px; }
.s8 .tools span { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.75); }
.s8 .tools span.on { background:#fff; color:#0f172a; }
.s8 .tools .arw { animation: k8t .25s ease-out 4.6s both; }
@keyframes k8t { from { background:transparent; color:rgba(255,255,255,.75); } to { background:#fff; color:#0f172a; } }
.s8 .tools .sel { animation: k8s .25s ease-out 4.6s both; }
@keyframes k8s { from { background:#fff; color:#0f172a; } to { background:transparent; color:rgba(255,255,255,.75); } }
.s8 .cols { position:absolute; left:16px; bottom:18px; width:62px; padding:10px 8px; border-radius:22px; background:rgba(255,255,255,.08); display:flex; flex-direction:column; align-items:center; gap:8px; }
.s8 .cols i { width:26px; height:26px; border-radius:99px; border:2px solid rgba(255,255,255,.25); }
.s8 .canvas { position:absolute; left:96px; width:1028px; top:175px; height:578px; border-radius:18px; overflow:hidden; }
.s8 .canvas .photo { background-position:center; }
.s8 svg.marks { position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible; }
.s8 .lbl { position:absolute; padding:8px 14px; border-radius:14px; font-size:17px; font-weight:900; color:#fff; white-space:nowrap; box-shadow:0 8px 20px rgba(0,0,0,.35); }
.s8 .toast { position:absolute; left:50%; top:96px; transform:translateX(-50%); display:flex; align-items:center; gap:12px; padding:12px 18px; border-radius:20px; font-size:14px; font-weight:800; color:#0f172a; z-index:5; }
.s8 .toast small { display:block; font-size:12px; font-weight:600; color:#64748b; }
.s8 .toast .ic { color:#7a14d6; }
`,
    html: `<div class="stage s8">${BG()}${brand()}
  ${copy({ eyebrow: 'Annoter', title: 'Montrez quoi regarder, <em>en un clic</em>.', sub: 'L’IA place les flèches et les cercles sur ce qu’il faut voir. Vous ajustez au crayon, à la flèche, au texte.' }).replace('<i></i>', `<i>${ic('crosshair', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s8" data-k="1" style="--d:.15s">
    <div class="an">
      <div class="an-top"><span class="x">${ic('x', 22)}</span><h3>Annoter l’image</h3>
        <span class="btn btn-a aib a-press" data-t="ai" style="--d:1.25s"><span class="a-out" style="--d:1.35s;opacity:0;display:inline-flex">${ic('sparkles', 18)}</span><span class="sp a-blip" style="--d:1.35s;--len:1.75s;display:inline-flex"><span class="a-spin" style="display:inline-flex">${ic('loader-circle', 18)}</span></span><span class="a-fade" style="--d:3.1s;display:inline-flex;position:absolute;left:20px">${ic('sparkles', 18)}</span>&nbsp;Annoter par IA</span>
        <span class="btn btn-p" style="height:48px;padding:0 22px;font-size:14px">${ic('check', 18)} Enregistrer</span></div>
      <div class="tools">${tools.map(([i, l], k) => `<span class="${k === 0 ? 'on sel' : ''}${k === 3 ? ' arw' : ''}" ${k === 3 ? 'data-t="arrow"' : ''} title="${l}">${ic(i, 22)}</span>`).join('')}</div>
      <div class="cols">${['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#fff'].map((col, k) => `<i style="background:${col};${k === 0 ? 'border-color:#fff' : ''}"></i>`).join('')}</div>
      <div class="canvas" data-t="canvas">
        <div class="photo" style="background-image:url(${img('panneau.jpg')})"></div>
        <svg class="marks" viewBox="0 0 1028 578">
          <g class="a-glow" style="--d:3.1s"><circle cx="193" cy="292" r="60" fill="none" stroke="#ef4444" stroke-width="9" class="a-draw" style="--l:380;--d:3.1s;--len:.6s" transform="rotate(-90 193 292)"/></g>
          <g class="a-glow" style="--d:3.35s"><circle cx="822" cy="289" r="104" fill="none" stroke="#facc15" stroke-width="9" class="a-draw" style="--l:660;--d:3.35s;--len:.7s" transform="rotate(-90 822 289)"/></g>
          <g><path d="M480 110 L 352 250" fill="none" stroke="#ef4444" stroke-width="10" stroke-linecap="round" class="a-draw" style="--l:200;--d:5.45s;--len:.9s"/><path d="M360 211 L 352 250 L 390 239" fill="none" stroke="#ef4444" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" class="a-fade" style="--d:6.3s"/></g>
        </svg>
        <span class="lbl a-pop" style="--d:3.25s;left:110px;top:372px;background:#ef4444">${ic('play', 16)} Démarrer ici</span>
        <span class="lbl a-pop" style="--d:3.5s;left:740px;top:130px;background:#eab308;color:#0f172a">Arrêt d’urgence</span>
        <span class="lbl a-pop" style="--d:6.55s;left:430px;top:52px;background:#ef4444">Arrêt : appuyer 2 s</span>
        <span data-t="a0" style="position:absolute;left:479px;top:109px;width:2px;height:2px"></span><span data-t="a2" style="position:absolute;left:351px;top:249px;width:2px;height:2px"></span>
      </div>
      <div class="toast glass-float a-blip" style="--d:3.4s;--len:2.4s">${ic('sparkles', 20)}<span>Marques ajoutées par l’IA<small>Touchez une marque pour la déplacer, l’agrandir ou la retirer.</small></span></div>
    </div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 9 · Traduire ═════════════════════════════ */
function s09() {
  const S = 's9', T = 11
  const c = cursor('c9', T, [
    pt(0, 300, 640),
    at(S, 'es', 1.0), at(S, 'es', 1.15, { click: true }),
    at(S, 'zh', 1.7), at(S, 'zh', 1.85, { click: true }),
    at(S, 'ar', 2.4), at(S, 'ar', 2.55, { click: true }),
    at(S, 'img', 3.2, { dx: -150 }), at(S, 'img', 3.35, { dx: -150, click: true }),
    at(S, 'go', 4.1), at(S, 'go', 4.3, { click: true }),
    at(S, 'go', 11, { dx: 40, dy: 60 }),
  ])
  const langs = [
    ['en', 'English', 'already'], ['es', 'Español'], ['pt', 'Português'], ['ar', 'العربية'], ['ht', 'Kreyòl ayisyen'], ['tl', 'Tagalog'], ['vi', 'Tiếng Việt'], ['zh', '中文'], ['uk', 'Українська'], ['pa', 'ਪੰਜਾਬੀ'],
  ]
  const sel = { es: 1.15, zh: 1.85, ar: 2.55 }
  const L = [
    { k: 'fr', code: 'FR', stepOf: 'Étape 2 sur 5', t: 'Retirez les copeaux des rails', w: 'Jamais d’air comprimé sur les rails.', wl: 'Attention', text: 'Brossez chaque rail de l’avant vers l’arrière.', next: 'Suivant', lbl: 'Point clé' },
    { k: 'zh', code: 'ZH', stepOf: 'Step 2 of 5', t: '清除导轨上的切屑', w: '切勿用压缩空气吹导轨。', wl: 'Caution', text: '用尼龙刷从前往后刷每条导轨。', next: 'Next', lbl: '要点' },
    { k: 'ar', code: 'AR', stepOf: 'Step 2 of 5', t: 'أزِل البُرادة عن القضبان', w: 'لا تستخدم الهواء المضغوط على القضبان أبدًا.', wl: 'Caution', text: 'نظّف كل قضيب بالفرشاة من الأمام إلى الخلف.', next: 'Next', lbl: 'نقطة أساسية', rtl: true },
    { k: 'es', code: 'ES', stepOf: 'Paso 2 de 5', t: 'Retire las virutas de los rieles', w: 'Nunca use aire comprimido en los rieles.', wl: 'Atención', text: 'Cepille cada riel de adelante hacia atrás.', next: 'Siguiente', lbl: 'Punto clave' },
  ]
  const win9 = [[0, 6.0], [6.0, 7.6], [7.6, 9.2], [9.2, 99]]
  const vis = (i) => {
    const [a, b] = win9[i]
    if (i === 0) return `class="lay a-out" style="--d:${b}s"`
    if (i === 3) return `class="lay a-fade" style="--d:${a}s"`
    return `class="lay a-blip" style="--d:${a}s;--len:${b - a + 0.2}s"`
  }
  return {
    label: 'TRADUIRE',
    notes: 'En quelques clics, on traduit l’instruction : les textes, mais aussi les annotations, les légendes et le texte des schémas. Au poste, chaque opérateur choisit sa langue.',
    css: `${c.css}
.s9 .mk { left:730px; top:110px; width:1150px; height:860px; }
.s9 .dlg { position:absolute; left:0; top:40px; width:600px; border-radius:36px; padding:30px; }
.s9 .dlg h3 { font-size:26px; font-weight:900; letter-spacing:-.05em; }
.s9 .dlg .in { margin-top:8px; font-size:14px; line-height:1.45; font-weight:600; color:#64748b; }
.s9 .dlg .al { margin-top:14px; display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 12px; border-radius:99px; background:#d1fae5; color:#065f46; font-size:12.5px; font-weight:900; }
.s9 .dlg .caps { margin-top:18px; color:#64748b; display:block; }
.s9 .lg { margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.s9 .lg span { position:relative; height:50px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; font-size:15px; font-weight:900; color:#1e293b; overflow:hidden; }
.s9 .lg span .on { position:absolute; inset:0; border-radius:16px; background-image:var(--grad); color:#fff; display:flex; align-items:center; justify-content:space-between; padding:0 16px; }
.s9 .lg .done { opacity:.55; }
.s9 .chk { margin-top:16px; display:flex; gap:12px; align-items:flex-start; font-size:14px; font-weight:800; color:#1e293b; }
.s9 .chk .bx { position:relative; width:26px; height:26px; border-radius:8px; border:2px solid #cbd5e1; flex-shrink:0; overflow:hidden; }
.s9 .chk .bx i { position:absolute; inset:-2px; display:flex; align-items:center; justify-content:center; color:#fff; background-image:var(--grad); }
.s9 .chk small { display:block; margin-top:3px; font-size:12px; font-weight:600; color:#64748b; line-height:1.4; }
.s9 .go { margin-top:18px; width:100%; height:56px; font-size:16px; position:relative; }
.s9 .prog { margin-top:12px; height:20px; position:relative; font-size:13px; font-weight:800; color:#475569; }
.s9 .prog > span { position:absolute; left:0; top:0; display:flex; align-items:center; gap:8px; white-space:nowrap; }
.s9 .phone { left:690px; top:0; width:420px; height:850px; }
.s9 .scr .ph { position:absolute; left:0; right:0; top:0; height:270px; background-size:cover; background-position:center; }
.s9 .scr .hd { position:absolute; left:0; right:0; top:0; height:110px; padding:58px 18px 0; display:flex; align-items:center; gap:10px; color:#fff; background:linear-gradient(180deg,rgba(15,23,42,.65),rgba(15,23,42,0)); z-index:3; }
.s9 .scr .hd .lc { margin-left:auto; height:38px; padding:0 12px; border-radius:14px; display:flex; align-items:center; gap:6px; font-size:14px; font-weight:900; background:rgba(255,255,255,.18); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
.s9 .scr .lc .cd { position:relative; width:24px; height:18px; }
.s9 .scr .lc .cd span { position:absolute; left:0; top:0; }
.s9 .lay { position:absolute; inset:0; }
.s9 .lay .lbl { position:absolute; left:150px; top:170px; padding:6px 12px; border-radius:12px; background:#ef4444; color:#fff; font-size:14px; font-weight:900; box-shadow:0 6px 14px rgba(0,0,0,.3); z-index:2; }
.s9 .lay .ring { position:absolute; left:110px; top:120px; width:120px; height:120px; border-radius:99px; border:6px solid #ef4444; z-index:2; }
.s9 .tx { position:absolute; left:0; right:0; top:270px; bottom:100px; padding:18px 20px; display:flex; flex-direction:column; gap:12px; }
.s9 .tx .sub2 { font-size:11px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:#64748b; }
.s9 .tx .h { display:flex; gap:12px; align-items:flex-start; }
.s9 .tx .n { width:50px; height:50px; border-radius:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:24px; font-weight:900; }
.s9 .tx h3 { font-size:25px; line-height:1.08; font-weight:900; letter-spacing:-.03em; }
.s9 .tx .w { display:flex; gap:10px; padding:12px 14px; border-radius:20px; ${WARN.caution}; font-size:15px; font-weight:900; line-height:1.25; }
.s9 .tx .p { font-size:17px; line-height:1.45; font-weight:700; color:#334155; }
.s9 .ft { position:absolute; left:14px; right:14px; bottom:22px; height:66px; border-radius:24px; display:flex; align-items:center; justify-content:center; gap:10px; color:#fff; font-size:19px; font-weight:900; background-image:var(--grad); box-shadow:var(--sh-p); }
.s9 [dir="rtl"] .h { flex-direction:row-reverse; text-align:right; }
.s9 [dir="rtl"] { text-align:right; }
.s9 .toast { position:absolute; left:40px; top:-6px; display:flex; align-items:center; gap:12px; padding:12px 18px; border-radius:20px; font-size:14px; font-weight:900; z-index:6; }
.s9 .toast .ic { color:#10b981; }
.s9 .toast small { display:block; font-size:12px; font-weight:600; color:#64748b; }
`,
    html: `<div class="stage s9">${BG()}${brand()}
  ${copy({ eyebrow: 'Traduire', title: 'Traduisez en <em>quelques clics</em>.', sub: 'Textes, annotations, légendes et schémas. Au poste, chaque opérateur choisit <b>sa langue</b>.' }).replace('<i></i>', `<i>${ic('languages', 20)}</i>`)}
  <div class="mk" data-mk="s9" data-k="1">
    <div class="dlg glass-float a-pop" style="--d:.15s">
      <h3>Traduire pour les opérateurs</h3>
      <p class="in">Les opérateurs choisissent leur langue dans le lecteur. Les annotations, les légendes, les outils et le texte des schémas se traduisent avec le reste.</p>
      <span class="al">${ic('check', 14)} Déjà traduite : English</span>
      <span class="caps">Les plus demandées</span>
      <div class="lg">${langs
        .map(([k, l, s]) => `<span class="glass-card ${s === 'already' ? 'done' : ''}" ${sel[k] ? `data-t="${k}"` : ''}>${l}${s === 'already' ? ic('check', 18) : ''}${sel[k] ? `<span class="on a-pop" style="--d:${sel[k]}s">${l}${ic('check', 18)}</span>` : ''}</span>`)
        .join('')}</div>
      <div class="chk" data-t="img"><span class="bx"><i class="a-pop" style="--d:3.35s">${ic('check', 18)}</i></span><span>Refaire aussi les images où il y a du texte<small>L’IA redessine, avec leur texte traduit, celles de ces 4 images où elle lit du texte. Vérifiez-les avant de publier.</small></span></div>
      <span class="btn btn-p go a-press" data-t="go" style="--d:4.25s">${ic('languages', 20)} Traduire</span>
      <div class="prog"><span class="a-blip" style="--d:4.35s;--len:1s"><span class="a-spin" style="display:inline-flex">${ic('loader-circle', 16)}</span> Traduction des textes…</span><span class="a-blip" style="--d:5.3s;--len:.75s"><span class="a-spin" style="display:inline-flex">${ic('loader-circle', 16)}</span> Images refaites : 1 sur 1…</span><span class="a-fade" style="--d:6s;color:#065f46">${ic('circle-check', 16)} Español, 中文 et العربية seront proposées dans le lecteur.</span></div>
    </div>
    <div class="toast glass-float a-blip" style="--d:6s;--len:2.6s">${ic('circle-check', 22)}<span>Traduction ajoutée<small>Proposée dans le lecteur à la prochaine publication.</small></span></div>
    <div class="phone a-right" style="--d:.3s"><span class="notch"></span><div class="scr">
      ${L.map((l, i) => `<div ${vis(i)} ${l.rtl ? 'dir="rtl"' : ''}>
        <div class="ph" style="background-image:url(${img('rails-brosse.jpg')})"></div>
        <span class="ring" style="left:118px;top:126px;width:104px;height:104px"></span><span class="lbl" style="left:${l.rtl ? 'auto' : '232px'};right:${l.rtl ? '196px' : 'auto'};top:160px">${l.lbl}</span>
        <div class="hd" dir="ltr">${ic('x', 24)}<span style="font-size:13px;font-weight:900;letter-spacing:.1em">${l.stepOf.toUpperCase()}</span><span class="lc">${ic('languages', 16)} ${l.code}</span></div>
        <div class="tx" style="background:#f8fafc"><div class="h"><span class="n grad sh-p">2</span><h3>${l.t}</h3></div><div class="w">${ic('triangle-alert', 20)}<span>${l.w}</span></div><p class="p">${l.text}</p></div>
        <div class="ft">${l.next} ${ic(l.rtl ? 'arrow-right' : 'arrow-right', 22)}</div>
      </div>`).join('')}
    </div></div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 10 · Moderniser (import en lot) ═════════════════════════════ */
function s10() {
  const S = 's10', T = 10
  const c = cursor('c10', T, [pt(0, -380, 660), at(S, 'stack', 1.0, { dx: 10 }), at(S, 'stack', 1.2, { dx: 10, click: true }), at(S, 'zone', 2.3), at(S, 'zone', 2.45, { click: true }), at(S, 'zone', 10, { dx: 160, dy: 260 })])
  const s0 = globalThis.TARGETS?.s10?.stack || [-300, 700]
  const s1 = globalThis.TARGETS?.s10?.zone || [500, 260]
  const p = (t) => ((t / T) * 100).toFixed(3) + '%'
  const files = [
    ['pdf', 'Presse P-12 — Changement de moule.pdf'],
    ['word', 'Ligne 3 — Démarrage du convoyeur.docx'],
    ['pdf', 'Tour CNC — Remplacement des mors.pdf'],
    ['pdf', 'Cadenassage — Compresseur C-2.pdf'],
    ['word', 'Emballeuse — Changement de format.docx'],
    ['pdf', 'Soudeuse robot — Nettoyage de la buse.pdf'],
  ]
  return {
    label: 'MODERNISER',
    notes: 'Vos anciennes instructions, en PDF ou en Word, se déposent par dizaines : chacune devient un brouillon structuré, prêt à relire. Le vieux cartable devient une bibliothèque vivante.',
    css: `${c.css}
@keyframes s10drag{0%{transform:none;opacity:1}${p(1.2)}{transform:none;opacity:1;animation-timing-function:cubic-bezier(.55,0,.2,1)}${p(2.3)}{transform:translate(${s1[0] - s0[0]}px,${s1[1] - s0[1]}px) scale(.85);opacity:1}${p(2.5)}{transform:translate(${s1[0] - s0[0]}px,${s1[1] - s0[1]}px) scale(.5);opacity:0}100%{transform:translate(${s1[0] - s0[0]}px,${s1[1] - s0[1]}px) scale(.5);opacity:0}}
@property --c10 { syntax:'<integer>'; inherits:false; initial-value:0; }
.s10 .old { position:absolute; left:96px; top:640px; width:560px; height:330px; border-radius:30px; overflow:hidden; box-shadow:0 30px 70px -20px rgba(15,23,42,.45); z-index:3; }
.s10 .old .tag { position:absolute; left:18px; top:18px; padding:8px 14px; border-radius:14px; font-size:14px; font-weight:900; display:flex; gap:8px; align-items:center; }
.s10 .mk { left:740px; top:96px; width:1120px; height:880px; }
.s10 .main { padding:30px 36px; display:flex; flex-direction:column; gap:16px; }
.s10 .zone { height:150px; border-radius:30px; border:2.5px dashed rgba(0,120,255,.35); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; }
.s10 .zone .ic { color:var(--primary); }
.s10 .zone b { font-size:18px; font-weight:900; }
.s10 .zone small { font-size:13px; font-weight:700; color:#64748b; }
.s10 .zone.hot { animation: k10h .9s ease-in-out 1.4s both; }
@keyframes k10h { 0% { background:transparent; } 30%, 80% { background:rgba(0,120,255,.1); border-color:#0078ff; } 100% { background:transparent; } }
.s10 .batch { border-radius:30px; padding:20px; }
.s10 .bh { display:flex; align-items:center; gap:12px; }
.s10 .bh b { font-size:18px; font-weight:900; letter-spacing:-.02em; flex:1; }
.s10 .bh .cnt { --c10:40; counter-reset: c var(--c10); animation: c10n 6.4s linear 2.7s both; font-size:15px; font-weight:900; color:#0f172a; }
.s10 .bh .cnt::before { content: counter(c) " sur 40 terminés"; }
@keyframes c10n { from { --c10:0; } to { --c10:40; } }
.s10 .pb { margin-top:12px; height:8px; border-radius:99px; background:rgba(15,23,42,.08); overflow:hidden; }
.s10 .pb i { display:block; height:100%; background-image:var(--grad); }
.s10 .rows { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.s10 .r { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:18px; }
.s10 .r .fi { width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
.s10 .r b { flex:1; font-size:14px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s10 .r .stt { position:relative; width:200px; height:30px; flex-shrink:0; }
.s10 .r .stt span { position:absolute; right:0; top:0; height:30px; padding:0 12px; border-radius:99px; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:900; white-space:nowrap; }
.s10 .s-up { background:rgba(15,23,42,.06); color:#475569; }
.s10 .s-ai { background:#f3e8ff; color:#7a14d6; }
.s10 .s-ok { background:#d1fae5; color:#065f46; }
.s10 .stack { position:absolute; left:-430px; top:560px; width:250px; z-index:50; animation: s10drag ${T}s linear both; }
.s10 .stack .pg { position:absolute; left:0; top:0; width:170px; height:210px; border-radius:14px; background:#fffdf7; box-shadow:0 10px 30px rgba(15,23,42,.3); border:1px solid #e7e2d3; }
.s10 .stack .pg i { display:block; height:7px; margin:14px 16px 0; border-radius:4px; background:#e2ddd0; }
.s10 .stack .n40 { position:absolute; left:140px; top:-14px; width:46px; height:46px; border-radius:99px; background:#0078ff; color:#fff; font-size:17px; font-weight:900; display:flex; align-items:center; justify-content:center; box-shadow:var(--sh-p); }
`,
    html: `<div class="stage s10">${BG()}${brand()}
  ${copy({ eyebrow: 'Moderniser', title: 'Vos vieilles instructions, <em>remises à neuf</em>.', sub: 'Déposez vos PDF et Word, même par dizaines : chacun devient un brouillon structuré, prêt à relire.', top: 'bottom:auto;top:150px;justify-content:flex-start' }).replace('<i></i>', `<i>${ic('file-up', 20)}</i>`)}
  <div class="old a-rise" style="--d:.4s"><div class="photo a-kb" style="background-image:url(${img('cartable.jpg')})"></div><span class="tag glass-float">${ic('archive', 16)} Le cartable d’aujourd’hui</span></div>
  <div class="mk a-rise" data-mk="s10" data-k="1" style="--d:.15s">
    ${win(
      `${side({ active: '', low: 'import' })}
      <div class="main">
        <div><h1 class="h1">Importer vos anciennes instructions</h1><p class="muted" style="margin-top:8px;font-size:15px">Déposez vos PDF et documents Word, même par dizaines : chacun devient un brouillon structuré, prêt à relire.</p></div>
        <div class="zone glass-card hot" data-t="zone">${ic('file-up', 34)}<b>Glissez vos fichiers ici, ou touchez pour les choisir</b><small>PDF, Word (.docx, .doc, .odt)</small></div>
        <div class="batch glass-panel a-rise" style="--d:2.55s">
          <div class="bh"><b>Import en cours</b><span class="cnt tnum"></span></div>
          <div class="pb"><i class="a-bar" style="--d:2.7s;--len:6.4s"></i></div>
          <div class="rows">${files
            .map(([k, n], i) => {
              const a = 2.7 + i * 0.35, b = a + 1.2 + i * 0.25, e = b + 1.3
              return `<div class="r glass-card a-rise" style="--d:${a.toFixed(2)}s"><span class="fi" style="background:${k === 'pdf' ? '#e11d48' : '#2563eb'}">${ic('file-text', 20)}</span><b>${n}</b><span class="stt"><span class="s-up a-blip" style="--d:${a.toFixed(2)}s;--len:${(b - a + 0.1).toFixed(2)}s">${ic('upload', 13)} Envoi et conversion…</span><span class="s-ai a-blip" style="--d:${b.toFixed(2)}s;--len:${(e - b + 0.1).toFixed(2)}s">${ic('sparkles', 13)} L’IA restructure…</span><span class="s-ok a-pop" style="--d:${e.toFixed(2)}s">${ic('check', 13)} Brouillon créé</span></span></div>`
            })
            .join('')}</div>
        </div>
      </div>`,
      { x: 0, y: 0, w: 1120, h: 880 },
    )}
    <div class="stack" data-t="stack"><span class="pg" style="transform:rotate(-8deg) translate(-10px,6px)"></span><span class="pg" style="transform:rotate(5deg) translate(12px,0)"></span><span class="pg">${'<i></i>'.repeat(9)}</span><span class="n40">40</span></div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 11 · Approuver ═════════════════════════════ */
function s11() {
  const S = 's11', T = 9
  const c = cursor('c11', T, [pt(0, 760, 700), at(S, 'row', 1.3), at(S, 'row', 1.5, { click: true }), at(S, 'mod', 2.9), at(S, 'approve', 4.2), at(S, 'approve', 4.4, { click: true }), at(S, 'approve', 9, { dx: -120, dy: 90 })])
  const conf = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 37) % 100, col = ['#0078ff', '#00c6ff', '#18c480', '#ffc800', '#9b2cfa', '#ff2b5e'][i % 6]
    return `<i style="left:${x}%;background:${col};--dx:${((i % 5) - 2) * 30}px;animation-delay:${(4.5 + (i % 7) * 0.05).toFixed(2)}s"></i>`
  }).join('')
  return {
    label: 'APPROUVER',
    notes: 'Si l’usine l’exige, l’instruction passe par un approbateur avant publication. Il voit les étapes modifiées, approuve en un clic, et la nouvelle version remplace l’ancienne partout : aux postes, dans les liens et les codes QR.',
    css: `${c.css}
.s11 .mk { left:740px; top:96px; width:1120px; height:880px; }
.s11 .main { padding:30px 36px; }
.s11 .home, .s11 .ed { position:absolute; left:264px; right:0; top:0; bottom:0; padding:30px 36px; }
.s11 .greet { font-size:34px; font-weight:900; letter-spacing:-.05em; }
.s11 .tiles { margin-top:18px; display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.s11 .tl { border-radius:26px; padding:16px; }
.s11 .tl b { display:block; font-size:30px; font-weight:900; letter-spacing:-.04em; }
.s11 .tl small { display:block; font-size:12.5px; font-weight:700; color:#64748b; }
.s11 .rv { margin-top:18px; border-radius:28px; padding:18px; }
.s11 .rv h4 { font-size:19px; font-weight:900; letter-spacing:-.02em; display:flex; align-items:center; gap:10px; }
.s11 .rv h4 .ic { color:#d97706; }
.s11 .rv p.h { margin-top:4px; font-size:13px; font-weight:700; color:#64748b; }
.s11 .rr { margin-top:12px; display:flex; align-items:center; gap:12px; padding:10px; border-radius:20px; }
.s11 .rr .th { width:76px; height:52px; border-radius:12px; background-size:cover; background-position:center; }
.s11 .rr b { display:block; font-size:15px; font-weight:900; }
.s11 .rr small { font-size:12.5px; font-weight:700; color:#64748b; }
.s11 .eh { display:flex; align-items:center; gap:10px; }
.s11 .eh h1 { flex:1; font-size:22px; font-weight:900; letter-spacing:-.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s11 .vb { position:relative; height:32px; width:240px; }
.s11 .vb span { position:absolute; right:0; top:0; height:32px; padding:0 12px; border-radius:99px; display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:900; white-space:nowrap; }
.s11 .bw { background:#fef3c7; color:#92400e; }
.s11 .bp { background:#d1fae5; color:#065f46; }
.s11 .req { margin-top:16px; border-radius:26px; padding:16px; display:flex; gap:14px; align-items:flex-start; }
.s11 .req .av { width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; background-image:var(--grad-ai); flex-shrink:0; }
.s11 .req b { display:block; font-size:15px; font-weight:900; }
.s11 .req q { display:block; margin-top:4px; font-size:14px; font-weight:600; color:#475569; quotes:"« " " »"; }
.s11 .req .bt { margin-top:12px; display:flex; gap:10px; }
.s11 .sts { margin-top:14px; display:flex; flex-direction:column; gap:9px; }
.s11 .sc { display:flex; align-items:center; gap:12px; padding:9px; border-radius:20px; position:relative; }
.s11 .sc .n { width:32px; height:32px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; flex-shrink:0; }
.s11 .sc .th { width:84px; height:56px; border-radius:12px; background-size:cover; background-position:center; flex-shrink:0; }
.s11 .sc b { flex:1; font-size:15px; font-weight:900; }
.s11 .mod { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; border-radius:99px; background:#fef3c7; color:#92400e; font-size:12px; font-weight:900; }
.s11 .sc.m { box-shadow:inset 4px 0 0 #f59e0b; }
.s11 .toast { position:absolute; left:50%; bottom:28px; transform:translateX(-50%); display:flex; align-items:center; gap:12px; padding:14px 20px; border-radius:20px; font-size:15px; font-weight:900; z-index:8; white-space:nowrap; }
.s11 .toast .ic { color:#10b981; }
.s11 .toast small { display:block; font-size:12.5px; font-weight:600; color:#64748b; }
.s11 .confetti { position:absolute; left:264px; right:0; top:0; height:0; z-index:7; }
.s11 .confetti i { position:absolute; top:-20px; width:10px; height:14px; border-radius:3px; opacity:0; animation: k11c 2.4s cubic-bezier(.2,.6,.4,1) both; }
@keyframes k11c { 0% { opacity:1; transform:translate(0,0) rotate(0); } 100% { opacity:0; transform:translate(var(--dx),860px) rotate(720deg); } }
`,
    html: `<div class="stage s11">${BG()}${brand()}
  ${copy({ eyebrow: 'Approuver', title: 'Rien n’est publié <em>sans approbation</em>.', sub: 'L’approbateur voit ce qui a changé et approuve d’un clic. La nouvelle version remplace l’ancienne <b>partout</b>.' }).replace('<i></i>', `<i>${ic('badge-check', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s11" data-k="1" style="--d:.15s">
    ${win(
      `${side({ active: 'home', name: 'Nathalie Gagnon', role: 'Approbatrice', initials: 'NG' })}
      <div class="home a-out" style="--d:1.65s">
        <p class="greet">Bon après-midi, Nathalie</p>
        <div class="tiles"><div class="tl glass-card"><b class="tnum">42</b><small>Publiées</small></div><div class="tl glass-card"><b class="tnum">18</b><small>Postes</small></div><div class="tl glass-card"><b class="tnum">1 284</b><small>Consultations · 7 jours</small></div></div>
        <div class="rv glass-panel"><h4>${ic('badge-check', 20)} À approuver (1)</h4><p class="h">Les étapes modifiées sont marquées dans l’éditeur.</p>
          <div class="rr glass-card a-press" data-t="row" style="--d:1.45s"><span class="th" style="background-image:url(${img('rails-brosse.jpg')})"></span><span style="flex:1"><b>${TITLE}</b><small>Mélanie Tremblay demande l’approbation · il y a 5 min</small></span>${ic('chevron-right', 20, 'muted')}</div>
        </div>
      </div>
      <div class="ed a-fade" style="--d:1.7s">
        <div class="eh">${ic('arrow-left', 20)}<h1>${TITLE}</h1><span class="vb"><span class="bw a-out" style="--d:4.9s;opacity:0">${ic('clock', 13)} En attente d’approbation</span><span class="bp a-pop" style="--d:4.9s">${ic('circle-check', 13)} Publiée · v3 · approuvée par Nathalie</span></span></div>
        <div class="req glass-panel"><span class="av">MT</span><span style="flex:1"><b>Mélanie Tremblay demande l’approbation · il y a 5 min</b><q>J’ai ajouté les gants à l’étape 2 et simplifié l’étape 3.</q>
          <span class="bt"><span class="btn btn-g b-md">Demander une correction</span><span class="btn btn-p b-md a-press" data-t="approve" style="--d:4.35s">${ic('badge-check', 18)} Approuver et publier</span></span></span></div>
        <div class="sts">${[0, 1, 2, 3].map((i) => `<div class="sc glass-card ${i === 1 || i === 2 ? 'm' : ''}" ${i === 1 ? 'data-t="mod"' : ''}><span class="n grad">${i + 1}</span><span class="th" style="background-image:url(${img(STEPS[i].img)})"></span><b>${STEPS[i].t}</b>${i === 1 || i === 2 ? `<span class="mod">${ic('pencil', 12)} Modifiée</span>` : ''}</div>`).join('')}</div>
      </div>
      <div class="confetti">${conf}</div>
      <div class="toast glass-float a-blip" style="--d:4.7s;--len:3.2s">${ic('circle-check', 24)}<span>Version 3 publiée<small>Elle remplace la version actuelle sur 2 postes et dans les liens partagés.</small></span></div>`,
      { x: 0, y: 0, w: 1120, h: 880 },
    )}
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 12 · Déployer au poste ═════════════════════════════ */
function s12() {
  const S = 's12', T = 9
  const c = cursor('c12', T, [pt(0, 960, 860), at(S, 'item', 5.0), at(S, 'item', 5.2, { click: true }), at(S, 'item', 9, { dx: 30, dy: 80 })], { kind: 'touch' })
  const items = [
    ['wrench', TITLE.replace(' — Machine 1234', ''), 'Maintenance · 5 étapes'],
    ['power', 'Démarrage de la machine', 'Démarrage et arrêt · 4 étapes'],
    ['refresh-cw', 'Changement d’outil', 'Changement de format · 6 étapes'],
    ['lock', 'Fiche de cadenassage', '2 sources d’énergie'],
  ]
  return {
    label: 'DÉPLOYER AU POSTE',
    notes: 'On déploie au poste : une tablette installée à la machine, ou un code QR que l’opérateur scanne avec son téléphone. Il voit d’abord les instructions de ce poste, sans compte ni mot de passe.',
    css: `${c.css}
.s12 .mk { left:720px; top:100px; width:1150px; height:880px; }
.s12 .pic { position:absolute; left:0; top:30px; width:860px; height:484px; border-radius:34px; overflow:hidden; box-shadow:0 40px 100px -25px rgba(15,23,42,.5); }
.s12 .pic .chip2 { position:absolute; left:20px; top:20px; padding:9px 14px; border-radius:16px; font-size:14px; font-weight:900; display:flex; align-items:center; gap:8px; }
.s12 .pic .chip2 .dot { width:9px; height:9px; border-radius:99px; background:#18c480; box-shadow:0 0 0 4px rgba(24,196,128,.25); }
.s12 .qc { position:absolute; left:30px; top:462px; width:600px; border-radius:32px; padding:22px; display:flex; gap:20px; }
.s12 .qc .q { padding:12px; border-radius:20px; background:#fff; box-shadow:0 8px 24px rgba(15,23,42,.12); }
.s12 .qc .caps { color:#64748b; }
.s12 .qc h4 { margin-top:4px; font-size:24px; font-weight:900; letter-spacing:-.04em; }
.s12 .qc .cd { font-size:13px; font-weight:800; color:#64748b; }
.s12 .qc .opt { margin-top:12px; display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:14px; background:var(--primary-soft); color:var(--primary-strong); font-size:13px; font-weight:900; }
.s12 .qc .bts { margin-top:10px; display:flex; gap:8px; }
.s12 .qc .bts span { height:40px; padding:0 12px; border-radius:14px; font-size:12.5px; }
.s12 .qc .opt { display:inline-flex; }
.s12 .qc > span:last-child { min-width:0; display:flex; flex-direction:column; align-items:flex-start; }
.s12 .phone { left:820px; top:150px; width:330px; height:676px; }
.s12 .cam { position:absolute; inset:0; background:#0b0f17; }
.s12 .cam .ph { position:absolute; inset:0; background-size:cover; background-position:50% 50%; filter:saturate(.9) brightness(.8); }
.s12 .cam .lbl { position:absolute; left:50%; top:46%; transform:translate(-50%,-50%); padding:12px; border-radius:14px; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,.4); }
.s12 .cam .lbl small { display:block; text-align:center; margin-top:6px; font-size:10px; font-weight:900; letter-spacing:.08em; color:#0f172a; }
.s12 .cam .fr { position:absolute; left:50%; top:46%; width:200px; height:200px; transform:translate(-50%,-56%); border-radius:26px; border:4px solid rgba(255,255,255,.9); animation: k12f .3s ease-out 2.9s both; }
@keyframes k12f { to { border-color:#18c480; box-shadow:0 0 0 6px rgba(24,196,128,.3); } }
.s12 .cam .scan { position:absolute; left:50%; top:46%; width:180px; height:3px; margin-left:-90px; background:#00c6ff; box-shadow:0 0 12px #00c6ff; animation: k12s 1.2s ease-in-out 1.6s 2 alternate both; }
@keyframes k12s { from { transform:translateY(-110px); } to { transform:translateY(70px); } }
.s12 .cam .aim { position:absolute; left:0; right:0; bottom:110px; text-align:center; color:#fff; font-size:14px; font-weight:800; }
.s12 .cam .top { position:absolute; left:0; right:0; top:56px; display:flex; justify-content:space-between; padding:0 18px; color:#fff; font-size:15px; font-weight:900; }
.s12 .list { position:absolute; inset:0; background:#f8fafc; padding:60px 16px 16px; }
.s12 .list .hd { display:flex; align-items:center; gap:10px; }
.s12 .list .hd .pin { width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; }
.s12 .list .hd b { display:block; font-size:19px; font-weight:900; letter-spacing:-.03em; }
.s12 .list .hd small { display:block; font-size:12px; font-weight:800; color:#64748b; }
.s12 .list .caps { display:block; margin:18px 0 8px; color:#64748b; }
.s12 .it { display:flex; align-items:center; gap:10px; padding:10px; border-radius:18px; margin-bottom:8px; }
.s12 .it .ii { width:40px; height:40px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; background-image:var(--grad); }
.s12 .it .ii.lk { background-image:linear-gradient(135deg,#FF2B5E,#FF6B00); }
.s12 .it b { display:block; font-size:14px; font-weight:900; line-height:1.15; }
.s12 .it small { display:block; font-size:11px; font-weight:700; color:#64748b; margin-top:2px; }
.s12 .intro { position:absolute; inset:0; background:#f8fafc; padding:60px 18px 18px; display:flex; flex-direction:column; gap:12px; }
.s12 .intro .caps { color:#64748b; }
.s12 .intro h3 { font-size:30px; line-height:.98; font-weight:900; letter-spacing:-.05em; }
.s12 .intro .ppe { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.s12 .intro .ppe span { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px 8px; border-radius:22px; color:#fff; font-size:12.5px; font-weight:900; background-image:linear-gradient(135deg,#2563eb,#0ea5e9); }
.s12 .intro .lk { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:18px; color:#fff; font-size:13px; font-weight:900; background-image:linear-gradient(135deg,#FF2B5E,#FF6B00); }
.s12 .intro .go { margin-top:auto; height:62px; border-radius:99px; font-size:20px; }
.s12 .nc { position:absolute; right:-6px; top:96px; padding:10px 16px; border-radius:18px; display:flex; align-items:center; gap:8px; font-size:15px; font-weight:900; z-index:9; }
.s12 .nc .ic { color:#18c480; }
`,
    html: `<div class="stage s12">${BG()}${brand()}
  ${copy({ eyebrow: 'Déployer', title: 'Au poste, <em>sans compte</em>.', sub: 'Une tablette à la machine, ou un code QR à scanner avec son téléphone : l’opérateur voit d’abord les instructions de son poste.' }).replace('<i></i>', `<i>${ic('qr-code', 20)}</i>`)}
  <div class="mk" data-mk="s12" data-k="1">
    <div class="pic a-rise" style="--d:.15s"><div class="photo a-kb" style="background-image:url(${img('poste-tablette.jpg')})"></div><span class="chip2 glass-float"><span class="dot"></span> Machine 1234 · tablette du poste</span></div>
    <div class="qc glass-float a-pop" style="--d:.8s"><span class="q">${qr(150)}</span><span style="flex:1"><span class="caps">Poste</span><h4>Machine 1234</h4><span class="cd">Code M-1234 · Usinage</span><span class="opt">${ic('target', 15)} Ce poste d’abord · les autres à un geste</span><span class="bts"><span class="btn btn-g">${ic('tablet', 15)} Ouvrir le mode tablette</span><span class="btn btn-g">${ic('printer', 15)} Imprimer l’étiquette</span></span></span></div>
    <div class="phone a-right" style="--d:1.2s"><span class="notch"></span><div class="scr">
      <div class="cam"><div class="ph" style="background-image:url(${img('expert-machine.jpg')})"></div><div class="top"><span>${ic('x', 22)}</span><span>Scanner un code</span><span></span></div><span class="lbl">${qr(118)}<small>CLIP · M-1234</small></span><span class="fr"></span><span class="scan"></span><p class="aim">Visez le code QR ou le code-barres</p></div>
      <div class="list a-zoom" style="--d:3.2s">
        <div class="hd"><span class="pin grad sh-p">${ic('map-pin', 22)}</span><span><b>Machine 1234</b><small>Ce poste d’abord · Usinage</small></span></div>
        <span class="caps">Instructions de ce poste</span>
        ${items.map(([i, t, s], k) => `<div class="it glass-card a-rise" style="--d:${(3.4 + k * 0.15).toFixed(2)}s" ${k === 0 ? 'data-t="item"' : ''}><span class="ii ${i === 'lock' ? 'lk' : ''}">${ic(i, 20)}</span><span><b>${t}</b><small>${s}</small></span></div>`).join('')}
      </div>
      <div class="intro a-right" style="--d:5.35s">
        <span class="caps">Avant de commencer</span>
        <h3>Nettoyage des rails</h3>
        <span class="lk">${ic('lock', 16)} 1 cadenas</span>
        <div class="ppe"><span>${ic('glasses', 30)} Lunettes</span><span>${ic('hand', 30)} Gants anticoupure</span></div>
        <span class="btn btn-p go">Commencer ${ic('arrow-right', 24)}</span>
      </div>
    </div></div>
    <span class="nc glass-float a-pop" style="--d:6.2s">${ic('shield-check', 18)} Sans compte, sans mot de passe</span>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 13 · Garder à jour (échéance) ═════════════════════════════ */
function s13() {
  const S = 's13', T = 9
  const c = cursor('c13', T, [pt(0, 400, 700), at(S, 'toggle', 1.3), at(S, 'toggle', 1.5, { click: true }), at(S, 'toggle', 9, { dx: -140, dy: 120 })])
  return {
    label: 'GARDER À JOUR',
    notes: 'Chaque instruction a une date de révision. Le responsable reçoit une alerte avant l’échéance, et les instructions à revoir remontent sur l’accueil : plus d’instruction périmée au plancher.',
    css: `${c.css}
@property --d13 { syntax:'<integer>'; inherits:false; initial-value:0; }
.s13 .mk { left:730px; top:110px; width:1140px; height:860px; }
.s13 .card { position:absolute; left:0; top:40px; width:600px; border-radius:36px; padding:28px; }
.s13 .card .cat { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:99px; background:var(--primary-soft); color:var(--primary-strong); font-size:12.5px; font-weight:900; }
.s13 .card h3 { margin-top:10px; font-size:28px; line-height:1.04; font-weight:900; letter-spacing:-.05em; }
.s13 .kv { margin-top:16px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.s13 .kv span { padding:12px 14px; border-radius:18px; }
.s13 .kv small { display:block; font-size:11px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; color:#64748b; }
.s13 .kv b { display:block; margin-top:3px; font-size:15px; font-weight:900; }
.s13 .rev { margin-top:18px; border-radius:26px; padding:18px; background:var(--primary-soft); }
.s13 .rev .caps { color:var(--primary-strong); display:flex; align-items:center; gap:8px; }
.s13 .rev .row { margin-top:12px; display:flex; gap:10px; }
.s13 .sel { flex:1; height:52px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; font-size:15px; font-weight:900; background:#fff; }
.s13 .date { flex:1; height:52px; border-radius:16px; display:flex; align-items:center; gap:8px; padding:0 14px; font-size:15px; font-weight:900; background:#fff; }
.s13 .date .ic { color:var(--primary); }
.s13 .tg { margin-top:12px; display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:18px; background:#fff; font-size:14px; font-weight:800; }
.s13 .tg .sw { position:relative; width:52px; height:30px; border-radius:99px; background:#cbd5e1; flex-shrink:0; animation: k13b .25s ease-out 1.5s both; }
.s13 .tg .sw i { position:absolute; left:3px; top:3px; width:24px; height:24px; border-radius:99px; background:#fff; box-shadow:0 2px 6px rgba(15,23,42,.25); animation: k13k .25s ease-out 1.5s both; }
@keyframes k13b { to { background:#0078ff; } }
@keyframes k13k { to { transform:translateX(22px); } }
.s13 .tg small { display:block; font-size:12px; font-weight:600; color:#64748b; }
.s13 .phone { left:680px; top:0; width:420px; height:850px; }
.s13 .lock { position:absolute; inset:0; background-image:linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#0ea5e9 130%); }
.s13 .lock .tm { position:absolute; left:0; right:0; top:110px; text-align:center; color:#fff; }
.s13 .lock .tm b { display:block; font-size:84px; font-weight:800; letter-spacing:-.04em; line-height:1; }
.s13 .lock .tm small { display:block; margin-top:6px; font-size:17px; font-weight:700; opacity:.85; }
.s13 .lock .dt { position:relative; display:inline-block; }
.s13 .nt { position:absolute; left:16px; right:16px; border-radius:26px; padding:14px; display:flex; gap:12px; background:rgba(255,255,255,.85); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); box-shadow:0 20px 40px -10px rgba(0,0,0,.45); }
.s13 .nt .ap { width:44px; height:44px; border-radius:14px; overflow:hidden; flex-shrink:0; }
.s13 .nt b { display:block; font-size:14px; font-weight:900; color:#0f172a; }
.s13 .nt p { margin-top:2px; font-size:13.5px; line-height:1.35; font-weight:600; color:#334155; }
.s13 .nt .hd { display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.06em; }
.s13 .nt .acts { margin-top:10px; display:flex; gap:8px; }
.s13 .nt .acts span { height:36px; padding:0 12px; border-radius:12px; font-size:12.5px; }
.s13 .bell { animation: k13r 1s ease-in-out 3.7s 2 both; transform-origin:50% 0; }
@keyframes k13r { 0%,100% { transform:rotate(0); } 20% { transform:rotate(14deg); } 40% { transform:rotate(-12deg); } 60% { transform:rotate(8deg); } 80% { transform:rotate(-4deg); } }
.s13 .home { position:absolute; left:0; top:560px; width:600px; border-radius:30px; padding:18px; }
.s13 .home h4 { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:900; }
.s13 .home h4 .ic { color:#d97706; }
.s13 .hr { margin-top:10px; display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:18px; }
.s13 .hr b { flex:1; font-size:14px; font-weight:900; }
.s13 .due { height:28px; padding:0 10px; border-radius:99px; display:inline-flex; align-items:center; font-size:12px; font-weight:900; }
`,
    html: `<div class="stage s13">${BG()}${brand()}
  ${copy({ eyebrow: 'Garder à jour', title: 'Plus jamais d’instruction <em>périmée</em>.', sub: 'Une date de révision pour chaque instruction, et une alerte au responsable <b>avant l’échéance</b>.' }).replace('<i></i>', `<i>${ic('calendar-clock', 20)}</i>`)}
  <div class="mk" data-mk="s13" data-k="1">
    <div class="card glass-float a-pop" style="--d:.15s">
      <span class="cat">${ic('wrench', 14)} Maintenance</span>
      <h3>${TITLE}</h3>
      <div class="kv"><span class="glass-card"><small>Version</small><b>Publiée · v3</b></span><span class="glass-card"><small>Approuvée par</small><b>Nathalie Gagnon</b></span></div>
      <div class="rev"><span class="caps">${ic('calendar-clock', 16)} Révision</span>
        <div class="row"><span class="sel">Tous les 12 mois ${ic('chevron-down', 18, 'muted')}</span><span class="date">${ic('calendar', 18)} 15 janvier 2027</span></div>
        <div class="tg" data-t="toggle"><span class="sw"><i></i></span><span>Alerter le responsable 14 jours avant<small>Mélanie Tremblay · courriel et notification</small></span></div>
      </div>
    </div>
    <div class="home glass-panel a-rise" style="--d:5.2s">
      <h4>${ic('calendar-clock', 20)} À revoir (3)</h4>
      <div class="hr glass-card"><b>Nettoyage des rails — Machine 1234</b><span class="due" style="background:#fef3c7;color:#92400e">Dans 14 jours</span></div>
      <div class="hr glass-card"><b>Changement de moule — Presse P-12</b><span class="due" style="background:#ffe4e6;color:#be123c">Échue depuis 3 jours</span></div>
    </div>
    <div class="phone a-right" style="--d:.35s"><span class="notch"></span><div class="scr"><div class="lock">
      <div class="tm"><span class="dt">${ic('lock', 18)}</span><b class="tnum">7:42</b><small>Vendredi 1<sup>er</sup> janvier</small></div>
      <div class="nt a-rise" style="--d:3.5s;top:330px">
        <span class="ap">${logoMark(44)}</span>
        <span style="flex:1"><span class="hd"><span>Clip</span><span>maintenant</span></span><b><span class="bell" style="display:inline-block">🔔</span> Instruction à revoir</b><p>« Nettoyage des rails — Machine 1234 » arrive à échéance dans 14 jours.</p>
        <span class="acts"><span class="btn btn-p">Revoir maintenant</span><span class="btn btn-g">Reporter</span></span></span>
      </div>
    </div></div></div>
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 14 · Exporter en PDF ═════════════════════════════ */
function s14() {
  const S = 's14', T = 9
  const c = cursor('c14', T, [pt(0, 640, 560), at(S, 'more', 1.0), at(S, 'more', 1.2, { click: true }), at(S, 'pdf', 2.0), at(S, 'pdf', 2.2, { click: true }), at(S, 'print', 5.2), at(S, 'print', 5.4, { click: true }), at(S, 'print', 9, { dx: -200, dy: 200 })])
  return {
    label: 'EXPORTER EN PDF',
    notes: 'Chaque instruction s’exporte en PDF, et en JSON, à tous les plans : le client reste propriétaire de ses données. Le PDF indique la version et renvoie, par code QR, à la version à jour.',
    css: `${c.css}
.s14 .mk { left:740px; top:96px; width:1120px; height:880px; }
.s14 .main { padding:24px 26px; }
.s14 .eh { display:flex; align-items:center; gap:10px; }
.s14 .eh h1 { flex:1; font-size:22px; font-weight:900; letter-spacing:-.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.s14 .more { width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; }
.s14 .menu { position:absolute; right:26px; top:76px; width:290px; border-radius:24px; padding:8px; z-index:6; }
.s14 .menu span { display:flex; align-items:center; gap:12px; height:46px; padding:0 14px; border-radius:16px; font-size:14.5px; font-weight:900; color:#1e293b; }
.s14 .menu .hl { animation: k14m .2s ease-out 2.0s both; }
@keyframes k14m { to { background:var(--primary-soft); color:var(--primary-strong); } }
.s14 .pv { position:absolute; left:264px; right:0; top:0; bottom:0; background:#f1f5f9; z-index:7; }
.s14 .pvbar { height:64px; display:flex; align-items:center; gap:12px; padding:0 18px; border-bottom:1px solid rgba(15,23,42,.06); }
.s14 .pvbar p { flex:1; font-size:13px; font-weight:700; color:#64748b; }
.s14 .page { position:absolute; left:50%; top:84px; width:560px; height:724px; margin-left:-280px; background:#fff; border-radius:6px; box-shadow:0 20px 50px -10px rgba(15,23,42,.3); padding:36px 38px; font-size:11px; color:#0f172a; }
.s14 .page .top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:2px solid #0f172a; padding-bottom:12px; }
.s14 .page h2 { font-size:23px; line-height:1.05; font-weight:900; letter-spacing:-.04em; }
.s14 .page .v { margin-top:6px; font-size:10.5px; font-weight:700; color:#475569; }
.s14 .page .qrb { text-align:center; font-size:8.5px; font-weight:800; color:#475569; }
.s14 .page .ppe { margin-top:12px; display:flex; gap:6px; }
.s14 .page .ppe span { padding:5px 9px; border-radius:8px; background:#e5f1ff; color:#0056d6; font-size:10px; font-weight:900; }
.s14 .page .grid { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.s14 .page .stp .im { height:118px; border-radius:6px; background-size:cover; background-position:center; }
.s14 .page .stp b { display:block; margin-top:6px; font-size:12.5px; font-weight:900; }
.s14 .page .stp p { margin-top:2px; font-size:10px; line-height:1.4; font-weight:600; color:#475569; }
.s14 .page .stp .n { display:inline-flex; width:18px; height:18px; border-radius:6px; align-items:center; justify-content:center; color:#fff; background:#0078ff; font-size:10px; font-weight:900; margin-right:6px; }
.s14 .page .ft { position:absolute; left:38px; right:38px; bottom:22px; display:flex; justify-content:space-between; font-size:8.5px; font-weight:700; color:#64748b; border-top:1px solid #e2e8f0; padding-top:8px; }
.s14 .file { position:absolute; right:30px; bottom:30px; display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:20px; z-index:9; }
.s14 .file .fi { width:44px; height:52px; border-radius:10px; background:#e11d48; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; }
.s14 .file b { display:block; font-size:14px; font-weight:900; }
.s14 .file small { display:block; font-size:12px; font-weight:700; color:#64748b; }
.s14 .stp-list { margin-top:18px; display:flex; flex-direction:column; gap:9px; }
.s14 .sc { display:flex; align-items:center; gap:12px; padding:9px; border-radius:20px; }
.s14 .sc .n { width:32px; height:32px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; }
.s14 .sc .th { width:84px; height:56px; border-radius:12px; background-size:cover; background-position:center; }
.s14 .sc b { font-size:15px; font-weight:900; }
`,
    html: `<div class="stage s14">${BG()}${brand()}
  ${copy({ eyebrow: 'Exporter', title: 'Un PDF propre, <em>en un clic</em>.', sub: 'PDF et JSON, à tous les plans : <b>vos instructions vous appartiennent</b>. Le PDF renvoie à la version à jour.' }).replace('<i></i>', `<i>${ic('file-down', 20)}</i>`)}
  <div class="mk a-rise" data-mk="s14" data-k="1" style="--d:.15s">
    ${win(
      `${side({ active: 'instructions' })}
      <div class="main">
        <div class="eh">${ic('arrow-left', 20)}<h1>${TITLE}</h1><span class="btn btn-g b-sm">${ic('share-2', 16)} Partager</span><span class="more glass-card a-press" data-t="more" style="--d:1.15s">${ic('ellipsis', 22)}</span></div>
        <div class="stp-list">${STEPS.map((s, i) => `<div class="sc glass-card"><span class="n grad">${i + 1}</span><span class="th" style="background-image:url(${img(s.img)})"></span><b>${s.t}</b></div>`).join('')}</div>
      </div>
      <div class="menu glass-float a-blip" style="--d:1.25s;--len:1.2s"><span>${ic('languages', 18)} Traduire</span><span>${ic('history', 18)} Versions</span><span class="hl" data-t="pdf">${ic('file-down', 18)} Exporter en PDF</span><span>${ic('braces', 18)} Exporter en JSON</span></div>
      <div class="pv a-fade" style="--d:2.4s">
        <div class="pvbar">${ic('arrow-left', 18)}<p>Aperçu du PDF — choisissez « Enregistrer en PDF » dans la fenêtre d’impression.</p><span class="btn btn-p b-md a-press" data-t="print" style="--d:5.35s">${ic('printer', 18)} Imprimer ou enregistrer en PDF</span></div>
        <div class="page a-rise" style="--d:2.6s">
          <div class="top"><div><div style="display:flex;align-items:center;gap:8px">${logoMark(26)}<span style="font-size:10px;font-weight:900;letter-spacing:.12em;color:#64748b">USINE DÉMO</span></div><h2 style="margin-top:10px">${TITLE}</h2><p class="v">Version 3 du 12 novembre 2026 · Approuvée par Nathalie Gagnon</p></div><div class="qrb">${qr(76)}<br>Version à jour</div></div>
          <div class="ppe"><span>Lunettes</span><span>Gants anticoupure</span><span style="background:#ffe4e6;color:#be123c">1 cadenas</span></div>
          <div class="grid">${STEPS.slice(0, 4).map((s, i) => `<div class="stp"><div class="im" style="background-image:url(${img(s.img)})"></div><b><span class="n">${i + 1}</span>${s.t}</b><p>${s.text}</p></div>`).join('')}</div>
          <div class="ft"><span>Toute copie imprimée peut être périmée : vérifiez la version dans l’app.</span><span>Page 1</span></div>
        </div>
      </div>
      <div class="file glass-float a-pop" style="--d:5.8s"><span class="fi">PDF</span><span><b>Nettoyage-des-rails-M1234.pdf</b><small>Enregistré · 2 pages</small></span>${ic('circle-check', 22)}</div>`,
      { x: 0, y: 0, w: 1120, h: 880 },
    )}
    ${c.html}
  </div>
</div>`,
  }
}

/* ═════════════════════════════ 15 · Place à la démo ═════════════════════════════ */
function s15() {
  const loop = [
    ['video', 'Capturer'],
    ['sparkles', 'Générer'],
    ['layers', 'Consulter'],
    ['wand-sparkles', 'Améliorer'],
  ]
  return {
    label: 'PLACE À LA DÉMO',
    notes: 'Capturer, générer, consulter, améliorer : c’est cette boucle qui garde le savoir-faire dans l’usine. Place à la démo.',
    css: `
.s15 .photo { opacity:.22; }
.s15 .ctr { position:absolute; left:0; right:0; top:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:34px; }
.s15 h2 { font-size:92px; line-height:.98; font-weight:900; letter-spacing:-.055em; color:#fff; max-width:1300px; }
.s15 h2 em { font-style:normal; background-image:linear-gradient(135deg,#5ad8ff,#3b9bff); -webkit-background-clip:text; background-clip:text; color:transparent; }
.s15 .loop { display:flex; align-items:center; gap:14px; }
.s15 .lp { display:flex; align-items:center; gap:12px; height:64px; padding:0 24px 0 12px; border-radius:24px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); color:#fff; font-size:22px; font-weight:900; animation: k15 .6s ease-out var(--d) both; }
.s15 .lp i { width:44px; height:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; background-image:var(--grad); box-shadow:var(--sh-p); }
@keyframes k15 { 0% { opacity:0; transform:translateY(18px); } 60% { opacity:1; background:rgba(0,120,255,.35); } 100% { opacity:1; transform:none; } }
.s15 .ar { color:rgba(255,255,255,.45); }
.s15 .cta { margin-top:10px; height:84px; padding:0 44px; border-radius:99px; font-size:26px; gap:14px; }
`,
    html: `<div class="stage s15">${BG(true)}
  <div class="photo" style="background-image:url(${img('usine-large.jpg')})"></div>
  <div class="ctr">
    <span class="a-pop a-float" style="--d:.1s;display:inline-flex">${logoMark(120)}</span>
    <h2 class="a-rise" style="--d:.35s">Le savoir-faire <em>reste dans l’usine</em>.</h2>
    <div class="loop">${loop.map(([i, l], k) => `${k ? `<span class="ar a-fade" style="--d:${(0.9 + k * 0.35).toFixed(2)}s">${ic('arrow-right', 28)}</span>` : ''}<span class="lp" style="--d:${(0.8 + k * 0.35).toFixed(2)}s"><i>${ic(i, 24)}</i>${l}</span>`).join('')}</div>
    <span class="btn btn-p cta a-pop" style="--d:2.4s">${ic('play', 28)} Place à la démo</span>
  </div>
</div>`,
  }
}

export const slides = [s01(), s02(), s03(), s04(), s05(), s06(), s07(), s08(), s09(), s10(), s11(), s12(), s13(), s14(), s15()]
