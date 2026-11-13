// Partagé par toutes les scènes du film Clip : palette et fond de l'app (apps/web/src/app/globals.css),
// états de la forme, écrans de l'app (clips/_ui.js, repris du deck), photos et clips.
const $=id=>document.getElementById(id);
const C={ink:'#0f172a',slate:'#475569',muted:'#64748b',tert:'#94a3b8',line:'#E2E8F0',white:'#FFFFFF',
  blue:'#0078ff',blue2:'#0056d6',cyan:'#00c6ff',soft:'#e5f1ff',violet:'#9b2cfa',indigo:'#2c62fa',
  ok:'#18c480',danger:'#ff2b5e',orange:'#ff6b00',warn:'#ffc800',night:'#0a0f18'};
const GRAD={blue:'linear-gradient(135deg,#00c6ff 0%,#0078ff 100%)',ai:'linear-gradient(135deg,#9b2cfa 0%,#2c62fa 100%)',
  danger:'linear-gradient(135deg,#FF2B5E,#FF6B00)',caution:'linear-gradient(135deg,#FFC800,#FF9F00)'};
// le fond signature de l'app (orbes bleu, cyan et ciel sur blanc cassé), figé : le même dans toutes les scènes
const BG=`radial-gradient(1300px 1100px at 4% -10%, rgba(59,130,246,.26), transparent 62%),
 radial-gradient(1150px 1000px at 104% 108%, rgba(6,182,212,.28), transparent 62%),
 radial-gradient(900px 760px at 52% 46%, rgba(56,189,248,.12), transparent 62%), #F4F7FB`;
const CENTER=[960,540];
const CURSOR_REST=[420,330];

// heures des mots : W('v04','part') = début local du mot (sans avance) ; P/E = début/fin d'une phrase
const scene=()=>({T:window.__T, W:(p,w)=>M.at(w,{p,off:0}), P:p=>M.phrase(p).start, E:p=>M.phrase(p).end});
const WA=(p,w)=>M.at(w,{p,off:0})+(window.__IN||0);
const mmss=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};

// ---------- états de l'unique forme ----------
const SH_BLEED=M.bleed(1920,1080,1,'#0f172a');                 // plein cadre (clips, photos)
const SH_CARD ={w:1240,h:698,r:40,bg:'#1E293B',cam:1.0};         // photo en carte 16:9
const SH_WIN  ={w:1120,h:880,r:26,bg:'#F8FAFC',cam:1.13};        // fenêtre de l'app (deck : 1120 × 880)
const SH_WIN7 ={w:1140,h:880,r:26,bg:'#F8FAFC',cam:1.13};        // éditeur + assistant
const SH_GEN  ={w:540,h:600,r:40,bg:'#FFFFFF',cam:1.32};         // « L'IA rédige votre instruction »
const SH_RES  ={w:525,h:790,r:34,bg:'#FFFFFF',cam:1.18};         // l'instruction générée
const SH_TAB  ={w:1324,h:816,r:48,bg:'#0f172a',cam:1.15};        // tablette : écran 1280 × 772 (rapport de la vitre de la photo)
const SH_PHL  ={w:1330,h:648,r:84,bg:'#0B1220',cam:1.0};         // téléphone en paysage : écran 1290 × 608 (vitre 2,12)
const SH_PHONE={w:420,h:850,r:54,bg:'#0f172a',cam:1.08};         // téléphone (lecteur traduit)
const SH_ANNOT={w:1140,h:860,r:26,bg:'#020617',cam:1.12};        // annoter l'image
const SH_PDF  ={w:600,h:780,r:10,bg:'#FFFFFF',cam:1.22};         // la page PDF
const SH_ICON ={w:240,h:240,r:68,bg:'#0078ff',cam:1.45};         // le logo seul
const SH_LOGO ={w:820,h:250,r:125,bg:'#FFFFFF',cam:1.3};         // logo + CLIP
const SH_FIN  ={w:1360,h:560,r:64,bg:'#FFFFFF',cam:1.12};        // la promesse et l'appel à l'action
const TW=1280, TH=772, PW=1290, PH=608;

// vitres des photos (pixels de la photo, HG HD BD BG) — screen_composite.py plongee ; l'interface y est déjà incrustée
const ECRAN_TABLETTE={iw:2688,ih:1520,quad:[[784.7,485.5],[1606.5,485.4],[1605.7,980.0],[782.6,983.7]]};
const ECRAN_TELEPHONE={iw:2688,ih:1520,quad:[[550.1,896.9],[985.0,895.6],[981.2,1111.5],[544.6,1109.3]]};

