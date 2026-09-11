(() => {
  const S=window.TC,$=S.$;
  const ENDPOINT_KEY='trainerCardOpenAIEndpoint',ACCESS_KEY='trainerCardOpenAIAccessCode',DEFAULT_ENDPOINT='https://trainer-card-api.rgarn023.workers.dev';
  const R={
    trainerName:{rect:[.050,.126,.36,.034],whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',kind:'name'},
    buddyName:{rect:[.048,.153,.42,.035],whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-',kind:'buddy'},
    level:{rect:[.055,.526,.16,.050],whitelist:'0123456789',kind:'number',max:100},
    pokemonCaught:{rect:[.585,.792,.30,.035],whitelist:'0123456789,',kind:'number'},
    pokeStopsVisited:{rect:[.585,.831,.30,.035],whitelist:'0123456789,',kind:'number'},
    totalXP:{rect:[.585,.870,.36,.035],whitelist:'0123456789,',kind:'number'},
    startDate:{rect:[.585,.909,.30,.035],whitelist:'0123456789/-',kind:'date'}
  };
  const LABELS={trainerName:'TRAINER USERNAME',buddyName:'BUDDY NAME',level:'LEVEL',pokemonCaught:'POKEMON CAUGHT',pokeStopsVisited:'POKESTOPS VISITED',totalXP:'TOTAL XP',startDate:'START DATE'};

  S.getOpenAIConfig=()=>({endpoint:(localStorage.getItem(ENDPOINT_KEY)||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode:localStorage.getItem(ACCESS_KEY)||''});
  S.hasOpenAIConfig=()=>/^https:\/\//i.test(S.getOpenAIConfig().endpoint);
  S.refreshOpenAIStatus=()=>{const cfg=S.getOpenAIConfig(),e=$('aiEndpoint'),a=$('aiAccessCode'),s=$('aiStatus');if(e)e.value=cfg.endpoint;if(a)a.value=cfg.accessCode;if(s){s.textContent=S.hasOpenAIConfig()?'OpenAI ready':'Setup required';s.className=S.hasOpenAIConfig()?'chip accent':'chip';}};
  S.saveOpenAIConfig=()=>{const endpoint=($('aiEndpoint')?.value||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode=$('aiAccessCode')?.value||'';if(endpoint&&!/^https:\/\//i.test(endpoint)){S.toast('The AI endpoint must start with https://');return false;}localStorage.setItem(ENDPOINT_KEY,endpoint||DEFAULT_ENDPOINT);localStorage.setItem(ACCESS_KEY,accessCode);S.refreshOpenAIStatus();S.toast('OpenAI connection saved.');return true;};

  const normalized=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const present=v=>v!==null&&v!==undefined&&v!=='';

  function filteredCrop(spec,mode='normal',scale=12){
    const [x,y,w,h]=spec.rect;
    if(mode!=='profile-red') return S.crop(S.sourceImage,x,y,w,h,scale,mode);
    const c=S.crop(S.sourceImage,x,y,w,h,scale,'normal'),g=c.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,c.width,c.height),d=im.data;
    // Pokémon GO's trainer/buddy labels use a muted maroon. Armor/fire artwork is usually a much purer red.
    // Keep pixels with the UI text's characteristic red/green/blue ratios and reject the artwork/background.
    for(let i=0;i<d.length;i+=4){
      const r=d[i],gg=d[i+1],b=d[i+2],gr=gg/(r+1),br=b/(r+1);
      const hit=r>62&&r<225&&gr>.235&&gr<.64&&br>.255&&br<.76&&(r-gg)>18;
      const v=hit?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
    g.putImageData(im,0,0);return c;
  }
  function drawContain(g,img,x,y,w,h){const iw=img.width||1,ih=img.height||1,s=Math.min(w/iw,h/ih),dw=iw*s,dh=ih*s;g.fillStyle='#fff';g.fillRect(x,y,w,h);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}

  function verificationSheet(){
    const c=document.createElement('canvas');c.width=1600;c.height=1920;const g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#111';g.font='900 38px system-ui';g.fillText('TRANSCRIBE THESE LABELED PROFILE FIELDS',42,54);
    g.font='700 23px system-ui';g.fillText('Read the letters/digits shown in each row. For TRAINER USERNAME and BUDDY NAME, ignore all character artwork.',42,94);
    g.fillText('The right-hand image is color-isolated text. Do not identify the buddy by appearance. If a character is obscured, use both views.',42,126);
    g.font='800 18px system-ui';g.fillText('ORIGINAL CROP',42,165);g.fillText('TEXT-ISOLATED / HIGH-CONTRAST CROP',815,165);
    const keys=['trainerName','buddyName','level','pokemonCaught','pokeStopsVisited','totalXP','startDate'];
    let y=190;const rowH=238,leftX=42,rightX=815,boxW=735,boxH=164;
    for(const key of keys){
      const spec=R[key];g.fillStyle='#111';g.font='900 25px system-ui';g.fillText(LABELS[key],42,y+28);
      const normal=filteredCrop(spec,'normal',12);
      const mode=(key==='trainerName'||key==='buddyName')?'profile-red':(key==='level'?'red':'green');
      const filtered=filteredCrop(spec,mode,12);
      drawContain(g,normal,leftX,y+48,boxW,boxH);drawContain(g,filtered,rightX,y+48,boxW,boxH);
      g.strokeStyle='#d7d7d7';g.lineWidth=2;g.strokeRect(leftX,y+48,boxW,boxH);g.strokeRect(rightX,y+48,boxW,boxH);
      y+=rowH;
    }
    g.fillStyle='#111';g.font='800 22px system-ui';g.fillText('RETURN THE TEXT FROM THE LABELED ROWS — NOT A GUESS BASED ON THE CHARACTER ART.',42,1890);
    return c.toDataURL('image/jpeg',.97);
  }

  async function analyze(cfg){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),70000);
    try{const body={image:verificationSheet()};if(cfg.accessCode)body.accessCode=cfg.accessCode;const response=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||`AI request failed (${response.status})`);return payload;}finally{clearTimeout(timeout);}
  }

  function parseName(text){const tokens=(text||'').match(/[A-Za-z][A-Za-z0-9_-]{2,27}/g)||[];return tokens.sort((a,b)=>{const score=x=>(/\d/.test(x)?25:0)+(/[a-z].*[A-Z]|[A-Z].*[0-9]/.test(x)?8:0)+Math.min(x.length,22);return score(b)-score(a);})[0]||'';}
  function parseNumber(text,max=Number.MAX_SAFE_INTEGER){const vals=((text||'').match(/\d[\d,.\s]*/g)||[]).map(s=>s.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length);if(!vals.length)return null;const n=Number(vals[0]);return Number.isFinite(n)&&n<=max?n:null;}
  function parseDate(text){return((text||'').match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';}
  function editDistance(a,b){a=normalized(a);b=normalized(b);const m=a.length,n=b.length,dp=Array(n+1).fill(0).map((_,i)=>i);for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return dp[n];}
  function similarity(a,b){const m=Math.max(normalized(a).length,normalized(b).length,1);return 1-editDistance(a,b)/m;}

  async function speciesNames(){if(Array.isArray(S.pokemonNames)&&S.pokemonNames.length)return S.pokemonNames;try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),j=await r.json();S.pokemonNames=(j.results||[]).map(x=>x.name);}catch{S.pokemonNames=[];}return S.pokemonNames;}
  async function parseBuddy(text){
    const names=await speciesNames(),tokens=(text||'').match(/[A-Za-z][A-Za-z-]{2,24}/g)||[],all=normalized(text);
    const direct=names.filter(p=>p.length>=3&&all.includes(normalized(p))).sort((a,b)=>b.length-a.length)[0];
    if(direct)return{value:direct.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()),exact:true,strength:1};
    let best=null;
    for(const token of tokens){for(const p of names){if(Math.abs(normalized(token).length-normalized(p).length)>2)continue;const s=similarity(token,p);if(s>=.72&&(!best||s>best.strength))best={value:p.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()),exact:s>=.90,strength:s};}}
    return best||{value:tokens.sort((a,b)=>b.length-a.length)[0]||'',exact:false,strength:0};
  }

  function chooseConsensus(candidates){
    const groups=new Map();
    for(const c of candidates){if(!present(c.value))continue;const k=normalized(c.value);if(!k)continue;const g=groups.get(k)||{value:c.value,count:0,total:0,exact:false,strength:0,raw:[]};g.count++;g.total+=Number(c.confidence||0);g.exact=g.exact||!!c.exact;g.strength=Math.max(g.strength,Number(c.strength||0));g.raw.push(c.raw||'');if(String(c.value).length>String(g.value).length)g.value=c.value;groups.set(k,g);}
    let best=null;
    for(const g of groups.values()){g.avg=g.total/g.count;g.score=g.count*55+g.avg+(g.exact?55:0)+g.strength*30;if(!best||g.score>best.score)best=g;}
    return best?{value:best.value,confidence:Math.min(100,best.avg+Math.max(0,best.count-1)*10+(best.exact?8:0)),exact:best.exact,support:best.count,strength:best.strength,raw:best.raw.join(' | ')}:{value:'',confidence:0,exact:false,support:0,strength:0,raw:''};
  }

  async function readRegion(spec){
    const modes=spec.kind==='name'||spec.kind==='buddy'?['profile-red','maroon','normal','dark']:spec.kind==='number'?(spec===R.level?['red','normal']:['green','normal']):['green','normal'];
    const psms=spec.kind==='name'||spec.kind==='buddy'?['7','8']:['7'];const candidates=[];
    for(const mode of modes){for(const psm of psms){const c=filteredCrop(spec,mode,12),r=await S.read(c,psm,spec.whitelist);let value='',exact=false,strength=0;if(spec.kind==='name')value=parseName(r.text);else if(spec.kind==='buddy'){const b=await parseBuddy(r.text);value=b.value;exact=b.exact;strength=b.strength;}else if(spec.kind==='date')value=parseDate(r.text);else value=parseNumber(r.text,spec.max||Number.MAX_SAFE_INTEGER);if(present(value))candidates.push({value,confidence:Number(r.confidence||0)+(mode==='profile-red'?10:0),exact,strength,raw:(r.text||'').trim()});}}
    return chooseConsensus(candidates);
  }

  async function verifyLocally(token){const out={},order=['trainerName','buddyName','level','pokemonCaught','pokeStopsVisited','totalXP','startDate'];for(const key of order){if(token!==S.jobToken)throw new Error('cancelled');$('scanDetail').textContent=`Verifying ${LABELS[key].toLowerCase()}`;out[key]=await readRegion(R[key]);}return out;}
  function setField(id,value,confidence,review=false){if(!present(value)){S.setState(id,'review');return;}if(['caught','stops','xp'].includes(id))value=Number(value).toLocaleString('en-US');$(id).value=String(value);S.setState(id,review?'review':Number(confidence||0)>=.72?'ok':'review');}

  S.scanProfileOpenAI=async()=>{
    if(!S.sourceImage||!S.hasOpenAIConfig())return false;const cfg=S.getOpenAIConfig(),token=++S.jobToken;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanTitle').textContent='Reading exact profile text…';$('scanPct').textContent='AI';
    try{
      $('scanDetail').textContent='Sending original + color-isolated field closeups';const ai=await analyze(cfg);if(token!==S.jobToken)return false;const local=await verifyLocally(token);if(token!==S.jobToken)return false;const p=ai.profile||{},conf=p.confidence||{};

      const localName=local.trainerName?.value||'',aiName=present(p.trainerName)?String(p.trainerName).trim():'';const nameAgree=localName&&aiName&&normalized(localName)===normalized(aiName),nameClose=localName&&aiName&&similarity(localName,aiName)>=.84;
      let finalName='',nameConfidence=0,nameReview=false;
      if(nameAgree){finalName=localName;nameConfidence=Math.max(.90,Number(conf.trainerName||0));}
      else if(local.trainerName?.support>=2&&local.trainerName?.confidence>=45){finalName=localName;nameConfidence=Math.min(1,local.trainerName.confidence/100);nameReview=!nameClose;}
      else if(aiName&&Number(conf.trainerName||0)>=.82){finalName=aiName;nameConfidence=Number(conf.trainerName||0);nameReview=!!(localName&&!nameClose);}
      else{finalName=localName||aiName;nameConfidence=Math.max(Number(conf.trainerName||0),Number(local.trainerName?.confidence||0)/100);nameReview=true;}
      setField('trainerName',finalName,nameConfidence,nameReview);

      const names=await speciesNames(),localBuddy=local.buddyName?.value||'',aiBuddy=present(p.buddyName)?String(p.buddyName).trim():'',aiBuddyKnown=aiBuddy&&names.some(n=>normalized(n)===normalized(aiBuddy));
      const buddyAgree=localBuddy&&aiBuddy&&normalized(localBuddy)===normalized(aiBuddy);let finalBuddy='',buddyConfidence=0,buddyReview=false;
      if(buddyAgree){finalBuddy=localBuddy;buddyConfidence=.98;}
      else if(localBuddy&&(local.buddyName?.support>=2||local.buddyName?.strength>=.82)){finalBuddy=localBuddy;buddyConfidence=Math.min(1,Math.max(.82,local.buddyName.confidence/100));buddyReview=!!(aiBuddyKnown&&normalized(aiBuddy)!==normalized(localBuddy));}
      else if(aiBuddyKnown){finalBuddy=aiBuddy;buddyConfidence=Number(conf.buddyName||.75);buddyReview=!!localBuddy;}
      else{finalBuddy=localBuddy||aiBuddy;buddyConfidence=Math.max(Number(conf.buddyName||0),Number(local.buddyName?.confidence||0)/100);buddyReview=true;}
      setField('buddy',finalBuddy,buddyConfidence,buddyReview);

      for(const [id,key] of [['level','level'],['caught','pokemonCaught'],['stops','pokeStopsVisited'],['xp','totalXP'],['startDate','startDate']]){
        const lv=local[key]?.value,av=p[key],lconf=Number(local[key]?.confidence||0),aconf=Number(conf[key]||0),agree=present(lv)&&present(av)&&String(lv).replace(/\D/g,'')===String(av).replace(/\D/g,'');
        let value,confidence,review=false;
        if(agree){value=lv;confidence=Math.max(.94,aconf,lconf/100);}else if(present(lv)&&local[key]?.support>=2&&lconf>=38){value=lv;confidence=Math.min(1,Math.max(.78,lconf/100));review=present(av);}else if(present(av)&&aconf>=.86){value=av;confidence=aconf;review=present(lv);}else{value=present(lv)?lv:av;confidence=Math.max(lconf/100,aconf);review=true;}
        setField(id,value,confidence,review);
      }

      const team=['valor','mystic','instinct'].includes(p.team)?p.team:S.detectTeam(S.sourceImage);S.setTeam(team,true);S.openAITrainerBox=null;S.openAIBuddyBox=null;S.lastProfileRead={ai:p,local};S.updateQuality();S.drawFront();S.drawBack();$('scanTitle').textContent='Profile verified';$('scanDetail').textContent='Color-isolated AI read + OCR consensus complete';S.toast('Profile read complete. Any unresolved disagreement is marked Review.');return true;
    }catch(err){if(err?.message==='cancelled')return false;console.error('OpenAI scan failed',err);S.toast((err?.message||'OpenAI read failed')+' Falling back to local OCR.');return false;}finally{if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');}}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('setup')==='1')document.body.classList.add('show-owner-setup');S.refreshOpenAIStatus();});
})();
