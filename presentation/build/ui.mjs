// Composants de l'app Clip, en HTML statique, pour les maquettes du deck (et les écrans incrustés).
import { ic, logoMark } from './lib.mjs'

export const img = (f) => globalThis.IMG(f)

/** Une cible du curseur, mesurée dans le rendu (measure.mjs) ; repli au centre si elle n'est pas encore mesurée. */
export function at(slide, key, t, opt = {}) {
  const v = globalThis.TARGETS?.[slide]?.[key]
  const [x, y] = v ? v : [opt.fx ?? 500, opt.fy ?? 400]
  return { t, x: Math.round(x + (opt.dx || 0)), y: Math.round(y + (opt.dy || 0)), click: !!opt.click }
}
export const pt = (t, x, y, click = false) => ({ t, x, y, click })

export const BG = (night = false) => `<div class="bg${night ? ' night' : ''}"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="grain"></div></div>`

export const brand = (dark = false) => `<div class="brand${dark ? ' on-dark' : ''}">${logoMark(34)}<b>CLIP</b></div>`

/** Colonne de texte de gauche : sur-titre, titre, sous-titre. */
export function copy({ n, eyebrow, title, sub, ai = false, extra = '', top = '' }) {
  return `<div class="copy" ${top ? `style="${top}"` : ''}>
    <div class="eyebrow${ai ? ' ai' : ''} a-rise" style="--d:.1s"><i>${n || ''}</i>${eyebrow}</div>
    <h2 class="title${ai ? ' ai' : ''} a-rise" style="--d:.22s">${title}</h2>
    ${sub ? `<p class="sub a-rise" style="--d:.38s">${sub}</p>` : ''}
    ${extra}
  </div>`
}

/** La barre latérale de l'app (AppShell). */
export function side({ active = 'home', low = '', name = 'Mélanie Tremblay', role = 'Rédactrice', initials = 'MT', feedback = 3 } = {}) {
  const items = [
    ['home', 'house', 'Accueil'],
    ['instructions', 'book-open', 'Instructions'],
    ['postes', 'map-pin', 'Postes'],
    ['retours', 'message-square-warning', 'Retours'],
    ['stats', 'chart-column', 'Statistiques'],
  ]
  return `<aside class="side glass-nav">
    <div class="logo">${logoMark(40)}<span><b>CLIP</b><small>Usine Démo</small></span></div>
    <span class="btn btn-p new">${ic('plus', 20)} Nouvelle instruction</span>
    <nav class="nav">${items
      .map(([k, i, l]) => `<a class="${k === active ? 'on' : ''}">${ic(i, 20)}<span>${l}</span>${k === 'retours' && feedback ? `<span class="badge tnum">${feedback}</span>` : ''}</a>`)
      .join('')}</nav>
    <div class="low">
      <a>${ic('scan-line', 16)} Scanner un code</a>
      <a class="${low === 'import' ? 'on' : ''}">${ic('upload', 16)} Importer des documents</a>
      <a>${ic('settings', 16)} Réglages</a>
      <div class="me glass-card"><span class="av">${initials}</span><span style="flex:1;min-width:0"><b>${name}</b><small>${role}</small></span>${ic('log-out', 16, 'muted')}</div>
    </div>
  </aside>`
}

/** Fenêtre d'application (bureau). */
export const win = (inner, { x, y, w, h, cls = '', style = '' }) =>
  `<div class="win ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${style}"><div class="win-bar"><span></span><span></span><span></span></div><div class="win-body">${BG()}${inner}</div></div>`