// ---------- photos et clips dans la forme ----------
const PHOTO=(id,src)=>`<img id="${id}" src="${src}" style="position:absolute;object-fit:cover;background:#334155;transform-origin:50% 50%">`;
const VIDEO=(id,src,poster)=>`<video id="${id}" src="${src}" poster="${poster}" muted playsinline preload="auto" style="position:absolute;object-fit:cover;background:#334155;transform-origin:50% 50%"></video>`;
const fitPhoto=(el,g,k=1,fx=0,fy=0)=>{el.style.left=(-g.w/2)+'px';el.style.top=(-g.h/2)+'px';el.style.width=g.w+'px';el.style.height=g.h+'px';
  el.style.transform=`translate(${fx}px,${fy}px) scale(${k})`;};
const syncVideo=(el,local,o)=>M.video(el,local,o);

// ---------- écrans de l'app (_ui.js) ----------
// Vignettes : déclarées une fois ici (une seule image intégrée par scène) ; une scène peut demander la grande image.
const ui=(name,big={})=>UI[name].replace(/%([a-z-]+)%/g,(m,k)=>big[k]||(typeof THUMB!=='undefined'&&THUMB[k])||'');
// un écran posé au centre de la forme, à sa taille de maquette (w × h), avec la classe de sa slide (s4, s6…)
const SCREEN=(name,cls,w,h,big)=>`<div class="ui ${cls}" style="left:${-w/2}px;top:${-h/2}px;width:${w}px;height:${h}px">${ui(name,big)}</div>`;
let uiCss=false; const useUI=()=>{ if(uiCss) return; uiCss=true; document.head.insertAdjacentHTML('beforeend',`<style>${UI_CSS}${CHIP_CSS}</style>`); };
const useChips=()=>document.head.insertAdjacentHTML('beforeend',`<style>${CHIP_CSS}</style>`);

// ---------- pastilles de verre (comme les callouts du film K2 V2) ----------
const CHIP_CSS=`
.chip2{position:absolute;height:66px;padding:0 26px 0 12px;border-radius:999px;display:flex;align-items:center;gap:14px;white-space:nowrap;
  background:rgba(255,255,255,.9);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.95);box-shadow:0 14px 36px rgba(15,23,42,.28);
  color:#0f172a;font-family:'Inter',system-ui,sans-serif;font-size:25px;font-weight:900;letter-spacing:-.01em}
.chip2 i{width:46px;height:46px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:${GRAD.blue};box-shadow:0 8px 18px rgba(0,120,255,.3)}
.chip2.dark{background:rgba(15,23,42,.62);border-color:rgba(255,255,255,.16);color:#fff}
.chip2 small{font-size:18px;font-weight:700;color:#64748b;letter-spacing:0}
.chip2.dark small{color:rgba(255,255,255,.75)}
.dot2{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:99px;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.35),0 4px 14px rgba(0,0,0,.4)}
.big2{position:absolute;font-family:'Inter',system-ui,sans-serif;font-weight:900;letter-spacing:-.055em;white-space:nowrap;color:#fff}
`;
const CHIP=(id,icon,text,sub='',dark=false,iconBg='')=>`<div class="chip2${dark?' dark':''}" id="${id}"><i${iconBg?` style="background:${iconBg}"`:''}>${M.icon(icon,26,'#fff',2.4)}</i>${text}${sub?`<small>${sub}</small>`:''}</div>`;

// ---------- le logo de Clip (LogoMark de src/components/Logo.tsx) ----------
let LOGO_N=0; const LOGO=(n)=>UI_LOGO(n).replace(/clipg\d+/g,'clipv'+(++LOGO_N));   // un id de dégradé par instance
const WORDMARK=(fs,color=C.ink)=>`<span style="font-family:'Inter',system-ui,sans-serif;font-weight:900;font-size:${fs}px;letter-spacing:-.06em;color:${color}">CLIP</span>`;
// l'arc du « C » du logo, à dessiner (stroke-dashoffset) : même tracé que le logo, dans un repère 64 × 64
const ARC=(n,id)=>`<svg width="${n}" height="${n}" viewBox="0 0 64 64" style="position:absolute;left:${-n/2}px;top:${-n/2}px;overflow:visible"><path id="${id}" d="M41.5 22.5a13 13 0 1 0 0 19" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="70" stroke-dashoffset="70"/><circle id="${id}d" cx="44" cy="32" r="4" fill="#fff" opacity="0"/></svg>`;

