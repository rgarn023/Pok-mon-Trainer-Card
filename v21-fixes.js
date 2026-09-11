(() => {
  const S=window.TC,$=S.$;
  const baseScan=S.scanProfileOpenAI?.bind(S);
  const NAME_RECT=[.050,.126,.36,.034];
  const BUDDY_RECT=[.048,.153,.42,.035];
  const TERRAIN_Y={valor:665,mystic:665,instinct:664};
  S.scene ||= {bgY:0,bgZoom:1,buddyMode:'ground',buddyFloat:90,autoGround:true};

  const normalized=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';

  function crop(rect,scale=20){
    const [x,y,w,h]=rect,src=S.sourceImage,iw=src.naturalWidth||src.width,ih=src.naturalHeight||src.height;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*w*scale));c.height=Math.max(1,Math.round(ih*h*scale));
    const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(src,iw*x,ih*y,iw*w,ih*h,0,0,c.width,c.height);return c;
  }

  function variant(src,mode){
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(src,0,0);
    if(mode==='original')return c;
    const im=g.getImageData(0,0,c.width,c.height),d=im.data;
    for(let i=0;i<d.length;i+=4){
      const r=d[i],gg=d[i+1],b=d[i+2],gr=gg/(r+1),br=b/(r+1);let ink=false;
      if(mode==='redtext') ink=r>58&&r<228&&gr>.22&&gr<.66&&br>.24&&br<.80&&(r-gg)>16;
      else if(mode==='reddiff') ink=r>70&&(r-Math.max(gg,b))>18;
      else {const lum=.299*r+.587*gg+.114*b;ink=lum<145;}
      const v=ink?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
    g.putImageData(im,0,0);return c;
  }

  function editDistance(a,b){a=normalized(a);b=normalized(b);const n=b.length,dp=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return dp[n];}
  function similarity(a,b){const m=Math.max(normalized(a).length,normalized(b).length,1);return 1-editDistance(a,b)/m;}

  async function pokemonNames(){
    if(Array.isArray(S.pokemonNames)&&S.pokemonNames.length)return S.pokemonNames;
    try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),j=await r.json();S.pokemonNames=(j.results||[]).map(x=>x.name);}catch{S.pokemonNames=[];}
    return S.pokemonNames;
  }
  const prettySpecies=s=>s.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase());

  function usernameFromRaw(raw){
    const tokens=(raw||'').match(/[A-Za-z][A-Za-z0-9_-]{2,27}/g)||[];
    return tokens.sort((a,b)=>((/\d/.test(b)?18:0)+b.length)-((/\d/.test(a)?18:0)+a.length))[0]||'';
  }

  async function localExactText(){
    const nameSrc=crop(NAME_RECT),buddySrc=crop(BUDDY_RECT),nameCandidates=[],buddyCandidates=[];
    for(const mode of ['redtext','reddiff','original','dark']){
      const nimg=variant(nameSrc,mode),bimg=variant(buddySrc,mode);
      for(const psm of ['7','8']){
        const nr=await S.read(nimg,psm,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-');
        const nv=usernameFromRaw(nr.text);if(nv)nameCandidates.push({value:nv,confidence:Number(nr.confidence||0),mode,psm});
        const br=await S.read(bimg,psm,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
        if((br.text||'').trim())buddyCandidates.push({raw:(br.text||'').trim(),confidence:Number(br.confidence||0),mode,psm});
      }
    }

    const grouped=new Map();
    for(const c of nameCandidates){const k=normalized(c.value);if(!k)continue;const g=grouped.get(k)||{value:c.value,count:0,conf:0};g.count++;g.conf+=c.confidence;if(c.value.length>g.value.length)g.value=c.value;grouped.set(k,g);}
    let bestName={value:'',support:0,confidence:0};
    for(const g of grouped.values()){const score=g.count*60+g.conf/g.count+g.value.length;if(score>(bestName.score||-1))bestName={value:g.value,support:g.count,confidence:g.conf/g.count,score};}

    const names=await pokemonNames();let bestBuddy={value:'',support:0,confidence:0,strength:0};
    for(const c of buddyCandidates){
      const rawNorm=normalized(c.raw);
      for(const p of names){
        const pn=normalized(p);if(pn.length<3)continue;let strength=0;
        if(rawNorm.includes(pn))strength=1;
        else for(const t of (c.raw.match(/[A-Za-z][A-Za-z-]{2,24}/g)||[])){if(Math.abs(normalized(t).length-pn.length)<=2)strength=Math.max(strength,similarity(t,p));}
        if(strength<.76)continue;const score=(strength===1?1000:0)+strength*220+c.confidence;
        if(score>(bestBuddy.score||-1))bestBuddy={value:prettySpecies(p),support:1,confidence:c.confidence,strength,score,raw:c.raw};
      }
    }
    return {name:bestName,buddy:bestBuddy,raw:{nameCandidates,buddyCandidates}};
  }

  function drawFit(g,img,x,y,w,h){g.fillStyle='#fff';g.fillRect(x,y,w,h);const s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
  function textOnlySheet(){
    const c=document.createElement('canvas');c.width=1800;c.height=1160;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#111';
    g.font='900 42px system-ui';g.fillText('TRANSCRIBE ONLY THE VISIBLE PROFILE TEXT',50,58);g.font='700 24px system-ui';g.fillText('Do not identify the pictured characters. Read the letters from the crops. The high-contrast versions are the same pixels.',50,102);
    const rows=[['TRAINER USERNAME',NAME_RECT],['BUDDY SPECIES TEXT',BUDDY_RECT]];let y=150;
    for(const [label,rect] of rows){g.font='900 32px system-ui';g.fillText(label,50,y+34);const src=crop(rect,22),views=[variant(src,'original'),variant(src,'redtext'),variant(src,'reddiff')];for(let i=0;i<3;i++)drawFit(g,views[i],50+i*575,y+60,540,330);y+=465;}
    g.font='900 24px system-ui';g.fillText('Return only what the lettering says. If uncertain, return null instead of substituting a different username or Pokémon.',50,1115);return c.toDataURL('image/jpeg',.99);
  }

  async function refineTextAI(){
    if(!S.sourceImage||!S.hasOpenAIConfig?.())return null;const cfg=S.getOpenAIConfig(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),70000);
    try{const body={image:textOnlySheet()};if(cfg.accessCode)body.accessCode=cfg.accessCode;const r=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||`AI text verification failed (${r.status})`);return j.profile||null;}finally{clearTimeout(timeout);}
  }

  async function applyExactText(local,ai){
    const currentName=$('trainerName').value.trim(),currentBuddy=$('buddy').value.trim(),conf=ai?.confidence||{};
    const aiName=typeof ai?.trainerName==='string'?ai.trainerName.trim():'';
    const aiBuddy=typeof ai?.buddyName==='string'?ai.buddyName.trim():'';

    let finalName=currentName,nameState='review';
    if(local.name.value&&(local.name.support>=2||local.name.confidence>=55)){finalName=local.name.value;nameState='ok';}
    else if(aiName&&local.name.value&&similarity(aiName,local.name.value)>=.88){finalName=local.name.value.length>=aiName.length?local.name.value:aiName;nameState='ok';}
    else if(aiName&&Number(conf.trainerName||0)>=.86){finalName=aiName;nameState='review';}
    if(finalName){$('trainerName').value=finalName;S.setState('trainerName',nameState);}

    const names=await pokemonNames();const aiKnown=aiBuddy&&names.some(n=>normalized(n)===normalized(aiBuddy));
    let finalBuddy=currentBuddy,buddyState='review';
    if(local.buddy.value&&local.buddy.strength>=.90){finalBuddy=local.buddy.value;buddyState='ok';}
    else if(local.buddy.value&&aiKnown&&normalized(local.buddy.value)===normalized(aiBuddy)){finalBuddy=local.buddy.value;buddyState='ok';}
    else if(aiKnown&&!local.buddy.value){finalBuddy=aiBuddy;buddyState=Number(conf.buddyName||0)>=.90?'ok':'review';}
    if(finalBuddy){$('buddy').value=finalBuddy;S.setState('buddy',buddyState);}
    S.lastProfileRead ||= {};S.lastProfileRead.v22Exact={local,ai};S.updateQuality?.();S.drawFront?.();S.drawBack?.();
  }

  function autoGround(){
    const terrain=TERRAIN_Y[S.team]??665;Object.assign(S.scene,{bgY:0,bgZoom:1,groundY:terrain,autoGround:true});
    const bgY=$('sceneBgY'),bgZ=$('sceneBgZoom'),ground=$('sceneGround');if(bgY)bgY.value='0';if(bgZ)bgZ.value='1';if(ground)ground.value=String(terrain);
    if($('sceneBgYOut'))$('sceneBgYOut').textContent='0';if($('sceneBgZoomOut'))$('sceneBgZoomOut').textContent='1.00×';if($('sceneGroundOut'))$('sceneGroundOut').textContent=String(terrain);S.drawFront?.();
  }
  S.autoGroundScene=autoGround;

  if(baseScan){
    S.scanProfileOpenAI=async()=>{
      const ok=await baseScan();if(!ok)return false;
      try{$('scanCard')?.classList.remove('hidden');if($('scanTitle'))$('scanTitle').textContent='Verifying exact username and buddy text…';if($('scanDetail'))$('scanDetail').textContent='Independent local OCR + text-only AI check';const local=await localExactText();let ai=null;try{ai=await refineTextAI();}catch(e){console.warn('AI exact-text pass',e);}await applyExactText(local,ai);if($('scanTitle'))$('scanTitle').textContent='Profile verified';if($('scanDetail'))$('scanDetail').textContent='Exact text verification complete';}
      catch(e){console.warn('exact text verification',e);S.toast?.('Profile read completed, but exact text verification needs review.');}
      finally{$('scanCard')?.classList.add('hidden');}return true;
    };
  }

  function addSceneControls(){
    const anchor=$('extractHelp')?.parentElement;if(!anchor||$('sceneGround'))return;const wrap=document.createElement('div');wrap.className='controls single';wrap.style.marginTop='14px';const terrain=TERRAIN_Y[S.team]??665;
    wrap.innerHTML=`<label>Background vertical fine-tune <output id="sceneBgYOut">0</output><input id="sceneBgY" type="range" min="-45" max="45" value="0" step="1"></label><label>Background zoom fine-tune <output id="sceneBgZoomOut">1.00×</output><input id="sceneBgZoom" type="range" min="1" max="1.10" value="1" step="0.01"></label><label>Ground/contact fine-tune <output id="sceneGroundOut">${terrain}</output><input id="sceneGround" type="range" min="638" max="680" value="${terrain}" step="1"></label><label>Buddy placement <select id="buddyPlacement"><option value="ground">Grounded</option><option value="float">Flying / floating</option></select></label><label id="buddyFloatLabel">Buddy floating height <output id="buddyFloatOut">90</output><input id="buddyFloat" type="range" min="25" max="190" value="90" step="1"></label><div class="row compact"><button id="autoSceneBtn" class="secondary" type="button">Auto-align to terrain</button></div>`;
    anchor.parentElement.insertBefore(wrap,anchor.nextSibling);
    const sync=()=>{S.scene.bgY=+$('sceneBgY').value;S.scene.bgZoom=+$('sceneBgZoom').value;S.scene.groundY=+$('sceneGround').value;S.scene.buddyMode=$('buddyPlacement').value;S.scene.buddyFloat=+$('buddyFloat').value;S.scene.autoGround=false;$('sceneBgYOut').textContent=String(S.scene.bgY);$('sceneBgZoomOut').textContent=S.scene.bgZoom.toFixed(2)+'×';$('sceneGroundOut').textContent=String(S.scene.groundY);$('buddyFloatOut').textContent=String(S.scene.buddyFloat);$('buddyFloatLabel').style.opacity=S.scene.buddyMode==='float'?'1':'.45';$('buddyFloat').disabled=S.scene.buddyMode!=='float';S.drawFront?.();};
    ['sceneBgY','sceneBgZoom','sceneGround','buddyPlacement','buddyFloat'].forEach(id=>$(id).addEventListener('input',sync));$('autoSceneBtn').addEventListener('click',autoGround);$('resetBtn')?.addEventListener('click',()=>setTimeout(autoGround,0));autoGround();
  }

  const oldExtract=S.extractSubjects?.bind(S);if(oldExtract&&!S._v22ExtractWrapped){S.extractSubjects=async(...args)=>{const r=await oldExtract(...args);if(r)autoGround();return r;};S._v22ExtractWrapped=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addSceneControls);else addSceneControls();
})();
