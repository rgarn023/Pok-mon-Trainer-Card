(() => {
  const S=window.TC,$=S.$;
  const baseScan=S.scanProfile?.bind(S);
  const NAME_RECT=[.045,.126,.40,.038];
  const BUDDY_RECT=[.045,.151,.40,.036];
  const TERRAIN_Y={valor:665,mystic:665,instinct:664};
  S.scene ||= {bgY:0,bgZoom:1,buddyMode:'ground',buddyFloat:90,autoGround:true};

  const norm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');

  function crop(rect,scale=18){
    const [x,y,w,h]=rect,src=S.sourceImage,iw=src.naturalWidth||src.width,ih=src.naturalHeight||src.height;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*w*scale));c.height=Math.max(1,Math.round(ih*h*scale));
    const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,iw*x,ih*y,iw*w,ih*h,0,0,c.width,c.height);return c;
  }
  function variant(src,mode){
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(src,0,0);
    if(mode==='original')return c;
    const im=g.getImageData(0,0,c.width,c.height),d=im.data;
    for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2],gr=gg/(r+1),br=b/(r+1);let ink=false;if(mode==='redtext')ink=r>55&&r<235&&gr>.20&&gr<.72&&br>.20&&br<.84&&(r-gg)>12;else if(mode==='reddiff')ink=r>65&&(r-Math.max(gg,b))>15;else{const lum=.299*r+.587*gg+.114*b;ink=lum<150;}const v=ink?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
    g.putImageData(im,0,0);return c;
  }
  function tokens(text,allowDigits=true){const re=allowDigits?/[A-Za-z][A-Za-z0-9_-]{2,27}/g:/[A-Za-z][A-Za-z-]{2,27}/g;return (text||'').match(re)||[];}
  function exactConsensus(candidates){
    const groups=new Map();
    for(const c of candidates){const k=norm(c.value);if(!k)continue;const g=groups.get(k)||{value:c.value,count:0,total:0,max:0};g.count++;g.total+=Number(c.confidence||0);g.max=Math.max(g.max,Number(c.confidence||0));if(c.value.length>g.value.length)g.value=c.value;groups.set(k,g);}
    let best=null;for(const g of groups.values()){g.avg=g.total/g.count;g.score=g.count*70+g.avg+Math.min(g.value.length,18);if(!best||g.score>best.score)best=g;}return best||{value:'',count:0,avg:0,max:0};
  }
  async function readExact(rect,allowDigits){
    const src=crop(rect),all=[];
    for(const mode of ['redtext','reddiff','original','dark']){const img=variant(src,mode);for(const psm of ['7','8','13']){const r=await S.read(img,psm,allowDigits?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-':'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-');for(const t of tokens(r.text,allowDigits))all.push({value:t,confidence:Number(r.confidence||0)});}}
    return exactConsensus(all);
  }
  async function extraOcrPass(){
    if(!S.sourceImage)return;
    $('scanCard')?.classList.remove('hidden');if($('scanTitle'))$('scanTitle').textContent='Double-checking OCR…';if($('scanDetail'))$('scanDetail').textContent='Reading enlarged text crops locally';
    const name=await readExact(NAME_RECT,true),buddy=await readExact(BUDDY_RECT,false);
    if(name.value){if(name.count>=2){$('trainerName').value=name.value;S.setState('trainerName','ok');}else if(!$('trainerName').value){$('trainerName').value=name.value;S.setState('trainerName','review');}else S.setState('trainerName','review');}
    if(buddy.value){if(buddy.count>=2){$('buddy').value=buddy.value;S.setState('buddy','ok');}else if(!$('buddy').value){$('buddy').value=buddy.value;S.setState('buddy','review');}else S.setState('buddy','review');}
    S.updateQuality?.();S.drawFront?.();S.drawBack?.();
  }

  if(baseScan){S.scanProfile=async()=>{await baseScan();try{await extraOcrPass();}catch(e){console.warn('extra OCR pass',e);}finally{$('scanCard')?.classList.add('hidden');}};}

  function autoGround(){
    const terrain=TERRAIN_Y[S.team]??665;Object.assign(S.scene,{bgY:0,bgZoom:1,groundY:terrain,autoGround:true});
    const bgY=$('sceneBgY'),bgZ=$('sceneBgZoom'),ground=$('sceneGround');if(bgY)bgY.value='0';if(bgZ)bgZ.value='1';if(ground)ground.value=String(terrain);
    if($('sceneBgYOut'))$('sceneBgYOut').textContent='0';if($('sceneBgZoomOut'))$('sceneBgZoomOut').textContent='1.00×';if($('sceneGroundOut'))$('sceneGroundOut').textContent=String(terrain);S.drawFront?.();
  }
  S.autoGroundScene=autoGround;

  function addSceneControls(){
    const anchor=$('extractHelp')?.parentElement;if(!anchor||$('sceneGround'))return;const wrap=document.createElement('div');wrap.className='controls single';wrap.style.marginTop='14px';const terrain=TERRAIN_Y[S.team]??665;
    wrap.innerHTML=`<label>Background vertical position <output id="sceneBgYOut">0</output><input id="sceneBgY" type="range" min="-70" max="70" value="0" step="1"></label><label>Background zoom <output id="sceneBgZoomOut">1.00×</output><input id="sceneBgZoom" type="range" min="1" max="1.16" value="1" step="0.01"></label><label>Ground/contact line <output id="sceneGroundOut">${terrain}</output><input id="sceneGround" type="range" min="630" max="680" value="${terrain}" step="1"></label><label>Buddy placement <select id="buddyPlacement"><option value="ground">Grounded</option><option value="float">Flying / floating</option></select></label><label id="buddyFloatLabel">Buddy floating height <output id="buddyFloatOut">90</output><input id="buddyFloat" type="range" min="20" max="200" value="90" step="1"></label><div class="row compact"><button id="autoSceneBtn" class="secondary" type="button">Auto-align to terrain</button></div>`;
    anchor.parentElement.insertBefore(wrap,anchor.nextSibling);
    const sync=()=>{S.scene.bgY=+$('sceneBgY').value;S.scene.bgZoom=+$('sceneBgZoom').value;S.scene.groundY=+$('sceneGround').value;S.scene.buddyMode=$('buddyPlacement').value;S.scene.buddyFloat=+$('buddyFloat').value;S.scene.autoGround=false;$('sceneBgYOut').textContent=String(S.scene.bgY);$('sceneBgZoomOut').textContent=S.scene.bgZoom.toFixed(2)+'×';$('sceneGroundOut').textContent=String(S.scene.groundY);$('buddyFloatOut').textContent=String(S.scene.buddyFloat);$('buddyFloatLabel').style.opacity=S.scene.buddyMode==='float'?'1':'.45';$('buddyFloat').disabled=S.scene.buddyMode!=='float';S.drawFront?.();};
    ['sceneBgY','sceneBgZoom','sceneGround','buddyPlacement','buddyFloat'].forEach(id=>$(id).addEventListener('input',sync));$('autoSceneBtn').addEventListener('click',autoGround);$('resetBtn')?.addEventListener('click',()=>setTimeout(autoGround,0));autoGround();
  }

  const oldExtract=S.extractSubjects?.bind(S);if(oldExtract&&!S._localExtractWrapped){S.extractSubjects=async(...args)=>{const r=await oldExtract(...args);if(r)autoGround();return r;};S._localExtractWrapped=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addSceneControls);else addSceneControls();
})();