// ---------- pilotage des écrans du deck (leurs animations CSS sont coupées : tout se règle ici, image par image) ----------
let CAP=null;
// « Nouvelle instruction » : la vidéo arrive du téléphone, puis photo, note vocale, PDF et Word (une carte Word ajoutée)
const CAPTURE_SETUP=()=>{
  const root=document.querySelector('.ui.s4');
  root.querySelector('.files')?.remove();
  const cards=root.querySelector('.cards'); const src=[...cards.children];      // note vocale, vidéo, photo, PDF
  const word=src[3].cloneNode(true);
  word.querySelector('b').textContent='methode-nettoyage.docx';
  word.querySelector('.th').style.backgroundImage='linear-gradient(135deg,#3b82f6,#1d4ed8)';
  const ok=word.querySelector('.ok'); ok.innerHTML=ok.innerHTML.replace('3 pages','2 pages');
  const list=[src[1],src[2],src[0],src[3],word]; cards.append(...list);
  list.slice(1).forEach(c=>c.style.opacity=0);
  const cnt=root.querySelector('.notes h4 .a-fade'), msg=root.querySelector('.float .msg .a-fade');
  const gen=root.querySelector('.gen'), spark=gen.querySelector('.a-out'), spin=gen.querySelector('.spin'), spinIn=spin.querySelector('.a-spin');
  spark.style.opacity=1; spin.style.opacity=0; spinIn.style.display='inline-flex';
  CAP={cards:list, gen,
    count:(n)=>{M.setText(cnt,String(n)); M.setText(msg,`${n} note${n>1?'s':''} prête${n>1?'s':''}. L’IA va les analyser.`);},
    loading:(on,t)=>{spark.style.opacity=on?0:1; spin.style.opacity=on?1:0; spinIn.style.transform=`rotate(${(t*400)%360}deg)`;}};
  return CAP;
};
// « L'IA rédige votre instruction » : quatre étapes, l'horloge qui court (accélérée), les vignettes des extraits
const GEN_SETUP=()=>{
  const root=document.querySelector('.ui.s5 .gp');
  const lis=[...root.querySelectorAll('ol > li')].filter(li=>!li.classList.contains('thumbs'));
  const thumbs=[...root.querySelectorAll('li.thumbs span')], el=root.querySelector('.el');
  const parts=lis.map(li=>({li,pend:li.querySelector('.pend'),act:li.querySelector('.act'),done:li.querySelector('.done'),spin:li.querySelector('.act .a-spin')}));
  const G={
    update:(t,st,t0)=>{
      const s=Math.round(102*M.eio(M.clamp((t-t0)/(st[3][1]-t0)))); el.style.setProperty('--m5',String(Math.floor(s/60))); el.style.setProperty('--s5',String(s%60));
      parts.forEach((q,i)=>{ const [a,b]=st[i], on=t>=a&&t<b, dn=t>=b;
        q.pend.style.opacity=(!on&&!dn)?1:0; q.act.style.opacity=on?1:0; q.done.style.opacity=dn?1:0;
        if(q.spin){q.spin.style.display='inline-flex'; q.spin.style.transform=`rotate(${(t*400)%360}deg)`;}
        q.li.style.background=on?'var(--primary-soft)':'transparent'; q.li.style.opacity=(on||dn)?1:0.7;
        if(i===3) q.li.style.display=t>=a-0.05?'flex':'none'; });
      thumbs.forEach((th,j)=>M.rise(th,t,st[1][0]+0.12+0.18*j,null,{dy:10,lin:0.2}));
    },
    done:()=>{ parts.forEach(q=>{q.pend.style.opacity=0;q.act.style.opacity=0;q.done.style.opacity=1;q.li.style.background='transparent';q.li.style.opacity=1;q.li.style.display='flex';});
      el.style.setProperty('--m5','1'); el.style.setProperty('--s5','42'); return G; },
  };
  return G;
};
// l'assistant d'édition : la demande, « Je lis l'instruction… », les changements, et l'instruction qui change sous les yeux
const AGENT_SETUP=()=>{
  const root=document.querySelector('.ui.s7'), q=s=>root.querySelector(s), qa=s=>[...root.querySelectorAll(s)];
  const ub=q('.ub'), ab=q('.ab'), rd=q('.ab .rd'), acts=qa('.ab .act'), undo=q('.ab .undo'), intro=q('.ag-i');
  const cards=qa('.list .sc'), chip=cards[1].querySelector('.pp'), glows=qa('.list .glow');
  const old3=cards[2].querySelector('.tx .old'), new3=cards[2].querySelector('.tx .a-fade');
  const typed=q('.ag-in .f .a-blip'); if(typed) typed.style.opacity=0; const ph=q('.ag-in .f .ph'); if(ph) ph.style.opacity=1;
  return {update:(t,tR,tMot)=>{
    intro.style.opacity=t<tR?1:0;
    M.rise(ub,t,tR,null,{dy:14,lin:0.25}); M.rise(ab,t,tR+0.3,null,{dy:14,lin:0.25});
    rd.style.opacity=(t>=tR+0.3&&t<tMot)?1:0;
    acts.forEach((a,i)=>a.style.opacity=M.clamp((t-tMot-0.25*i)/0.2).toFixed(3)); undo.style.opacity=M.clamp((t-tMot-0.6)/0.2).toFixed(3);
    M.rise(chip,t,tMot,null,{dy:8,lin:0.2});
    glows.forEach((g,i)=>g.style.opacity=M.pulse(t,tMot+0.35+0.25*i,0.6).toFixed(3));
    const sw=M.clamp((t-tMot-0.25)/0.25); old3.style.opacity=(1-sw).toFixed(3); new3.style.opacity=sw.toFixed(3);
  }};
};
// annoter l'image : « Annoter par IA », puis les cercles qui se tracent et leurs étiquettes
const ANNOT_SETUP=()=>{
  const root=document.querySelector('.ui.s8');
  const circles=[...root.querySelectorAll('svg.marks circle')], lens=circles.map(c=>parseFloat(c.style.getPropertyValue('--l'))||600);
  [...root.querySelectorAll('svg.marks path')].forEach(p=>p.style.opacity=0);
  const lbls=[...root.querySelectorAll('.lbl')]; if(lbls[2]) lbls[2].style.opacity=0;
  const btn=root.querySelector('.aib'), sp=btn.querySelector('.sp'), sp0=btn.querySelector('.a-out'), sp2=btn.querySelector('.a-fade'), spin=sp.querySelector('.a-spin');
  const toast=root.querySelector('.toast');
  return {update:(t,tBtn,tClic)=>{
    btn.style.transform=`scale(${(1-0.05*M.pulse(t,tBtn+0.04,0.12)).toFixed(4)})`;
    const busy=t>=tBtn&&t<tClic; sp.style.opacity=busy?1:0; sp0.style.opacity=0; sp2.style.opacity=busy?0:1;
    if(spin){spin.style.display='inline-flex'; spin.style.transform=`rotate(${(t*400)%360}deg)`;}
    circles.forEach((c,i)=>{ const k=M.eio((t-tClic-0.15*i)/0.45); c.style.strokeDasharray=lens[i]; c.style.strokeDashoffset=(lens[i]*(1-k)).toFixed(1); c.parentNode.style.opacity=k>0?1:0; });
    M.rise(lbls[0],t,tClic+0.3,null,{dy:10,lin:0.2}); M.rise(lbls[1],t,tClic+0.45,null,{dy:10,lin:0.2});
    toast.style.opacity=M.clamp((t-tClic-0.4)/0.2).toFixed(3);
  }};
};
// un doigt qui touche l'écran (tablette, téléphone) : un rond blanc qui s'enfonce et un anneau qui s'ouvre
const TOUCH=(id)=>`<div id="${id}" style="position:absolute;left:0;top:0;width:0;height:0;opacity:0;z-index:30"><span style="position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:99px;background:rgba(255,255,255,.55);border:3px solid #fff;box-shadow:0 6px 18px rgba(15,23,42,.35)"></span><span class="rg" style="position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:99px;border:3px solid #fff"></span></div>`;
const touchAt=(el,t,taps)=>{ // taps : [[t0,x,y],…] ; visible autour de chaque toucher
  let best=null; for(const p of taps) if(t>=p[0]-0.35&&t<=p[0]+0.45) best=p; if(!best){el.style.opacity=0;return;}
  const [t0,x,y]=best, k=M.clamp((t-(t0-0.35))/0.18)*(1-M.clamp((t-(t0+0.3))/0.15));
  el.style.opacity=k.toFixed(3); el.style.left=x+'px'; el.style.top=y+'px';
  const pr=M.pulse(t,t0,0.1); el.firstElementChild.style.transform=`scale(${(1-0.18*pr).toFixed(3)})`;
  const r=M.clamp((t-t0)/0.4); const rg=el.querySelector('.rg'); rg.style.opacity=t>=t0?(0.9*(1-r)).toFixed(3):0; rg.style.transform=`scale(${(0.4+1.2*r).toFixed(3)})`;
};
// « Pas clair ? » au poste : la fiche de retour de l'opérateur (FeedbackSheet, libellés du lecteur)
const FB_CSS=`.fbs{position:absolute;left:0;right:0;bottom:0;height:330px;border-radius:34px 34px 0 0;background:rgba(255,255,255,.97);box-shadow:0 -20px 50px rgba(15,23,42,.25);padding:26px 34px;font-family:'Inter',system-ui,sans-serif;color:#0f172a;z-index:20}
.fbs h4{font-size:30px;font-weight:900;letter-spacing:-.04em}
.fbs .ks{margin-top:18px;display:flex;gap:12px}
.fbs .ks span{height:64px;padding:0 22px;border-radius:22px;display:flex;align-items:center;gap:10px;font-size:20px;font-weight:900;color:#fff}
.fbs .ta{margin-top:18px;height:70px;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;padding:0 20px;display:flex;align-items:center;font-size:19px;font-weight:600;color:#94a3b8}
.fbs .ks span.sel{box-shadow:0 0 0 4px #fff,0 0 0 8px #f59e0b}`;
const FEEDBACK_SHEET=(id)=>`<div class="fbs" id="${id}"><h4>Qu’est-ce qui ne va pas ?</h4><div class="ks">
 <span id="${id}k0" style="background:linear-gradient(135deg,#fbbf24,#f97316)">${M.icon('message',26,'#fff',2.4)} Pas clair</span>
 <span style="background:linear-gradient(135deg,#8b5cf6,#4f46e5)">${M.icon('alert',26,'#fff',2.4)} Erreur</span>
 <span style="background:linear-gradient(135deg,#FF2B5E,#FF6B00)">${M.icon('shield',26,'#fff',2.4)} Danger</span>
 <span style="background:linear-gradient(135deg,#0ea5e9,#2563eb)">${M.icon('sparkle',26,'#fff',2.4)} Idée</span></div>
 <div class="ta">Expliquez en quelques mots (facultatif)</div></div>`;

