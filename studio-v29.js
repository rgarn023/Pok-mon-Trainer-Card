(() => {
'use strict';

const $ = id => document.getElementById(id);
const kinds = ['trainer','buddy','looking','favorite'];
const fresh = () => ({
  trainer:{cx:.5,cy:.44,w:.62,h:.72},
  buddy:{cx:.5,cy:.45,r:.31},
  looking:{cx:.5,cy:.5,r:.30},
  favorite:{cx:.5,cy:.5,r:.30}
});
const state = fresh();
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const applyTimers = {};
let gifTimer = null;
let sharedPanel = null;

function css(){
  if ($('#tc33css')) return;
  const s = document.createElement('style');
  s.id = 'tc33css';
  s.textContent = `
    .tcLayer{position:absolute;inset:0;z-index:30;display:none;pointer-events:none}
    .cropEditing .tcLayer{display:block}
    .tcMove{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;
      width:64px!important;height:64px!important;margin:-32px 0 0 -32px!important;
      border:3px solid #fff!important;border-radius:50%!important;
      background:color-mix(in srgb,var(--accent) 28%,rgba(5,8,13,.96))!important;
      box-shadow:0 4px 18px rgba(0,0,0,.68),0 0 0 4px rgba(0,0,0,.24)!important}
    .tcMove:after{content:'MOVE';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      color:#fff;font:900 9px/1 system-ui;pointer-events:none}
    .tcH{position:absolute;z-index:35;width:64px;height:64px;margin:-32px 0 0 -32px;border:3px solid #fff;
      border-radius:50%;background:rgba(5,8,13,.97);color:#fff;display:grid;place-items:center;
      font:900 23px/1 system-ui;box-shadow:0 4px 18px rgba(0,0,0,.7),0 0 0 5px rgba(0,0,0,.25);
      pointer-events:auto;touch-action:none;user-select:none}
    .tcH.big{width:70px;height:70px;margin:-35px 0 0 -35px}
    .tcH:active{background:var(--accent);color:#080b10}
    .tcBadge{position:absolute;z-index:36;top:8px;left:8px;display:none;padding:6px 9px;border:1px solid var(--accent);
      border-radius:999px;background:rgba(5,8,13,.92);color:var(--accent2);font-size:9px;font-weight:900;pointer-events:none}
    .cropEditing .tcBadge{display:block}
    .cropModeBtn{min-height:50px!important}
    .cropAdjustBlock,.cropResult,.localSlotPreview{display:none!important}

    .sharedMediaBox{margin:0 0 14px;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 42%,var(--line));
      border-radius:16px;background:color-mix(in srgb,var(--accent) 7%,rgba(255,255,255,.02))}
    .sharedMediaBox h3{margin:0 0 4px;font-size:14px}
    .sharedMediaBox p{margin:0 0 10px;color:var(--muted);font-size:9px;line-height:1.45}
    .sharedMediaPick{position:relative;display:flex;align-items:center;justify-content:center;min-height:52px;padding:10px 12px;
      border:1px dashed color-mix(in srgb,var(--accent) 48%,var(--line));border-radius:12px;color:var(--accent2);
      font-size:11px;font-weight:900;background:rgba(255,255,255,.02)}
    .sharedMediaPick input{position:absolute;inset:0;opacity:0}
    .sharedMediaStatus{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;
      padding:8px 9px;border-radius:11px;background:rgba(5,8,13,.58);font-size:9px}
    .sharedMediaStatus span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#dce5ef}
    .sharedMediaStatus b{flex:0 0 auto;color:var(--accent2);font-size:8px}
    .sharedMediaNote{margin-top:7px;color:var(--muted);font-size:8px;line-height:1.35}
    .legacySharedUpload{display:none!important}
    .sharedCropLabel{display:inline-flex;align-items:center;gap:6px;margin:0 0 7px;padding:5px 8px;border-radius:999px;
      border:1px solid var(--line);background:rgba(255,255,255,.03);font-size:8px;font-weight:900;color:var(--accent2)}

    body.sharedCardWatch .previewPanel,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel{
      position:fixed!important;z-index:120!important;right:10px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;
      top:auto!important;width:148px!important;padding:5px!important;border:1px solid color-mix(in srgb,var(--accent) 55%,var(--line))!important;
      border-radius:16px!important;background:rgba(7,10,16,.95)!important;box-shadow:0 12px 36px rgba(0,0,0,.68)!important;
      pointer-events:none!important
    }
    body.sharedCardWatch .previewPanel .previewHead,
    body.sharedCardWatch .previewPanel .flipHint,
    body.sharedCardWatch .previewPanel .previewActions,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .previewHead,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .flipHint,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .previewActions{display:none!important}
    body.sharedCardWatch .previewPanel .canvasWrap,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .canvasWrap{padding:0!important;perspective:none!important}
    body.sharedCardWatch .previewPanel .canvasWrap:before,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .canvasWrap:before{display:none!important}
    body.sharedCardWatch .previewPanel .cardStage,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardStage{width:136px!important;max-width:136px!important;pointer-events:none!important;cursor:default!important}
    body.sharedCardWatch .previewPanel .cardFlipper,
    body.sharedCardWatch .previewPanel .cardFlipper.flipped,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardFlipper,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardFlipper.flipped{transform:none!important;transition:none!important}
    body.sharedCardWatch .previewPanel .cardBack,
    body.sharedCardWatch .previewPanel .cardEmpty,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardBack,
    body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardEmpty{display:none!important}

    @media(max-width:520px){
      .cropModeBar{align-items:stretch}
      .cropModeBtn{width:100%}
      .cropModeHelp{flex-basis:100%;min-width:0;text-align:center}
      .tcMove{width:70px!important;height:70px!important;margin:-35px 0 0 -35px!important}
      body.sharedCardWatch .previewPanel,
      body:has(.cropCanvasWrap.cropEditing) .previewPanel{width:132px!important;right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important}
      body.sharedCardWatch .previewPanel .cardStage,
      body:has(.cropCanvasWrap.cropEditing) .previewPanel .cardStage{width:120px!important;max-width:120px!important}
    }
  `;
  document.head.appendChild(s);
}

function send(c,t,id,x,y){
  const ev = new PointerEvent(t,{
    bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pressure:t==='pointerup'?0:.5
  });
  if (t==='pointerdown' && c.setPointerCapture){
    const old = c.setPointerCapture;
    try { c.setPointerCapture = ()=>{}; c.dispatchEvent(ev); }
    finally { c.setPointerCapture = old; }
  } else c.dispatchEvent(ev);
}

function pt(c,x,y){
  const r=c.getBoundingClientRect();
  return {x:r.left+x*r.width,y:r.top+y*r.height};
}

function geom(k){
  const c=$(k+'CropCanvas'), s=state[k];
  if (!c) return null;
  if (k==='trainer') return {cx:s.cx,cy:s.cy,w:s.w,h:s.h};
  const m=Math.min(c.width||1,c.height||1);
  return {cx:s.cx,cy:s.cy,rx:s.r*m/(c.width||1),ry:s.r*m/(c.height||1)};
}

function paint(k){
  const g=geom(k),m=$(k+'Move');
  if(!g||!m)return;
  if(k==='trainer'){
    m.style.left=`${g.cx*100}%`;m.style.top=`${g.cy*100}%`;
    const w=$(k+'W'),h=$(k+'H'),b=$(k+'B');
    w.style.left=`${(g.cx+g.w/2)*100}%`;w.style.top=`${g.cy*100}%`;
    h.style.left=`${g.cx*100}%`;h.style.top=`${(g.cy+g.h/2)*100}%`;
    b.style.left=`${(g.cx+g.w/2)*100}%`;b.style.top=`${(g.cy+g.h/2)*100}%`;
  }else{
    m.style.left=`${g.cx*100}%`;m.style.top=`${g.cy*100}%`;
    const r=$(k+'R');r.style.left=`${(g.cx+g.rx)*100}%`;r.style.top=`${g.cy*100}%`;
  }
}

function anchor(k,modeName){
  const c=$(k+'CropCanvas'),s=state[k];
  if(k==='trainer'){
    if(modeName==='move')return pt(c,s.cx,s.cy);
    if(modeName==='w')return pt(c,s.cx+s.w/2,s.cy);
    if(modeName==='h')return pt(c,s.cx,s.cy+s.h/2);
    return pt(c,s.cx+s.w/2,s.cy+s.h/2);
  }
  const m=Math.min(c.width||1,c.height||1),rx=s.r*m/(c.width||1);
  return modeName==='move'?pt(c,s.cx,s.cy):pt(c,s.cx+rx,s.cy);
}

function local(k,modeName,start,dx,dy,rect,c){
  const s=state[k];
  if(k==='trainer'){
    if(modeName==='move'){
      s.cx=clamp(start.cx+dx/rect.width,start.w/2,1-start.w/2);
      s.cy=clamp(start.cy+dy/rect.height,start.h/2,1-start.h/2);
    }else{
      if(modeName==='w'||modeName==='both')s.w=clamp(start.w+2*dx/rect.width,.18,.96);
      if(modeName==='h'||modeName==='both')s.h=clamp(start.h+2*dy/rect.height,.20,.96);
      s.cx=clamp(start.cx,s.w/2,1-s.w/2);
      s.cy=clamp(start.cy,s.h/2,1-s.h/2);
    }
  }else{
    const m=Math.min(c.width||1,c.height||1);
    if(modeName==='move'){
      s.cx=start.cx+dx/rect.width;s.cy=start.cy+dy/rect.height;
      const rx=s.r*m/(c.width||1),ry=s.r*m/(c.height||1);
      s.cx=clamp(s.cx,rx,1-rx);s.cy=clamp(s.cy,ry,1-ry);
    }else{
      const ix=dx*(c.width||1)/rect.width;
      s.r=clamp(start.r+ix/m,.08,.48);
      const rx=s.r*m/(c.width||1),ry=s.r*m/(c.height||1);
      s.cx=clamp(s.cx,rx,1-rx);s.cy=clamp(s.cy,ry,1-ry);
    }
  }
}

function scheduleApply(k,now=false){
  clearTimeout(applyTimers[k]);
  applyTimers[k]=setTimeout(()=>$(k+'ApplyCrop')?.click(),now?0:80);
}

function drag(el,k,modeName){
  el.addEventListener('pointerdown',e=>{
    const c=$(k+'CropCanvas'),wrap=c?.closest('.cropCanvasWrap');
    if(!c||!wrap?.classList.contains('cropEditing')||c.width<=1)return;
    e.preventDefault();e.stopPropagation();
    const id=e.pointerId||77,rect=c.getBoundingClientRect(),start={...state[k]},
      a=anchor(k,modeName),sx=e.clientX,sy=e.clientY;
    el.setPointerCapture?.(e.pointerId);
    send(c,'pointerdown',id,a.x,a.y);
    const mv=q=>{
      const dx=q.clientX-sx,dy=q.clientY-sy;
      local(k,modeName,start,dx,dy,rect,c);paint(k);
      send(c,'pointermove',id,a.x+dx,a.y+dy);scheduleApply(k);
      q.preventDefault();
    };
    const up=q=>{
      el.removeEventListener('pointermove',mv);
      el.removeEventListener('pointerup',up);
      el.removeEventListener('pointercancel',up);
      const dx=(q.clientX??sx)-sx,dy=(q.clientY??sy)-sy;
      send(c,'pointerup',id,a.x+dx,a.y+dy);scheduleApply(k,true);
      q.preventDefault();
    };
    el.addEventListener('pointermove',mv);
    el.addEventListener('pointerup',up);
    el.addEventListener('pointercancel',up);
  });
}

function mode(k,on){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap'),b=$(k+'Mode'),h=$(k+'Help');
  if(!c||!w||!b)return;
  if(on&&c.width<=1){if(h)h.innerHTML='<strong>Choose the shared source first.</strong>';return;}
  kinds.forEach(x=>{
    if(x!==k && $(x+'CropCanvas')?.closest('.cropCanvasWrap')?.classList.contains('cropEditing'))mode(x,false);
  });
  w.classList.toggle('cropEditing',on);
  b.classList.toggle('active',on);
  b.textContent=on?'Done adjusting':'Adjust crop';
  b.setAttribute('aria-pressed',on?'true':'false');
  if(h)h.innerHTML=on
    ?'<strong>Adjust:</strong> drag MOVE or a resize handle. Swipe elsewhere on the image to scroll.'
    :'<strong>Scroll:</strong> swipe over the screenshot normally.';
  paint(k);
}

function layer(k){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap');
  if(!c||!w)return;
  const badge=document.createElement('div');
  badge.className='tcBadge';badge.textContent='ADJUST';
  w.appendChild(badge);
  const l=document.createElement('div');
  l.className='tcLayer';l.id=k+'Layer';
  if(k==='trainer'){
    l.innerHTML=`<div id="${k}Move" class="tcMove"></div>
      <button id="${k}W" class="tcH" type="button">↔</button>
      <button id="${k}H" class="tcH" type="button">↕</button>
      <button id="${k}B" class="tcH big" type="button">↘</button>`;
  }else{
    l.innerHTML=`<div id="${k}Move" class="tcMove"></div>
      <button id="${k}R" class="tcH big" type="button">↔</button>`;
  }
  w.appendChild(l);
  drag($(k+'Move'),k,'move');
  if(k==='trainer'){
    drag($(k+'W'),k,'w');drag($(k+'H'),k,'h');drag($(k+'B'),k,'both');
  }else drag($(k+'R'),k,'r');
  paint(k);
}

function controls(k){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap');
  if(!c||!w)return;
  const bar=document.createElement('div');
  bar.className='cropModeBar';
  bar.innerHTML=`<button id="${k}Mode" class="cropModeBtn" type="button" aria-pressed="false">Adjust crop</button>
    <div id="${k}Help" class="cropModeHelp"><strong>Scroll:</strong> swipe over the screenshot normally.</div>`;
  w.insertAdjacentElement('afterend',bar);
  $(k+'Mode').onclick=()=>mode(k,!w.classList.contains('cropEditing'));
  $(k+'ShotInput')?.addEventListener('change',()=>{
    Object.assign(state[k],fresh()[k]);
    mode(k,false);
    setTimeout(()=>{paint(k);scheduleApply(k,true)},140);
  });
}

function putFile(input,file){
  if(!input||!file)return;
  try{
    const dt=new DataTransfer();
    dt.items.add(file);
    input.files=dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(e){
    console.error('Could not copy shared file to crop input',e);
  }
}

function stopGif(){
  if(gifTimer){clearInterval(gifTimer);gifTimer=null;}
}

function startGif(){
  stopGif();
  gifTimer=setInterval(()=>{
    if(document.hidden)return;
    $('trainerApplyCrop')?.click();
    $('buddyApplyCrop')?.click();
  },150);
}

function installSharedMedia(){
  const trainerInput=$('trainerShotInput'),buddyInput=$('buddyShotInput');
  if(!trainerInput||!buddyInput)return;
  sharedPanel=trainerInput.closest('section.panel');
  if(!sharedPanel)return;

  const head=sharedPanel.querySelector('.panelhead');
  const h2=head?.querySelector('h2'),p=head?.querySelector('p'),chip=head?.querySelector('.chip');
  if(h2)h2.textContent='Trainer + buddy from one source';
  if(p)p.textContent='Choose one Pokémon GO screenshot or animated GIF. Crop the trainer and buddy independently from that same source while watching the real card preview.';
  if(chip)chip.textContent='One source · two crops';

  const box=document.createElement('div');
  box.className='sharedMediaBox';
  box.innerHTML=`
    <h3>Shared trainer + buddy source</h3>
    <p>Use one screenshot for a still card, or an animated GIF for an animated trainer/buddy preview.</p>
    <label class="sharedMediaPick">Choose screenshot or animated GIF
      <input id="sharedTrainerBuddyInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
    </label>
    <div class="sharedMediaStatus">
      <span id="sharedMediaName">No source selected</span>
      <b id="sharedMediaType">STILL / GIF</b>
    </div>
    <div class="sharedMediaNote">The trainer rectangle and buddy circle below are separate crops of this same source. GIFs animate in the actual card preview.</div>`;
  head?.insertAdjacentElement('afterend',box);

  [trainerInput,buddyInput].forEach(inp=>inp.closest('.miniUpload')?.classList.add('legacySharedUpload'));

  const trainerCard=trainerInput.closest('.cropCard');
  const buddyCard=buddyInput.closest('.cropCard');
  const trainerH=trainerCard?.querySelector('h3'),trainerP=trainerCard?.querySelector('p');
  const buddyH=buddyCard?.querySelector('h3'),buddyP=buddyCard?.querySelector('p');
  if(trainerH)trainerH.textContent='Trainer crop';
  if(trainerP)trainerP.textContent='Position and resize the rectangle around the trainer. The source is the shared image above.';
  if(buddyH)buddyH.textContent='Buddy crop';
  if(buddyP)buddyP.textContent='Position and resize the circle around the buddy using the same shared image.';
  trainerCard?.insertAdjacentHTML('afterbegin','<div class="sharedCropLabel">1 · TRAINER CROP</div>');
  buddyCard?.insertAdjacentHTML('afterbegin','<div class="sharedCropLabel">2 · BUDDY CROP</div>');

  const input=$('sharedTrainerBuddyInput');
  input?.addEventListener('change',e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    stopGif();
    const isGif=file.type==='image/gif'||/\.gif$/i.test(file.name);
    $('sharedMediaName').textContent=file.name;
    $('sharedMediaType').textContent=isGif?'ANIMATED GIF':'STILL IMAGE';

    Object.assign(state.trainer,fresh().trainer);
    Object.assign(state.buddy,fresh().buddy);
    mode('trainer',false);mode('buddy',false);

    putFile(trainerInput,file);
    putFile(buddyInput,file);

    setTimeout(()=>{
      paint('trainer');paint('buddy');
      $('trainerApplyCrop')?.click();
      $('buddyApplyCrop')?.click();
      if(isGif)startGif();
    },420);
  });

  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>{
      const visible=entries.some(x=>x.isIntersecting);
      document.body.classList.toggle('sharedCardWatch',visible);
    },{threshold:.06});
    obs.observe(sharedPanel);
  }else{
    document.body.classList.add('sharedCardWatch');
  }
}

function init(){
  css();
  kinds.forEach(k=>{controls(k);layer(k);});
  installSharedMedia();

  $('resetBtn')?.addEventListener('click',()=>{
    stopGif();
    const d=fresh();
    kinds.forEach(k=>{
      Object.assign(state[k],d[k]);
      mode(k,false);paint(k);
    });
    const shared=$('sharedTrainerBuddyInput');
    if(shared)shared.value='';
    if($('sharedMediaName'))$('sharedMediaName').textContent='No source selected';
    if($('sharedMediaType'))$('sharedMediaType').textContent='STILL / GIF';
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();