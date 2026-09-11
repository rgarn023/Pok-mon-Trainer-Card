(() => {
  const S=window.TC,$=S.$;
  const baseScan=S.scanProfileOpenAI?.bind(S);
  const NAME_RECT=[.050,.126,.36,.034];
  const BUDDY_RECT=[.048,.153,.42,.035];

  S.scene ||= {groundY:652,bgY:0,bgZoom:1,buddyMode:'ground',buddyFloat:90};

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const normalized=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');

  function crop(rect,scale=18){
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
      const r=d[i],gg=d[i+1],b=d[i+2];let ink=false;
      if(mode==='redtext'){
        const gr=gg/(r+1),br=b/(r+1);
        ink=r>55&&r<235&&gr>.20&&gr<.70&&br>.20&&br<.82&&(r-gg)>14;
      }else if(mode==='reddiff'){
        ink=(r-Math.max(gg,b))>18&&r>65;
      }else{
        const lum=.299*r+.587*gg+.114*b;ink=lum<135;
      }
      const v=ink?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
    g.putImageData(im,0,0);return c;
  }

  function drawFit(g,img,x,y,w,h){
    g.fillStyle='#fff';g.fillRect(x,y,w,h);
    const s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
    g.strokeStyle='#cfd3d9';g.lineWidth=2;g.strokeRect(x,y,w,h);
  }

  function textOnlySheet(){
    const c=document.createElement('canvas');c.width=1800;c.height=1280;const g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#111';
    g.font='900 42px system-ui';g.fillText('EXACT TEXT TRANSCRIPTION ONLY',50,58);
    g.font='700 25px system-ui';g.fillText('Do not identify characters or infer names from artwork. Copy only the letters and digits visible in these crops.',50,102);
    g.fillText('Each row shows the same text four ways. Combine the visible strokes across all four views.',50,138);
    const rows=[['TRAINER USERNAME',NAME_RECT],['BUDDY NAME',BUDDY_RECT]];
    let y=190;
    for(const [label,rect] of rows){
      g.fillStyle='#111';g.font='900 34px system-ui';g.fillText(label,50,y+36);
      const src=crop(rect,20),views=[variant(src,'original'),variant(src,'redtext'),variant(src,'reddiff'),variant(src,'dark')];
      const labels=['ORIGINAL','RED UI TEXT','RED CHANNEL DIFFERENCE','DARK-STROKE CHECK'];
      for(let i=0;i<4;i++){
        const x=50+i*435;g.font='800 18px system-ui';g.fillText(labels[i],x,y+75);drawFit(g,views[i],x,y+92,400,300);
      }
      y+=505;
    }
    g.fillStyle='#111';g.font='900 25px system-ui';g.fillText('RETURN EXACT USERNAME AND BUDDY TEXT. IF A LETTER IS PARTLY COVERED, USE THE OTHER VIEWS; DO NOT SUBSTITUTE A DIFFERENT NAME.',50,1235);
    return c.toDataURL('image/jpeg',.98);
  }

  async function refineText(){
    if(!S.sourceImage||!S.hasOpenAIConfig?.())return null;
    const cfg=S.getOpenAIConfig(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),70000);
    try{
      const body={image:textOnlySheet()};if(cfg.accessCode)body.accessCode=cfg.accessCode;
      const r=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||`AI text verification failed (${r.status})`);return j.profile||null;
    }finally{clearTimeout(timeout);}
  }

  function applyRefined(profile){
    if(!profile)return;
    const conf=profile.confidence||{};
    const name=typeof profile.trainerName==='string'?profile.trainerName.trim():'';
    const buddy=typeof profile.buddyName==='string'?profile.buddyName.trim():'';
    if(name&&name.length>=3){
      const old=$('trainerName').value.trim(),same=normalized(old)===normalized(name);
      $('trainerName').value=name;S.setState('trainerName',Number(conf.trainerName||0)>=.72||same?'ok':'review');
    }
    if(buddy&&buddy.length>=3){
      const old=$('buddy').value.trim(),same=normalized(old)===normalized(buddy);
      $('buddy').value=buddy;S.setState('buddy',Number(conf.buddyName||0)>=.72||same?'ok':'review');
    }
    S.lastProfileRead ||= {};S.lastProfileRead.textOnly=profile;S.updateQuality?.();S.drawFront?.();S.drawBack?.();
  }

  if(baseScan){
    S.scanProfileOpenAI=async()=>{
      const ok=await baseScan();if(!ok)return false;
      try{
        $('scanCard')?.classList.remove('hidden');if($('scanTitle'))$('scanTitle').textContent='Double-checking exact username and buddy text…';if($('scanDetail'))$('scanDetail').textContent='Text-only AI pass — no trainer or buddy artwork is shown';
        const p=await refineText();applyRefined(p);
        if($('scanTitle'))$('scanTitle').textContent='Profile verified';if($('scanDetail'))$('scanDetail').textContent='Profile read + dedicated text-only verification complete';
      }catch(e){console.warn('text-only verification',e);S.toast?.('Profile read completed, but the dedicated text-only verification could not finish.');}
      finally{$('scanCard')?.classList.add('hidden');}
      return true;
    };
  }

  function addSceneControls(){
    const anchor=$('extractHelp')?.parentElement;if(!anchor||$('sceneGround'))return;
    const wrap=document.createElement('div');wrap.className='controls single';wrap.style.marginTop='14px';
    wrap.innerHTML=`
      <label>Background vertical alignment <output id="sceneBgYOut">0</output><input id="sceneBgY" type="range" min="-70" max="70" value="0" step="1"></label>
      <label>Background zoom <output id="sceneBgZoomOut">1.00×</output><input id="sceneBgZoom" type="range" min="1" max="1.16" value="1" step="0.01"></label>
      <label>Ground/contact line <output id="sceneGroundOut">652</output><input id="sceneGround" type="range" min="610" max="674" value="652" step="1"></label>
      <label>Buddy placement <select id="buddyPlacement"><option value="ground">Grounded</option><option value="float">Flying / floating</option></select></label>
      <label id="buddyFloatLabel">Buddy floating height <output id="buddyFloatOut">90</output><input id="buddyFloat" type="range" min="25" max="190" value="90" step="1"></label>
      <div class="row compact"><button id="resetSceneBtn" class="secondary" type="button">Reset scene alignment</button></div>`;
    anchor.parentElement.insertBefore(wrap,anchor.nextSibling);

    const sync=()=>{
      S.scene.bgY=+$('sceneBgY').value;S.scene.bgZoom=+$('sceneBgZoom').value;S.scene.groundY=+$('sceneGround').value;S.scene.buddyMode=$('buddyPlacement').value;S.scene.buddyFloat=+$('buddyFloat').value;
      $('sceneBgYOut').textContent=String(S.scene.bgY);$('sceneBgZoomOut').textContent=S.scene.bgZoom.toFixed(2)+'×';$('sceneGroundOut').textContent=String(S.scene.groundY);$('buddyFloatOut').textContent=String(S.scene.buddyFloat);
      $('buddyFloatLabel').style.opacity=S.scene.buddyMode==='float'?'1':'.45';$('buddyFloat').disabled=S.scene.buddyMode!=='float';S.drawFront?.();
    };
    ['sceneBgY','sceneBgZoom','sceneGround','buddyPlacement','buddyFloat'].forEach(id=>$(id).addEventListener('input',sync));
    $('resetSceneBtn').addEventListener('click',()=>{Object.assign(S.scene,{groundY:652,bgY:0,bgZoom:1,buddyMode:'ground',buddyFloat:90});$('sceneBgY').value='0';$('sceneBgZoom').value='1';$('sceneGround').value='652';$('buddyPlacement').value='ground';$('buddyFloat').value='90';sync();});
    $('resetBtn')?.addEventListener('click',()=>setTimeout(()=>{$('resetSceneBtn')?.click();},0));
    sync();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addSceneControls);else addSceneControls();
})();