// ---------- l'énergie, comme le film K2 V2 : effets sonores, coups de caméra, apparitions qui claquent, éclats ----------
// SFX(...) : les effets sonores de la scène (banque scripts/sfx.py, celle du film K2 V2), posés AUX MÊMES INSTANTS que
// l'image : [t local (s), son, gain dB, {dur, fade}]. scripts/sfx-cues.mjs les relève dans chaque page et les place sur
// la ligne de temps du film ; scripts/sfx-mix.py les mélange à la voix. Un whoosh culmine après son début : « court »
// 0,28 s (WH), « long » 0,63 s (WL), « plongée » 0,6 s (WP) ; le « riser » finit 2,4 s après le sien (RISE).
window.__SFX=window.__SFX||[];
const SFX=(...cues)=>{ for(const c of cues) if(c&&Number.isFinite(c[0])) window.__SFX.push(c); };
const WH=0.28, WL=0.63, WP=0.6, RISE=2.4;
// une pastille qui tombe : un tic au départ, un pop quand elle se pose
const SFX_CHIP=(t0,db=0)=>SFX([t0,'tick',-12+db],[t0+0.1,'pop',-14+db]);
// PUNCH([[t, force]]) : un coup bref de caméra (zoom de quelques %) ; dans geom : g.s*=1+punch(t)
const PUNCH=(list)=>M.track(0,list.flatMap(([t,a=0.025])=>[[t-0.035,a,[55,1]],[t+0.045,0,[16,1]]]));
// POP(el,t,t0) : une apparition qui claque (monte, grossit, dépasse un peu, se pose) ; remplace M.rise pour les pastilles
const SPRING=M.track(0,[[0,1,[24,0.5]]]);
const POP=(el,t,t0,o={})=>{ const f=o.from??0.7, v=M.rise(el,t,t0,o.tout??null,{dy:14,lin:0.14,...o});
  if(v.o>0.002&&t>=t0) el.style.transform+=` scale(${(f+(1-f)*SPRING(t-t0)).toFixed(4)})`; return v; };
// FLASH() : un éclat plein cadre, au-dessus de tout et hors caméra ; dans extra : fl(t,[[t0, force, durée]])
const FLASH=(color='#ffffff')=>{ const d=document.createElement('div');
  d.style.cssText=`position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;background:${color};opacity:0;z-index:20`;
  document.getElementById('stage').appendChild(d);
  return (t,list)=>{ let o=0; for(const [t0,a=0.85,w=0.35] of list){ const u=t-t0; if(u>0) o=Math.max(o,a*Math.min(1,u/0.034)*Math.exp(-2.3*u/w)); }
    d.style.opacity=o.toFixed(4); }; };