/** Les étapes de l'instruction d'exemple (le même contenu partout). */
export const STEPS = [
  { t: 'Cadenassez la machine', img: 'cadenas.jpg', w: { lvl: 'danger', label: 'Danger', text: 'Ne jamais ouvrir la porte sans cadenas.' }, text: 'Coupez le sectionneur, puis posez votre cadenas et votre étiquette.', kp: ['Vérifiez l’arrêt complet de la broche'] },
  { t: 'Retirez les copeaux des rails', img: 'rails-brosse.jpg', w: { lvl: 'caution', label: 'Attention', text: 'Jamais d’air comprimé sur les rails.' }, text: 'Brossez chaque rail de l’avant vers l’arrière.', kp: ['Brosse en nylon seulement', 'Gants anticoupure'] },
  { t: 'Huilez les rails', img: 'rails-huile.jpg', w: { lvl: 'info', label: 'Bon à savoir', text: 'Un mince filet d’huile suffit.' }, text: 'Huilez chaque rail d’un mince filet, puis essuyez l’excédent.', kp: ['Huile pour glissières seulement'] },
  { t: 'Retirez votre cadenas', img: 'cadenas.jpg', text: 'Fermez la porte, puis retirez votre cadenas et votre étiquette.', kp: [] },
  { t: 'Remettez en marche', img: 'panneau.jpg', text: 'Appuyez sur le bouton vert et vérifiez que les axes se déplacent sans bruit.', kp: [] },
]
export const TITLE = 'Nettoyage des rails — Machine 1234'

export const WARN = {
  danger: 'background-image:linear-gradient(135deg,#FF2B5E,#FF6B00);color:#fff',
  caution: 'background-image:linear-gradient(135deg,#FFC800,#FF9F00);color:#0f172a',
  info: 'background-image:var(--grad);color:#fff',
}

/**
 * Le lecteur pas-à-pas (src/components/player/Player.tsx), vue « tablette » (paysage, lg).
 * steps : [{n, total, t, img, w, text, kp, lang}] ; plusieurs états superposés, chacun avec sa fenêtre de temps.
 */
export function playerFrame({ states, total = 5, header = {}, footer = {}, extraMedia = '' }) {
  return `<div class="pl">
    <div class="pl-head glass-nav">
      <span class="pl-x">${ic('x', 24)}</span>
      <div class="pl-tt">
        <p class="pl-title">${header.title || TITLE}</p>
        <div class="pl-sub caps">${states.map((s) => `<span class="pl-st ${s.cls || ''}" ${s.style || ''}>${s.stepOf}</span>`).join('')}</div>
      </div>
      <span class="pl-hb">${ic('languages', 20)} <span class="pl-langs">${states.map((s) => `<span class="pl-st ${s.cls || ''}" ${s.style || ''}>${s.langCode || 'FR'}</span>`).join('')}</span></span>
      <span class="pl-hb listen ${header.listenCls || ''}" data-t="listen">${ic('volume-2', 20)} <span>${header.listen || 'Écouter'}</span></span>
    </div>
    <div class="pl-prog"><i class="${header.progCls || ''}" style="${header.progStyle || 'width:40%'}"></i></div>
    <div class="pl-body">
      ${states
        .map(
          (s) => `<div class="pl-step ${s.cls || ''}" ${s.style || ''} ${s.dir ? `dir="${s.dir}"` : ''}>
        <div class="pl-media" dir="ltr"><div class="ph" style="background-image:url(${img(s.img)})"></div>${s.media || ''}</div>
        <div class="pl-text">
          <div class="pl-h"><span class="pl-n grad sh-p">${s.n}</span><h3>${s.t}</h3></div>
          ${s.w ? `<div class="pl-warn" style="${WARN[s.w.lvl]}">${ic('triangle-alert', 26)}<div><p class="caps" style="opacity:.9">${s.w.label}</p><p class="pl-wt">${s.w.text}</p></div></div>` : ''}
          <p class="pl-p">${s.text}</p>
          ${s.kp && s.kp.length ? `<div class="pl-kp"><p class="caps">${s.kpLabel || 'Points clés'}</p>${s.kp.map((k) => `<p class="pl-k">${ic('check', 18)} ${k}</p>`).join('')}</div>` : ''}
          <div class="pl-acts">
            <span class="btn glass-card pl-b amber">${ic('message-circle-question', 18)} ${s.unclear || 'Pas clair ?'}</span>
            <span class="btn glass-card pl-b">${ic('send', 18)} ${s.ask || 'Poser une question'}</span>
            <span class="btn btn-a pl-b">${ic('mic', 18)} ${s.voice || 'Assistant vocal'}</span>
          </div>
        </div>
      </div>`,
        )
        .join('')}
      ${extraMedia}
    </div>
    <div class="pl-foot glass-nav">
      <span class="btn glass-card pl-prev">${ic('arrow-left', 26)} ${footer.prev || 'Précédent'}</span>
      <span class="btn btn-p pl-next" data-t="next">${footer.next || 'Suivant'} ${ic('arrow-right', 26)}</span>
    </div>
  </div>`
}

