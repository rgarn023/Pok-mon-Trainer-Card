(() => {
'use strict';
const $=id=>document.getElementById(id);
const kinds=['trainer','looking','favorite'];
const fresh=()=>({trainer:{cx:.5,cy:.44,w:.62,h:.72},looking:{cx:.5,cy:.5,r:.30},favorite:{cx:.5,cy:.5,r:.30}});
const state=fresh();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let gifTimer=null,combinedPanel=null;

function send(c,t,id,x,y){
  const ev=new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pressure:t==='pointerup'?0:.5});
  if(t==='pointerdown'&&c.setPointerCapture){
    const old=c.setPointerCapture;
    try{c.setPointerCapture=()=>{};c.dispatchEvent(ev)}finally{c.setPointerCapture=old}
  }else c.dispatchEvent(ev);
}
function pt(c,x,y){const r=c.getBoundingClientRect();return{x:r.left+x*r.width,y:r.top+y*r.height};}
function geom(k){
  const c=$(k+'CropCanvas'),s=state[k];if(!c||!s)return null;
  if(k==='trainer')return{cx:s.cx,cy:s.cy,w:s.w,h:s.h};
  const m=Math.min(c.width||1,c.height||1);
  return{cx:s.cx,cy:s.cy,rx:s.r*m/(c.width||1),ry:s.r*m/(c.height||1)};
}
function paint(k){
  const g=geom(k),m=$(k+'Move');if(!g||!m)return;
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
function anchor(k,mode){
  const c=$(k+'CropCanvas'),s=state[k];
  if(k==='trainer'){
    if(mode==='move')return pt(c,s.cx,s.cy);
    if(mode==='w')return pt(c,s.cx+s.w/2,s.cy);
    if(mode==='h')return pt(c,s.cx,s.cy+s.h/2);
    return pt(c,s.cx+s.w/2,s.cy+s.h/2);
  }
  const m=Math.min(c.width||1,c.height||1),rx=s.r*m/(c.width||1);
  return mode==='move'?pt(c,s.cx,s.cy):pt(c,s.cx+rx,s.cy);
}
function local(k,mode,start,dx,dy,rect,c){
  const s=state[k];
  if(k==='trainer'){
    if(mode==='move'){
      s.cx=clamp(start.cx+dx/rect.width,start.w/2,1-start.w/2);
      s.cy=clamp(start.cy+dy/rect.height,start.h/2,1-start.h/2);
    }else{
      if(mode==='w'||mode==='both')s.w=clamp(start.w+2*dx/rect.width,.18,.96);
      if(mode==='h'||mode==='both')s.h=clamp(start.h+2*dy/rect.height,.20,.96);
      s.cx=clamp(start.cx,s.w/2,1-s.w/2);s.cy=clamp(start.cy,s.h/2,1-s.h/2);
    }
  }else{
    const m=Math.min(c.width||1,c.height||1);
    if(mode==='move'){
      s.cx=start.cx+dx/rect.width;s.cy=start.cy+dy/rect.height;
      const rx=s.r*m/(c.width||1),ry=s.r*m/(c.height||1);
      s.cx=clamp(s.cx,rx,1-rx);s.cy=clamp(s.cy,ry,1-ry);
    }else{
      const ix=dx*(c.width||1)/rect.width;s.r=clamp(start.r+ix/m,.08,.48);
      const rx=s.r*m/(c.width||1),ry=s.r*m/(c.height||1);
      s.cx=clamp(start.cx,rx,1-rx);s.cy=clamp(start.cy,ry,1-ry);
    }
  }
}
const applyTimers={};
function scheduleApply(k,now=false){
  clearTimeout(applyTimers[k]);
  applyTimers[k]=setTimeout(()=>{$(k+'ApplyCrop')?.click();},now?0:80);
}
function drag(el,k,modeName){
  if(!el)return;
  el.addEventListener('pointerdown',e=>{
    const c=$(k+'CropCanvas'),wrap=c?.closest('.cropCanvasWrap');
    if(!c||!wrap?.classList.contains('cropEditing')||c.width<=1)return;
    e.preventDefault();e.stopPropagation();
    const id=e.pointerId||77,rect=c.getBoundingClientRect(),start={...state[k]},a=anchor(k,modeName),sx=e.clientX,sy=e.clientY;
    el.setPointerCapture?.(e.pointerId);send(c,'pointerdown',id,a.x,a.y);
    const mv=q=>{
      const dx=q.clientX-sx,dy=q.clientY-sy;local(k,modeName,start,dx,dy,rect,c);paint(k);send(c,'pointermove',id,a.x+dx,a.y+dy);scheduleApply(k);q.preventDefault();
    };
    const up=q=>{
      el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
      const dx=(q.clientX??sx)-sx,dy=(q.clientY??sy)-sy;send(c,'pointerup',id,a.x+dx,a.y+dy);scheduleApply(k,true);q.preventDefault();
    };
    el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  });
}
function mode(k,on){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap'),b=$(k+'Mode'),h=$(k+'Help');
  if(!c||!w||!b)return;
  if(on&&c.width<=1){if(h)h.innerHTML='<strong>Upload an image first.</strong>';return;}
  kinds.forEach(x=>{if(x!==k&&$(x+'CropCanvas')?.closest('.cropCanvasWrap')?.classList.contains('cropEditing'))mode(x,false)});
  w.classList.toggle('cropEditing',on);b.classList.toggle('active',on);b.textContent=on?'Done adjusting':'Adjust crop';
  if(h)h.innerHTML=on?'<strong>Adjust crop:</strong> drag MOVE or a resize handle. Swipe anywhere else on the image to scroll.':'<strong>Ready:</strong> tap Adjust crop to move or resize the crop box.';
  paint(k);document.body.classList.toggle('combinedEditing',k==='trainer'&&on);
}
function layer(k){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap');if(!c||!w)return;
  const l=document.createElement('div');l.className='tcLayer';l.id=k+'Layer';
  if(k==='trainer')l.innerHTML=`<button id="${k}Move" class="tcMove" type="button">MOVE</button><button id="${k}W" class="tcH" type="button">↔</button><button id="${k}H" class="tcH" type="button">↕</button><button id="${k}B" class="tcH big" type="button">↘</button>`;
  else l.innerHTML=`<button id="${k}Move" class="tcMove" type="button">MOVE</button><button id="${k}R" class="tcH big" type="button">↔</button>`;
  w.appendChild(l);drag($(k+'Move'),k,'move');
  if(k==='trainer'){drag($(k+'W'),k,'w');drag($(k+'H'),k,'h');drag($(k+'B'),k,'both');}else drag($(k+'R'),k,'r');
  paint(k);
}
function controls(k){
  const c=$(k+'CropCanvas'),w=c?.closest('.cropCanvasWrap');if(!c||!w)return;
  const bar=document.createElement('div');bar.className='cropModeBar';
  bar.innerHTML=`<button id="${k}Mode" class="cropModeBtn" type="button">Adjust crop</button><div id="${k}Help" class="cropModeHelp"><strong>Ready:</strong> tap Adjust crop to move or resize the crop.</div>`;
  w.insertAdjacentElement('afterend',bar);$(k+'Mode').onclick=()=>mode(k,!w.classList.contains('cropEditing'));
  $(k+'ShotInput')?.addEventListener('change',()=>{
    Object.assign(state[k],fresh()[k]);mode(k,false);
    setTimeout(()=>{paint(k);scheduleApply(k,true);},220);
  });
}
function stopGif(){if(gifTimer){clearInterval(gifTimer);gifTimer=null;}}
function startGif(){
  stopGif();
  gifTimer=setInterval(()=>{if(!document.hidden)$('trainerApplyCrop')?.click();},110);
}
function rounded(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
function ready(img){return !!(img&&img.src&&img.complete&&img.naturalWidth>0);}
function renderCombinedCard(){
  const c=$('cardCanvas'),img=$('trainerResult');if(!c||!ready(img))return;
  const g=c.getContext('2d'),accent=getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim()||'#fff';

  /* Cover the legacy trainer/buddy renderer, then draw one auto-sized combined image frame. */
  const cleanX=55,cleanY=205,cleanW=790,cleanH=620;
  g.save();g.fillStyle='rgba(5,8,13,.96)';rounded(g,cleanX,cleanY,cleanW,cleanH,28);g.fill();
  g.fillStyle=accent;g.font='900 18px system-ui';g.textAlign='left';g.textBaseline='middle';g.fillText('TRAINER + BUDDY',78,232);

  const iw=img.naturalWidth,ih=img.naturalHeight;
  if(!iw||!ih){g.restore();return;}
  const zoom=Math.max(.25,Math.min(2,Number($('trainerZoom')?.value||1)));
  const maxW=750,maxH=548;
  const fit=Math.min(maxW/iw,maxH/ih);
  /* 1.00x means a comfortable fit; zoom changes image + frame size together, never crops inside it. */
  const scale=Math.min(fit,fit*(0.58+0.42*zoom));
  const sw=Math.max(80,iw*scale),sh=Math.max(80,ih*scale);
  const pad=10,frameW=sw+pad*2,frameH=sh+pad*2;
  const fx=450-frameW/2,fy=258+(maxH-frameH)/2;

  g.fillStyle='rgba(0,0,0,.42)';rounded(g,fx,fy,frameW,frameH,22);g.fill();
  g.strokeStyle=accent;g.lineWidth=3;rounded(g,fx,fy,frameW,frameH,22);g.stroke();
  const ix=fx+pad,iy=fy+pad;
  g.save();rounded(g,ix,iy,sw,sh,16);g.clip();g.drawImage(img,ix,iy,sw,sh);g.restore();
  g.strokeStyle='rgba(255,255,255,.24)';g.lineWidth=2;rounded(g,ix,iy,sw,sh,16);g.stroke();
  g.restore();
}
function animationLoop(){renderCombinedCard();requestAnimationFrame(animationLoop);}
function saveCombined(e){
  const btn=$('saveBtn');if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  const flipped=$('cardFlipper')?.classList.contains('flipped');
  const c=flipped?$('backCanvas'):$('cardCanvas');if(!c)return;
  if(!flipped)renderCombinedCard();
  const a=document.createElement('a'),name=($('trainerName')?.value||'trainer').replace(/\W+/g,'_'),team=document.querySelector('.team.active')?.dataset.team||'team';
  a.href=c.toDataURL('image/png');a.download=`${name}_${team}_trainer_card_${flipped?'back':'front'}_combined.png`;a.click();
}
function installCombined(){
  const trainerInput=$('trainerShotInput'),buddyInput=$('buddyShotInput');if(!trainerInput)return;
  combinedPanel=trainerInput.closest('section.panel');if(!combinedPanel)return;
  combinedPanel.classList.add('combinedPanel');
  const head=combinedPanel.querySelector('.panelhead'),h2=head?.querySelector('h2'),p=head?.querySelector('p'),chip=head?.querySelector('.chip');
  if(h2)h2.textContent='Trainer + buddy image';
  if(p)p.textContent='Upload one image that already contains both the trainer and buddy. Use one crop box; the card frame automatically matches the crop proportions.';
  if(chip)chip.textContent='One image · auto-fit frame';
  const trainerCard=trainerInput.closest('.cropCard'),buddyCard=buddyInput?.closest('.cropCard');
  buddyCard?.classList.add('removedBuddyCrop');
  if(trainerCard){
    const h=trainerCard.querySelector('h3'),desc=trainerCard.querySelector('p');
    if(h)h.textContent='Trainer + buddy';
    if(desc)desc.textContent='Keep both the trainer and buddy inside this one crop box. The card frame will automatically resize to this crop instead of forcing it into a preset window.';
  }
  trainerInput.accept='image/png,image/jpeg,image/webp,image/gif';
  trainerInput.closest('.miniUpload')?.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent='Choose trainer + buddy image or GIF';});
  const empty=$('trainerCropEmpty');if(empty)empty.textContent='Upload one image containing trainer + buddy';
  const hint=trainerCard?.querySelector('.cropHint');if(hint)hint.textContent='One crop only. The finished card frame automatically follows this crop’s shape; no extra fill-cropping is applied.';
  $('trainerApplyCrop')?.closest('.row')?.style.setProperty('display','none','important');
  $('trainerFrameW')?.closest('label')?.style.setProperty('display','none','important');
  $('trainerFrameH')?.closest('label')?.style.setProperty('display','none','important');
  $('trainerUseFull')?.closest('label')?.style.setProperty('display','none','important');
  const zl=$('trainerZoom')?.closest('label');if(zl&&zl.firstChild)zl.firstChild.textContent='Combined image size ';
  trainerInput.addEventListener('change',e=>{
    const f=e.target.files?.[0];stopGif();if(!f)return;
    const gif=f.type==='image/gif'||/\.gif$/i.test(f.name);
    combinedPanel.dataset.mediaType=gif?'gif':'still';
    setTimeout(()=>{$('trainerApplyCrop')?.click();if(gif)startGif();},350);
  });
  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>document.body.classList.toggle('combinedWatch',entries.some(x=>x.isIntersecting)),{threshold:.04});
    obs.observe(combinedPanel);
  }else document.body.classList.add('combinedWatch');
  $('saveBtn')?.addEventListener('click',saveCombined,true);
}
function init(){
  kinds.forEach(k=>{controls(k);layer(k);});installCombined();animationLoop();
  $('resetBtn')?.addEventListener('click',()=>{
    stopGif();const d=fresh();kinds.forEach(k=>{Object.assign(state[k],d[k]);mode(k,false);paint(k);});
    document.body.classList.remove('combinedEditing');if(combinedPanel)delete combinedPanel.dataset.mediaType;
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();