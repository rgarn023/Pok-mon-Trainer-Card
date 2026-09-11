(() => {
'use strict';
const $=id=>document.getElementById(id);
const kinds=['trainer','buddy','looking','favorite'];

function readyImage(img){return !!(img&&img.src&&img.complete&&img.naturalWidth>0&&img.naturalHeight>0);}
function shown(el){return !!(el&&!el.classList.contains('hidden'));}
function chosenDomImage(kind){
  const full=$(kind+'UseFull'),src=$(kind+'SourceThumb'),srcCard=$(kind+'SourceCard'),result=$(kind+'Result');
  const sourceOK=readyImage(src)&&shown(srcCard), resultOK=readyImage(result)&&shown(result);
  if(full?.checked)return sourceOK?src:(resultOK?result:null);
  return resultOK?result:(sourceOK?src:null);
}
function zoomFor(kind){return Math.max(.25,Math.min(2,Number($(kind+'Zoom')?.value||1)));}
function cssAccent(){return getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim()||'#fff';}
function roundedPath(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
function drawCover(g,img,w,h,zoom){
  if(!readyImage(img))return false;
  const iw=img.naturalWidth,ih=img.naturalHeight,base=Math.max(w/iw,h/ih),sc=base*zoom,dw=iw*sc,dh=ih*sc;
  g.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);return true;
}
function renderSlot(kind){
  const canvas=$(kind+'SlotPreview'),shape=$(kind+'SlotPreviewShape');if(!canvas||!shape)return;
  const trainer=kind==='trainer';
  let w=420,h=420;
  if(trainer){
    const fw=Math.max(1,Number($('trainerFrameW')?.value||520)),fh=Math.max(1,Number($('trainerFrameH')?.value||560));
    h=Math.round(w*fh/fw);shape.style.aspectRatio=`${fw} / ${fh}`;
  }
  canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d');g.clearRect(0,0,w,h);g.fillStyle='#05080d';g.fillRect(0,0,w,h);
  g.save();
  if(trainer){roundedPath(g,0,0,w,h,Math.max(14,w*.045));g.clip();}
  else{g.beginPath();g.arc(w/2,h/2,Math.min(w,h)/2,0,Math.PI*2);g.clip();}
  const img=chosenDomImage(kind),ok=drawCover(g,img,w,h,zoomFor(kind));
  if(!ok){g.fillStyle='#0b1119';g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.45)';g.textAlign='center';g.textBaseline='middle';g.font='800 22px system-ui';g.fillText('UPLOAD IMAGE',w/2,h/2);}
  g.restore();
  g.strokeStyle=cssAccent();g.lineWidth=Math.max(4,w*.012);
  if(trainer){roundedPath(g,g.lineWidth/2,g.lineWidth/2,w-g.lineWidth,h-g.lineWidth,Math.max(14,w*.045));g.stroke();}
  else{g.beginPath();g.arc(w/2,h/2,Math.min(w,h)/2-g.lineWidth/2,0,Math.PI*2);g.stroke();}
  const z=$(kind+'SlotZoomText');if(z)z.textContent=`${zoomFor(kind).toFixed(2)}×`;
}
function buildSlotPreview(kind){
  const input=$(kind+'ShotInput'),host=input?.closest('.cropCard,.optionalCard');if(!host||$(kind+'SlotPreview'))return;
  const block=document.createElement('div');block.className='slotPreviewBlock';
  block.innerHTML=`<div class="slotPreviewHead"><b>Live card-slot preview</b><span id="${kind}SlotZoomText">1.00×</span></div><div class="slotPreviewStage"><div id="${kind}SlotPreviewShape" class="slotPreviewShape ${kind==='trainer'?'trainer':'circle'}"><canvas id="${kind}SlotPreview"></canvas></div></div><div class="slotPreviewFoot">This is the same shape, center-crop, and zoom used on the finished card.</div>`;
  const ranges=host.querySelector('.rangeGrid');if(ranges)host.insertBefore(block,ranges);else host.appendChild(block);

  const rerender=()=>requestAnimationFrame(()=>renderSlot(kind));
  $(kind+'Zoom')?.addEventListener('input',rerender);
  $(kind+'UseFull')?.addEventListener('change',rerender);
  $(kind+'Result')?.addEventListener('load',rerender);
  $(kind+'SourceThumb')?.addEventListener('load',rerender);
  if(kind==='trainer'){
    $('trainerFrameW')?.addEventListener('input',rerender);
    $('trainerFrameH')?.addEventListener('input',rerender);
  }
  const observer=new MutationObserver(rerender);
  [$(kind+'Result'),$(kind+'SourceCard')].filter(Boolean).forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class','src']}));
  rerender();
}

function setCropEditing(kind,on){
  const wrap=$(kind+'CropCanvas')?.closest('.cropCanvasWrap'),btn=$(kind+'CropModeBtn'),state=$(kind+'CropModeState');if(!wrap||!btn)return;
  wrap.classList.toggle('cropEditing',on);btn.classList.toggle('active',on);btn.textContent=on?'Finish crop editing':'Adjust crop';
  if(state)state.textContent=on?'Crop editing ON — drag/resize the crop.':'Scroll mode — swipe up/down over the image to move the page.';
}
function buildCropMode(kind){
  const canvas=$(kind+'CropCanvas'),wrap=canvas?.closest('.cropCanvasWrap');if(!canvas||!wrap||$(kind+'CropModeBtn'))return;
  const row=document.createElement('div');row.className='cropModeRow';row.innerHTML=`<button id="${kind}CropModeBtn" class="secondary cropModeBtn" type="button">Adjust crop</button><span id="${kind}CropModeState" class="cropModeState">Scroll mode — swipe up/down over the image to move the page.</span>`;
  wrap.parentElement.insertBefore(row,wrap);
  $(kind+'CropModeBtn').addEventListener('click',()=>setCropEditing(kind,!wrap.classList.contains('cropEditing')));
  // In scroll mode, stop the older crop listeners before they can trap the touch gesture.
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.addEventListener(type,e=>{if(!wrap.classList.contains('cropEditing'))e.stopImmediatePropagation();},true);
  $(kind+'ApplyCrop')?.addEventListener('click',()=>setCropEditing(kind,false));
}

function renderBackgroundPreview(kind){
  const prefix=kind==='shared'?'sharedBg':kind==='front'?'frontBg':'backBg',canvas=$(prefix+'CardPreview'),img=$(prefix+'Thumb'),card=$(prefix+'SourceCard');if(!canvas)return;
  canvas.width=180;canvas.height=280;const g=canvas.getContext('2d');g.fillStyle='#080b10';g.fillRect(0,0,180,280);
  if(readyImage(img)&&shown(card))drawCover(g,img,180,280,1);else{g.fillStyle='rgba(255,255,255,.38)';g.textAlign='center';g.textBaseline='middle';g.font='800 12px system-ui';g.fillText('NO CUSTOM IMAGE',90,140);}
  g.strokeStyle=cssAccent();g.lineWidth=3;roundedPath(g,2,2,176,276,12);g.stroke();
}
function buildBackgroundPreview(kind){
  const prefix=kind==='shared'?'sharedBg':kind==='front'?'frontBg':'backBg',input=$(prefix+'Input'),host=input?.closest('.backgroundCard');if(!host||$(prefix+'CardPreview'))return;
  const b=document.createElement('div');b.className='slotPreviewBlock';b.innerHTML=`<div class="slotPreviewHead"><b>Card background preview</b><span>9:14</span></div><div class="slotPreviewStage"><div class="slotPreviewShape trainer" style="width:126px;aspect-ratio:9/14"><canvas id="${prefix}CardPreview"></canvas></div></div><div class="slotPreviewFoot">Shows the same center-cover crop used behind the finished card.</div>`;host.appendChild(b);
  const rerender=()=>requestAnimationFrame(()=>renderBackgroundPreview(kind));$(prefix+'Thumb')?.addEventListener('load',rerender);new MutationObserver(rerender).observe($(prefix+'SourceCard'),{attributes:true,attributeFilter:['class']});rerender();
}

function installSaveV29(){
  const btn=$('saveBtn');if(!btn)return;
  btn.addEventListener('click',e=>{
    e.stopImmediatePropagation();
    const side=($('sidePill')?.textContent||'Front').toLowerCase()==='back'?'back':'front',canvas=side==='back'?$('backCanvas'):$('cardCanvas');if(!canvas)return;
    const trainer=($('trainerName')?.value||'trainer').replace(/\W+/g,'_'),team=document.querySelector('.team.active')?.dataset.team||'team',a=document.createElement('a');
    a.href=canvas.toDataURL('image/png');a.download=`${trainer}_${team}_trainer_card_${side}_v29.png`;a.click();
  },true);
}

function init(){
  kinds.forEach(kind=>{buildCropMode(kind);buildSlotPreview(kind);});
  ['shared','front','back'].forEach(buildBackgroundPreview);
  installSaveV29();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
