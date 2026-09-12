(() => {
'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const freshTrainer=()=>({cx:.50,cy:.27,w:.82,h:.42});
let trainerCrop=freshTrainer();
let trainerOutput=null;
let trainerGif=false;
let gifTimer=null;
let combinedPanel=null;

function rounded(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
function imgReady(img){return !!(img&&img.src&&img.complete&&img.naturalWidth>0);}
function trainerSource(){return $('infoThumb');}

function ensureTrainerCanvas(){
  const src=trainerSource(),c=$('trainerCropCanvas');
  if(!imgReady(src)||!c)return false;
  const sw=src.naturalWidth||src.width,sh=src.naturalHeight||src.height;
  const cw=Math.min(900,sw),ch=Math.max(1,Math.round(cw*sh/sw));
  if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  $('trainerCropEmpty')?.classList.add('hidden');
  return true;
}

function trainerRect(c){
  const s=trainerCrop;
  return {x:(s.cx-s.w/2)*c.width,y:(s.cy-s.h/2)*c.height,w:s.w*c.width,h:s.h*c.height};
}

function drawTrainerEditor(){
  const src=trainerSource(),c=$('trainerCropCanvas');
  if(!ensureTrainerCanvas()||!imgReady(src)||!c)return;
  const g=c.getContext('2d'),r=trainerRect(c);
  g.clearRect(0,0,c.width,c.height);
  g.drawImage(src,0,0,c.width,c.height);
  g.fillStyle='rgba(0,0,0,.52)';g.fillRect(0,0,c.width,c.height);
  g.save();g.beginPath();g.rect(r.x,r.y,r.w,r.h);g.clip();g.drawImage(src,0,0,c.width,c.height);g.restore();
  g.strokeStyle='#fff';g.lineWidth=Math.max(3,c.width/250);g.strokeRect(r.x,r.y,r.w,r.h);
  const d=Math.max(5,c.width/170);g.fillStyle='#fff';
  for(const [x,y] of [[r.x+r.w,r.y+r.h/2],[r.x+r.w/2,r.y+r.h],[r.x+r.w,r.y+r.h]]){g.beginPath();g.arc(x,y,d,0,Math.PI*2);g.fill();}
  g.font=`900 ${Math.max(15,c.width/52)}px system-ui`;g.fillText('TRAINER + BUDDY CROP',r.x+10,r.y+Math.max(24,c.width/34));
  positionTrainerHandles();
}

function applyTrainerCrop(updateImg=true){
  const src=trainerSource();if(!imgReady(src))return;
  const iw=src.naturalWidth||src.width,ih=src.naturalHeight||src.height,s=trainerCrop;
  const pw=s.w*iw,ph=s.h*ih,px=clamp(s.cx*iw-pw/2,0,iw-pw),py=clamp(s.cy*ih-ph/2,0,ih-ph);
  const outW=900,outH=Math.max(1,Math.round(outW*ph/pw));
  if(!trainerOutput)trainerOutput=document.createElement('canvas');
  if(trainerOutput.width!==outW||trainerOutput.height!==outH){trainerOutput.width=outW;trainerOutput.height=outH;}
  const g=trainerOutput.getContext('2d');g.clearRect(0,0,outW,outH);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(src,px,py,pw,ph,0,0,outW,outH);
  if(updateImg&&!trainerGif){
    const img=$('trainerResult');if(img){img.src=trainerOutput.toDataURL('image/png');img.classList.remove('hidden');}
    const txt=$('trainerResultText');if(txt)txt.textContent='Trainer + Buddy crop ready.';
  }
}

function handlePoint(mode){
  const s=trainerCrop;
  if(mode==='move')return{x:s.cx,y:s.cy};
  if(mode==='w')return{x:s.cx+s.w/2,y:s.cy};
  if(mode==='h')return{x:s.cx,y:s.cy+s.h/2};
  return{x:s.cx+s.w/2,y:s.cy+s.h/2};
}

function positionTrainerHandles(){
  for(const [id,mode] of [['trainerMove','move'],['trainerW','w'],['trainerH','h'],['trainerB','both']]){
    const el=$(id);if(!el)continue;const p=handlePoint(mode);el.style.left=`${p.x*100}%`;el.style.top=`${p.y*100}%`;
  }
}

function changeTrainer(start,mode,dx,dy,rect){
  const s=trainerCrop;
  if(mode==='move'){
    s.cx=clamp(start.cx+dx/rect.width,start.w/2,1-start.w/2);
    s.cy=clamp(start.cy+dy/rect.height,start.h/2,1-start.h/2);
  }else{
    if(mode==='w'||mode==='both')s.w=clamp(start.w+2*dx/rect.width,.16,.96);
    if(mode==='h'||mode==='both')s.h=clamp(start.h+2*dy/rect.height,.12,.94);
    s.cx=clamp(start.cx,s.w/2,1-s.w/2);
    s.cy=clamp(start.cy,s.h/2,1-s.h/2);
  }
}

function bindTrainerHandle(id,mode){
  const el=$(id);if(!el)return;
  el.addEventListener('pointerdown',e=>{
    const c=$('trainerCropCanvas'),wrap=c?.closest('.cropCanvasWrap');
    if(!c||!wrap?.classList.contains('cropEditing')||c.width<=1)return;
    e.preventDefault();e.stopPropagation();el.setPointerCapture?.(e.pointerId);
    const start={...trainerCrop},rect=c.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
    const move=q=>{q.preventDefault();q.stopPropagation();changeTrainer(start,mode,q.clientX-sx,q.clientY-sy,rect);drawTrainerEditor();applyTrainerCrop(false);};
    const up=q=>{q.preventDefault();q.stopPropagation();el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);drawTrainerEditor();applyTrainerCrop(true);};
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  });
}

function installTrainerLayer(){
  const c=$('trainerCropCanvas'),wrap=c?.closest('.cropCanvasWrap');if(!c||!wrap)return;
  wrap.querySelector('.tcLayer')?.remove();
  const layer=document.createElement('div');layer.className='tcLayer trainerSyncLayer';
  layer.innerHTML='<button id="trainerMove" class="tcMove" type="button">MOVE</button><button id="trainerW" class="tcH" type="button">↔</button><button id="trainerH" class="tcH" type="button">↕</button><button id="trainerB" class="tcH big" type="button">↘</button>';
  wrap.appendChild(layer);
  bindTrainerHandle('trainerMove','move');bindTrainerHandle('trainerW','w');bindTrainerHandle('trainerH','h');bindTrainerHandle('trainerB','both');
  positionTrainerHandles();
}

function installMode(kind){
  const c=$(kind+'CropCanvas'),wrap=c?.closest('.cropCanvasWrap');if(!c||!wrap)return;
  wrap.nextElementSibling?.classList.contains('cropModeBar')&&wrap.nextElementSibling.remove();
  const bar=document.createElement('div');bar.className='cropModeBar';
  bar.innerHTML=`<button id="${kind}Mode" class="cropModeBtn" type="button">Adjust crop</button><div id="${kind}Help" class="cropModeHelp"><strong>Ready:</strong> tap Adjust crop.</div>`;
  wrap.insertAdjacentElement('afterend',bar);
  const btn=$(kind+'Mode'),help=$(kind+'Help');
  btn.onclick=()=>{
    const on=!wrap.classList.contains('cropEditing');
    document.querySelectorAll('.cropCanvasWrap.cropEditing').forEach(x=>x.classList.remove('cropEditing','nativeCrop'));
    document.querySelectorAll('.cropModeBtn.active').forEach(x=>{x.classList.remove('active');x.textContent='Adjust crop';});
    if(on){wrap.classList.add('cropEditing');if(kind!=='trainer')wrap.classList.add('nativeCrop');btn.classList.add('active');btn.textContent='Done adjusting';}
    if(help)help.innerHTML=on?(kind==='trainer'?'<strong>Adjust crop:</strong> drag MOVE or a resize handle. Swipe anywhere else on the screenshot to scroll.':'<strong>Adjust crop:</strong> drag the crop on the image. Tap Done adjusting when finished.'):'<strong>Ready:</strong> tap Adjust crop.';
    document.body.classList.toggle('combinedEditing',kind==='trainer'&&on);
    if(kind==='trainer'){drawTrainerEditor();positionTrainerHandles();}
  };
}

function stopGif(){if(gifTimer){clearInterval(gifTimer);gifTimer=null;}}
function startGif(){
  stopGif();gifTimer=setInterval(()=>{if(document.hidden)return;drawTrainerEditor();applyTrainerCrop(false);},100);
}

function waitForTrainerSource(){
  const src=trainerSource();if(!src)return;
  const start=()=>{trainerCrop=freshTrainer();ensureTrainerCanvas();drawTrainerEditor();applyTrainerCrop(true);if(trainerGif)startGif();};
  if(imgReady(src))start();else src.addEventListener('load',start,{once:true});
}

function drawCover(g,img,x,y,w,h){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;if(!iw||!ih)return;const sc=Math.max(w/iw,h/ih),sw=w/sc,sh=h/sc,sx=(iw-sw)/2,sy=(ih-sh)/2;g.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
function restoreCardBackground(g,x,y,w,h){
  const bg=document.createElement('canvas');bg.width=900;bg.height=1400;const b=bg.getContext('2d');
  const front=$('frontBgThumb'),shared=$('sharedBgThumb'),custom=imgReady(front)?front:imgReady(shared)?shared:null;
  if(custom){drawCover(b,custom,0,0,900,1400);b.fillStyle='rgba(3,6,11,.22)';b.fillRect(0,0,900,1400);}else{
    const team=document.querySelector('.team.active')?.dataset.team||'valor';const dark=team==='mystic'?'#061c31':team==='instinct'?'#2b2400':'#250b14';const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim()||'#fff';
    const gr=b.createLinearGradient(0,0,900,1400);gr.addColorStop(0,dark);gr.addColorStop(.42,'#101725');gr.addColorStop(1,'#070a10');b.fillStyle=gr;b.fillRect(0,0,900,1400);
    b.save();b.globalAlpha=.16;b.strokeStyle=accent;b.lineWidth=2;for(let i=-300;i<1300;i+=90){b.beginPath();b.moveTo(i,0);b.lineTo(i+700,1400);b.stroke();}b.restore();
  }
  g.drawImage(bg,x,y,w,h,x,y,w,h);
}

function renderCombinedCard(){
  const c=$('cardCanvas'),img=trainerOutput;if(!c||!img||!img.width||!img.height)return;
  const g=c.getContext('2d'),accent=getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim()||'#fff';
  /* Let the combined crop grow almost to the card's inner border while still staying above the stats. */
  const cleanX=18,cleanY=150,cleanW=864,cleanH=720;restoreCardBackground(g,cleanX,cleanY,cleanW,cleanH);
  const iw=img.width,ih=img.height,size=clamp(Number($('trainerZoom')?.value||1),.25,3),maxW=842,maxH=704,fit=Math.min(maxW/iw,maxH/ih);
  const sizeFactor=Math.min(1.12,.58+.18*size),scale=fit*sizeFactor,sw=Math.max(80,iw*scale),sh=Math.max(80,ih*scale),pad=5,frameW=sw+10,frameH=sh+10,fx=450-frameW/2,fy=cleanY+(cleanH-frameH)/2;
  g.save();g.fillStyle='rgba(0,0,0,.36)';rounded(g,fx,fy,frameW,frameH,16);g.fill();g.strokeStyle=accent;g.lineWidth=3;rounded(g,fx,fy,frameW,frameH,16);g.stroke();
  const ix=fx+pad,iy=fy+pad;g.save();rounded(g,ix,iy,sw,sh,12);g.clip();g.drawImage(img,ix,iy,sw,sh);g.restore();g.restore();
}
function animationLoop(){renderCombinedCard();requestAnimationFrame(animationLoop);}

function saveCombined(e){
  e.preventDefault();e.stopImmediatePropagation();const flipped=$('cardFlipper')?.classList.contains('flipped'),c=flipped?$('backCanvas'):$('cardCanvas');if(!c)return;if(!flipped)renderCombinedCard();
  const a=document.createElement('a'),name=($('trainerName')?.value||'trainer').replace(/\W+/g,'_'),team=document.querySelector('.team.active')?.dataset.team||'team';a.href=c.toDataURL('image/png');a.download=`${name}_${team}_trainer_card_${flipped?'back':'front'}_combined.png`;a.click();
}

function install(){
  const trainerInput=$('trainerShotInput'),profile=$('profileInput');combinedPanel=trainerInput?.closest('section.panel');
  if(combinedPanel){
    const head=combinedPanel.querySelector('.panelhead'),h2=head?.querySelector('h2'),p=head?.querySelector('p'),chip=head?.querySelector('.chip');
    if(h2)h2.textContent='Trainer + buddy crop';if(p)p.textContent='Uses the same Profile information screenshot or animated GIF from section 01. There is no second upload.';if(chip)chip.textContent='Uses OCR source';
    combinedPanel.querySelector('.cropCard')?.querySelector('.miniUpload')?.remove();
    $('trainerSourceCard')?.remove();
    $('trainerApplyCrop')?.closest('.row')?.style.setProperty('display','none','important');
    $('trainerFrameW')?.closest('label')?.style.setProperty('display','none','important');$('trainerFrameH')?.closest('label')?.style.setProperty('display','none','important');$('trainerUseFull')?.closest('label')?.style.setProperty('display','none','important');
  }
  const zoom=$('trainerZoom');if(zoom){zoom.max='3';zoom.step='0.05';}
  if(profile){profile.accept='image/png,image/jpeg,image/webp,image/gif';profile.addEventListener('change',e=>{stopGif();const f=e.target.files?.[0];trainerGif=!!(f&&(f.type==='image/gif'||/\.gif$/i.test(f.name)));setTimeout(waitForTrainerSource,0);});}
  installTrainerLayer();installMode('trainer');installMode('looking');installMode('favorite');
  $('trainerApplyCrop')?.addEventListener('click',()=>applyTrainerCrop(true),true);
  zoom?.addEventListener('input',renderCombinedCard);
  if(combinedPanel&&'IntersectionObserver'in window){new IntersectionObserver(es=>document.body.classList.toggle('combinedWatch',es.some(x=>x.isIntersecting)),{threshold:.04}).observe(combinedPanel);}
  $('saveBtn')?.addEventListener('click',saveCombined,true);
  $('resetBtn')?.addEventListener('click',()=>{stopGif();trainerGif=false;trainerCrop=freshTrainer();trainerOutput=null;const c=$('trainerCropCanvas');if(c){c.width=1;c.height=1;}$('trainerCropEmpty')?.classList.remove('hidden');positionTrainerHandles();});
  animationLoop();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
