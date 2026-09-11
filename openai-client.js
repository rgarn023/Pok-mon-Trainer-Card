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
  S.getOpenAIConfig=()=>({endpoint:(localStorage.getItem(ENDPOINT_KEY)||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode:localStorage.getItem(ACCESS_KEY)||''});
  S.hasOpenAIConfig=()=>/^https:\/\//i.test(S.getOpenAIConfig().endpoint);
  S.refreshOpenAIStatus=()=>{const cfg=S.getOpenAIConfig(),e=$('aiEndpoint'),a=$('aiAccessCode'),s=$('aiStatus');if(e)e.value=cfg.endpoint;if(a)a.value=cfg.accessCode;if(s){s.textContent=S.hasOpenAIConfig()?'OpenAI ready':'Setup required';s.className=S.hasOpenAIConfig()?'chip accent':'chip';}};
  S.saveOpenAIConfig=()=>{const endpoint=($('aiEndpoint')?.value||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode=$('aiAccessCode')?.value||'';if(endpoint&&!/^https:\/\//i.test(endpoint)){S.toast('The AI endpoint must start with https://');return false;}localStorage.setItem(ENDPOINT_KEY,endpoint||DEFAULT_ENDPOINT);localStorage.setItem(ACCESS_KEY,accessCode);S.refreshOpenAIStatus();S.toast('OpenAI connection saved.');return true;};

  function verificationSheet(){
    const src=S.sourceImage,iw=src.naturalWidth||src.width,ih=src.naturalHeight||src.height;
    const c=document.createElement('canvas');c.width=1400;c.height=1750;const g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#111';g.font='800 34px system-ui';g.fillText('FULL PROFILE',40,48);
    const fullW=610,fullH=1450,scale=Math.min(fullW/iw,fullH/ih),dw=iw*scale,dh=ih*scale;g.drawImage(src,40,75,dw,dh);
    const items=[
      ['TRAINER USERNAME',R.trainerName.rect],['BUDDY NAME',R.buddyName.rect],['LEVEL',R.level.rect],['POKEMON CAUGHT',R.pokemonCaught.rect],['POKESTOPS VISITED',R.pokeStopsVisited.rect],['TOTAL XP',R.totalXP.rect],['START DATE',R.startDate.rect]
    ];
    let y=70;const x=700,boxW=650,boxH=185;
    for(const [label,rect] of items){
      g.fillStyle='#111';g.font='800 26px system-ui';g.fillText(label,x,y+28);
      g.fillStyle='#f4f4f4';g.fillRect(x,y+42,boxW,boxH-48);
      const [rx,ry,rw,rh]=rect,sw=iw*rw,sh=ih*rh,fit=Math.min((boxW-20)/sw,(boxH-62)/sh);
      g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.drawImage(src,iw*rx,ih*ry,sw,sh,x+10,y+50,sw*fit,sh*fit);
      y+=232;
    }
    g.fillStyle='#111';g.font='700 22px system-ui';g.fillText('Use the labeled closeups to transcribe text exactly. Do not identify the buddy by appearance.',700,1710);
    return c.toDataURL('image/jpeg',.95);
  }

  async function analyze(cfg){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),70000);try{const body={image:verificationSheet()};if(cfg.accessCode)body.accessCode=cfg.accessCode;const response=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||`AI request failed (${response.status})`);return payload;}finally{clearTimeout(timeout);}}

  const normalized=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function parseName(text){const tokens=(text||'').match(/[A-Za-z][A-Za-z0-9_-]{2,27}/g)||[];return tokens.sort((a,b)=>{const score=x=>(/\d/.test(x)?25:0)+(/[A-Z].*[A-Z]|[a-z].*[A-Z]/.test(x)?10:0)+Math.min(x.length,20);return score(b)-score(a);})[0]||'';}
  function parseNumber(text,max=Number.MAX_SAFE_INTEGER){const vals=((text||'').match(/\d[\d,.\s]*/g)||[]).map(s=>s.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length);if(!vals.length)return null;const n=Number(vals[0]);return Number.isFinite(n)&&n<=max?n:null;}
  function parseDate(text){return((text||'').match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';}
  async function speciesNames(){if(Array.isArray(S.pokemonNames)&&S.pokemonNames.length)return S.pokemonNames;try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),j=await r.json();S.pokemonNames=(j.results||[]).map(x=>x.name);}catch{S.pokemonNames=[];}return S.pokemonNames;}
  async function parseBuddy(text){const n=normalized(text),names=await speciesNames(),direct=names.filter(p=>p.length>=3&&n.includes(normalized(p))).sort((a,b)=>b.length-a.length)[0];if(direct)return{value:direct.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()),exact:true};const tokens=(text||'').match(/[A-Za-z][A-Za-z-]{2,24}/g)||[];return{value:tokens.sort((a,b)=>b.length-a.length)[0]||'',exact:false};}

  async function readRegion(spec){
    const [x,y,w,h]=spec.rect,modes=(spec.kind==='name'||spec.kind==='buddy')?['maroon','normal','dark']:['normal'];
    const psms=(spec.kind==='name'||spec.kind==='buddy')?['8','7']:['7'];let best={value:'',confidence:0,exact:false,raw:''};
    for(const mode of modes){for(const psm of psms){const c=S.crop(S.sourceImage,x,y,w,h,12,mode),r=await S.read(c,psm,spec.whitelist);let value='',exact=false;if(spec.kind==='name')value=parseName(r.text);else if(spec.kind==='buddy'){const b=await parseBuddy(r.text);value=b.value;exact=b.exact;}else if(spec.kind==='date')value=parseDate(r.text);else value=parseNumber(r.text,spec.max||Number.MAX_SAFE_INTEGER);const confidence=Number(r.confidence||0)+(exact?40:0)+(mode==='maroon'&&(spec.kind==='name'||spec.kind==='buddy')?8:0);if(value!==''&&value!==null&&confidence>best.confidence)best={value,confidence,exact,raw:(r.text||'').trim()};}}
    return best;
  }
  async function verifyLocally(token){const out={},order=['trainerName','buddyName','level','pokemonCaught','pokeStopsVisited','totalXP','startDate'];for(const key of order){if(token!==S.jobToken)throw new Error('cancelled');$('scanDetail').textContent=`Verifying ${key==='trainerName'?'trainer name':key==='buddyName'?'buddy':key==='pokemonCaught'?'Pokémon caught':key==='pokeStopsVisited'?'PokéStops visited':key==='totalXP'?'Total XP':key==='startDate'?'start date':'level'}`;out[key]=await readRegion(R[key]);}return out;}
  function setField(id,value,confidence,review=false){if(value===null||value===undefined||value===''){S.setState(id,'review');return;}if(['caught','stops','xp'].includes(id))value=Number(value).toLocaleString('en-US');$(id).value=String(value);S.setState(id,review?'review':Number(confidence||0)>=.72?'ok':'review');}
  const present=v=>v!==null&&v!==undefined&&v!=='';

  S.scanProfileOpenAI=async()=>{
    if(!S.sourceImage||!S.hasOpenAIConfig())return false;const cfg=S.getOpenAIConfig(),token=++S.jobToken;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanTitle').textContent='Reading profile with OpenAI + OCR…';$('scanPct').textContent='AI';
    try{
      $('scanDetail').textContent='Reading enlarged field verification sheet';const ai=await analyze(cfg);if(token!==S.jobToken)return false;const local=await verifyLocally(token);if(token!==S.jobToken)return false;const p=ai.profile||{},c=p.confidence||{};
      const nameLocal=local.trainerName?.value||'',nameAI=present(p.trainerName)?String(p.trainerName).trim():'';
      const namesDisagree=nameLocal&&nameAI&&normalized(nameLocal)!==normalized(nameAI);const useAIName=present(nameAI)&&(Number(c.trainerName||0)>=.62||namesDisagree);const finalName=useAIName?nameAI:nameLocal;
      setField('trainerName',finalName,useAIName?Number(c.trainerName||0):Math.min(1,local.trainerName.confidence/100),!!(namesDisagree&&Number(c.trainerName||0)<.72));
      const buddyLocal=local.buddyName?.value||'',buddyAI=present(p.buddyName)?String(p.buddyName).trim():'';
      const buddyAIKnown=buddyAI&&((await speciesNames()).some(n=>normalized(n)===normalized(buddyAI)));const useLocalBuddy=present(buddyLocal)&&local.buddyName.exact;const finalBuddy=useLocalBuddy?buddyLocal:(buddyAIKnown?buddyAI:(buddyLocal||buddyAI));
      setField('buddy',finalBuddy,useLocalBuddy?1:Number(c.buddyName||0),!!(buddyLocal&&buddyAI&&normalized(buddyLocal)!==normalized(buddyAI)&&!useLocalBuddy));
      for(const [id,key] of [['level','level'],['caught','pokemonCaught'],['stops','pokeStopsVisited'],['xp','totalXP'],['startDate','startDate']]){const lv=local[key]?.value,av=p[key],useLocal=present(lv)&&local[key].confidence>=30;setField(id,useLocal?lv:av,useLocal?Math.min(1,Math.max(.72,local[key].confidence/100)):Number(c[key]||0),!!(present(lv)&&present(av)&&String(lv).replace(/\D/g,'')!==String(av).replace(/\D/g,'')));}
      const team=['valor','mystic','instinct'].includes(p.team)?p.team:S.detectTeam(S.sourceImage);S.setTeam(team,true);S.openAITrainerBox=null;S.openAIBuddyBox=null;S.lastProfileRead={ai:p,local};S.updateQuality();S.drawFront();S.drawBack();$('scanTitle').textContent='Profile verified';$('scanDetail').textContent='Enlarged AI read + multi-pass local verification complete';S.toast('Profile read complete. Review any field marked Review.');return true;
    }catch(err){if(err?.message==='cancelled')return false;console.error('OpenAI scan failed',err);S.toast((err?.message||'OpenAI read failed')+' Falling back to local OCR.');return false;}finally{if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');}}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('setup')==='1')document.body.classList.add('show-owner-setup');S.refreshOpenAIStatus();});
})();