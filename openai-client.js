(() => {
  const S = window.TC, $ = S.$;
  const ENDPOINT_KEY = 'trainerCardOpenAIEndpoint';
  const ACCESS_KEY = 'trainerCardOpenAIAccessCode';
  const DEFAULT_ENDPOINT = 'https://trainer-card-api.rgarn023.workers.dev';

  const R = {
    trainerName:{rect:[.045,.118,.43,.055], whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', kind:'name'},
    buddyName:{rect:[.045,.145,.45,.060], whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-', kind:'buddy'},
    level:{rect:[.055,.526,.16,.050], whitelist:'0123456789', kind:'number', max:100},
    pokemonCaught:{rect:[.585,.792,.30,.035], whitelist:'0123456789,', kind:'number'},
    pokeStopsVisited:{rect:[.585,.831,.30,.035], whitelist:'0123456789,', kind:'number'},
    totalXP:{rect:[.585,.870,.36,.035], whitelist:'0123456789,', kind:'number'},
    startDate:{rect:[.585,.909,.30,.035], whitelist:'0123456789/-', kind:'date'}
  };

  S.getOpenAIConfig = () => ({endpoint:(localStorage.getItem(ENDPOINT_KEY)||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode:localStorage.getItem(ACCESS_KEY)||''});
  S.hasOpenAIConfig = () => /^https:\/\//i.test(S.getOpenAIConfig().endpoint);
  S.refreshOpenAIStatus=()=>{const endpoint=$('aiEndpoint'),accessCode=$('aiAccessCode'),status=$('aiStatus'),cfg=S.getOpenAIConfig();if(endpoint)endpoint.value=cfg.endpoint;if(accessCode)accessCode.value=cfg.accessCode;if(status){status.textContent=S.hasOpenAIConfig()?'OpenAI ready':'Setup required';status.className=S.hasOpenAIConfig()?'chip accent':'chip';}};
  S.saveOpenAIConfig=()=>{const endpoint=($('aiEndpoint')?.value||DEFAULT_ENDPOINT).trim().replace(/\/$/,''),accessCode=$('aiAccessCode')?.value||'';if(endpoint&&!/^https:\/\//i.test(endpoint)){S.toast('The AI endpoint must start with https://');return false;}localStorage.setItem(ENDPOINT_KEY,endpoint||DEFAULT_ENDPOINT);localStorage.setItem(ACCESS_KEY,accessCode);S.refreshOpenAIStatus();S.toast('OpenAI Vision connection saved.');return true;};

  function imageDataURL(img,max=2200,quality=.96){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,scale=Math.min(1,max/Math.max(iw,ih)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*scale));c.height=Math.max(1,Math.round(ih*scale));const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',quality);}
  function cropDataURL(img,rect,max=1000){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,[x,y,w,h]=rect,c=document.createElement('canvas'),sw=iw*w,sh=ih*h,s=Math.min(4,max/Math.max(sw,sh));c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,iw*x,ih*y,sw,sh,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.98);}

  async function analyze(cfg){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),70000);
    try{
      const body={image:imageDataURL(S.sourceImage),trainerNameCrop:cropDataURL(S.sourceImage,R.trainerName.rect),buddyNameCrop:cropDataURL(S.sourceImage,R.buddyName.rect),characterCrop:cropDataURL(S.sourceImage,[.04,.06,.86,.49],1200)};
      if(cfg.accessCode)body.accessCode=cfg.accessCode;
      const response=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||`AI request failed (${response.status})`);return payload;
    }finally{clearTimeout(timeout);}
  }

  const compact=t=>(t||'').replace(/\s+/g,' ').trim();
  const normalized=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function parseName(text){const tokens=(text||'').match(/[A-Za-z][A-Za-z0-9_-]{2,27}/g)||[];tokens.sort((a,b)=>{const sa=(/[A-Za-z]/.test(a)?20:0)+(/\d/.test(a)?20:0)+Math.min(a.length,16),sb=(/[A-Za-z]/.test(b)?20:0)+(/\d/.test(b)?20:0)+Math.min(b.length,16);return sb-sa;});return tokens[0]||'';}
  function parseNumber(text,max=Number.MAX_SAFE_INTEGER){const matches=(text||'').match(/\d[\d,.\s]*/g)||[],vals=matches.map(s=>s.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length);if(!vals.length)return null;const n=Number(vals[0]);return Number.isFinite(n)&&n<=max?n:null;}
  function parseDate(text){return((text||'').match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';}
  async function speciesNames(){if(Array.isArray(S.pokemonNames)&&S.pokemonNames.length)return S.pokemonNames;try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),j=await r.json();S.pokemonNames=(j.results||[]).map(x=>x.name);}catch{S.pokemonNames=[];}return S.pokemonNames;}
  async function parseBuddy(text){const n=normalized(text),names=await speciesNames(),direct=names.filter(p=>p.length>=3&&n.includes(normalized(p))).sort((a,b)=>b.length-a.length)[0];if(direct)return direct.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase());const tokens=(text||'').match(/[A-Za-z][A-Za-z-]{2,24}/g)||[];return tokens.sort((a,b)=>b.length-a.length)[0]||'';}

  async function readRegion(spec){const [x,y,w,h]=spec.rect,normal=S.crop(S.sourceImage,x,y,w,h,8,'normal');let r=await S.read(normal,'7',spec.whitelist),value='';if(spec.kind==='name')value=parseName(r.text);else if(spec.kind==='buddy')value=await parseBuddy(r.text);else if(spec.kind==='date')value=parseDate(r.text);else value=parseNumber(r.text,spec.max||Number.MAX_SAFE_INTEGER);return{value,confidence:Number(r.confidence||0),raw:compact(r.text)};}
  async function verifyLocally(token){const out={},order=['trainerName','buddyName','level','pokemonCaught','pokeStopsVisited','totalXP','startDate'];for(const key of order){if(token!==S.jobToken)throw new Error('cancelled');$('scanDetail').textContent=`Verifying ${key==='trainerName'?'trainer name':key==='buddyName'?'buddy':key==='pokemonCaught'?'Pokémon caught':key==='pokeStopsVisited'?'PokéStops visited':key==='totalXP'?'Total XP':key==='startDate'?'start date':'level'}`;out[key]=await readRegion(R[key]);}return out;}
  function setField(id,value,confidence,review=false){if(value===null||value===undefined||value===''){S.setState(id,'review');return;}if(['caught','stops','xp'].includes(id))value=Number(value).toLocaleString('en-US');$(id).value=String(value);S.setState(id,review?'review':Number(confidence||0)>=.72?'ok':'review');}
  const present=v=>v!==null&&v!==undefined&&v!=='';

  S.scanProfileOpenAI=async()=>{
    if(!S.sourceImage||!S.hasOpenAIConfig())return false;
    const cfg=S.getOpenAIConfig(),token=++S.jobToken;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanTitle').textContent='Reading profile with OpenAI + exact OCR…';$('scanPct').textContent='AI';
    try{
      $('scanDetail').textContent='OpenAI is identifying the profile and team';const ai=await analyze(cfg);if(token!==S.jobToken)return false;const local=await verifyLocally(token);if(token!==S.jobToken)return false;const p=ai.profile||{},c=p.confidence||{};

      // Names are difficult for OCR because the buddy overlaps the red profile text.
      // Use Vision as the authority when it returns a plausible value; OCR is only fallback.
      const nameAI=present(p.trainerName)?String(p.trainerName).trim():'',nameLocal=present(local.trainerName?.value)?String(local.trainerName.value).trim():'';
      const buddyAI=present(p.buddyName)?String(p.buddyName).trim():'',buddyLocal=present(local.buddyName?.value)?String(local.buddyName.value).trim():'';
      setField('trainerName',nameAI||nameLocal,nameAI?Number(c.trainerName||.75):Math.max(.4,(local.trainerName?.confidence||0)/100),!!(nameAI&&nameLocal&&normalized(nameAI)!==normalized(nameLocal)));
      setField('buddy',buddyAI||buddyLocal,buddyAI?Number(c.buddyName||.75):Math.max(.4,(local.buddyName?.confidence||0)/100),!!(buddyAI&&buddyLocal&&normalized(buddyAI)!==normalized(buddyLocal)));

      // The numeric Total Activity rows have stable locations, so exact local OCR is preferred.
      const numeric=[['level','level'],['caught','pokemonCaught'],['stops','pokeStopsVisited'],['xp','totalXP'],['startDate','startDate']];
      for(const [id,key] of numeric){const lv=local[key]?.value,lconf=Number(local[key]?.confidence||0),av=p[key],aconf=Number(c[key]||0);const useLocal=present(lv)&&(lconf>=35||!present(av));setField(id,useLocal?lv:av,useLocal?Math.max(.72,lconf/100):aconf,!!(present(lv)&&present(av)&&String(lv).replace(/\D/g,'')!==String(av).replace(/\D/g,'')));}

      const team=['valor','mystic','instinct'].includes(p.team)?p.team:S.detectTeam(S.sourceImage);S.setTeam(team,true);S.openAITrainerBox=p.trainerBox||null;S.openAIBuddyBox=p.buddyBox||null;S.lastProfileRead={ai:p,local};S.updateQuality();S.drawFront();S.drawBack();
      const remaining=Number(ai.remainingBudget);$('scanTitle').textContent='Profile verified';$('scanDetail').textContent=Number.isFinite(remaining)?`OpenAI + local verification · budget remaining $${Math.max(0,remaining).toFixed(2)}`:'OpenAI + local verification complete';S.toast('Profile read complete. Review any field marked Review.');return true;
    }catch(err){if(err?.message==='cancelled')return false;console.error('OpenAI Vision scan failed',err);const message=err?.name==='AbortError'?'OpenAI Vision timed out.':(err?.message||'OpenAI Vision failed.');S.toast(message+' Falling back to local OCR.');return false;}
    finally{if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');}}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('setup')==='1')document.body.classList.add('show-owner-setup');S.refreshOpenAIStatus();});
})();