export const PLAYER_CSS = `
.pl { position:absolute; inset:0; display:flex; flex-direction:column; background:#f8fafc; }
.pl-head { height:64px; display:flex; align-items:center; gap:8px; padding:0 18px; border-bottom:1px solid rgba(15,23,42,.06); }
.pl-x { width:48px; height:48px; display:flex; align-items:center; justify-content:center; border-radius:16px; color:#334155; }
.pl-tt { flex:1; min-width:0; }
.pl-title { font-size:18px; font-weight:900; letter-spacing:-.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pl-sub, .pl-langs { position:relative; display:block; height:15px; color:#64748b; }
.pl-langs { display:inline-block; width:24px; height:20px; color:inherit; }
.pl-sub .pl-st, .pl-langs .pl-st { position:absolute; left:0; top:0; white-space:nowrap; }
.pl-hb { height:48px; display:flex; align-items:center; gap:6px; padding:0 12px; border-radius:16px; font-size:14px; font-weight:900; color:#0f172a; }
.pl-hb.listen { background:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.72); box-shadow:0 8px 30px rgba(15,23,42,.05); }
.pl-prog { height:6px; background:rgba(15,23,42,.05); }
.pl-prog i { display:block; height:100%; background-image:var(--grad); }
.pl-body { position:relative; flex:1; min-height:0; }
.pl-step { position:absolute; inset:0; display:flex; }
.pl-media { position:relative; flex:1.45; background:#0f172a; overflow:hidden; }
.pl-media .ph { position:absolute; inset:0; background-size:cover; background-position:center; }
.pl-text { width:470px; padding:26px 28px; display:flex; flex-direction:column; gap:16px; }
.pl-h { display:flex; align-items:flex-start; gap:16px; }
.pl-n { width:62px; height:62px; flex-shrink:0; border-radius:22px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:30px; font-weight:900; }
.pl-h h3 { padding-top:4px; font-size:31px; line-height:1.04; font-weight:900; letter-spacing:-.05em; }
.pl-warn { display:flex; gap:12px; align-items:flex-start; padding:14px 16px; border-radius:24px; box-shadow:0 10px 15px -3px rgba(0,0,0,.1); }
.pl-wt { font-size:17px; line-height:1.25; font-weight:900; }
.pl-p { font-size:20px; line-height:1.45; font-weight:700; color:#334155; }
.pl-kp { border-radius:24px; background:var(--primary-soft); padding:14px 16px; display:flex; flex-direction:column; gap:6px; }
.pl-kp .caps { color:var(--primary-strong); margin-bottom:2px; }
.pl-k { display:flex; gap:8px; align-items:center; font-size:17px; font-weight:700; color:#1e293b; }
.pl-k .ic { color:var(--primary); }
.pl-acts { margin-top:auto; display:flex; flex-wrap:wrap; gap:8px; }
.pl-b { height:44px; padding:0 14px; border-radius:16px; font-size:13px; }
.pl-b.amber { color:#b45309; }
.pl-foot { height:100px; display:flex; gap:12px; padding:12px 18px; border-top:1px solid rgba(15,23,42,.06); }
.pl-prev { flex:1; height:76px; border-radius:28px; font-size:18px; color:#334155; }
.pl-next { flex:2; height:76px; border-radius:28px; font-size:21px; letter-spacing:.03em; gap:12px; }
`
