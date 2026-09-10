(() => {
  const S = window.TC, $ = S.$;
  const ENDPOINT_KEY = 'trainerCardOpenAIEndpoint';
  const ACCESS_KEY = 'trainerCardOpenAIAccessCode';
  const DEFAULT_ENDPOINT = 'https://trainer-card-api.rgarn023.workers.dev';

  const R = {
    trainerName:{rect:[.055,.132,.36,.030], whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', kind:'name'},
    buddyName:{rect:[.060,.157,.34,.026], whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-', kind:'buddy'},
    level:{rect:[.055,.526,.16,.050], whitelist:'0123456789', kind:'number', max:100},
    pokemonCaught:{rect:[.585,.792,.30,.035], whitelist:'0123456789,', kind:'number'},
    pokeStopsVisited:{rect:[.585,.831,.30,.035], whitelist:'0123456789,', kind:'number'},
    totalXP:{rect:[.585,.870,.36,.035], whitelist:'0123456789,', kind:'number'},
    startDate:{rect:[.585,.909,.30,.035], whitelist:'0123456789/-', kind:'date'}
  };

  S.getOpenAIConfig = () => ({
    endpoint: (localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT).trim().replace(/\/$/, ''),
    accessCode: localStorage.getItem(ACCESS_KEY) || ''
  });
  S.hasOpenAIConfig = () => /^https:\/\//i.test(S.getOpenAIConfig().endpoint);

  S.refreshOpenAIStatus = () => {
    const endpoint = $('aiEndpoint'), accessCode = $('aiAccessCode'), status = $('aiStatus');
    const cfg = S.getOpenAIConfig();
    if (endpoint) endpoint.value = cfg.endpoint;
    if (accessCode) accessCode.value = cfg.accessCode;
    if (status) {
      status.textContent = S.hasOpenAIConfig() ? 'OpenAI ready' : 'Setup required';
      status.className = S.hasOpenAIConfig() ? 'chip accent' : 'chip';
    }
  };

  S.saveOpenAIConfig = () => {
    const endpoint = ($('aiEndpoint')?.value || DEFAULT_ENDPOINT).trim().replace(/\/$/, '');
    const accessCode = $('aiAccessCode')?.value || '';
    if (endpoint && !/^https:\/\//i.test(endpoint)) { S.toast('The AI endpoint must start with https://'); return false; }
    localStorage.setItem(ENDPOINT_KEY, endpoint || DEFAULT_ENDPOINT);
    localStorage.setItem(ACCESS_KEY, accessCode);
    S.refreshOpenAIStatus();
    S.toast('OpenAI Vision connection saved.');
    return true;
  };

  function fullDataURL(img){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    const max=2200, scale=Math.min(1,max/Math.max(iw,ih));
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(iw*scale)); c.height=Math.max(1,Math.round(ih*scale));
    const g=c.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.95);
  }

  async function analyze(cfg,image){
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),70000);
    try{
      const body={image}; if(cfg.accessCode) body.accessCode=cfg.accessCode;
      const response=await fetch(cfg.endpoint+'/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload?.error||`AI request failed (${response.status})`);
      return payload;
    } finally { clearTimeout(timeout); }
  }

  const compact = t => (t||'').replace(/\s+/g,' ').trim();
  const normalized = t => (t||'').toLowerCase().replace(/[^a-z0-9]/g,'');

  function parseName(text){
    const tokens=(text||'').match(/[A-Za-z][A-Za-z0-9_-]{2,27}/g)||[];
    tokens.sort((a,b)=>{
      const sa=(/[A-Za-z]/.test(a)?20:0)+(/\d/.test(a)?20:0)+Math.min(a.length,16);
      const sb=(/[A-Za-z]/.test(b)?20:0)+(/\d/.test(b)?20:0)+Math.min(b.length,16);
      return sb-sa;
    });
    return tokens[0]||'';
  }
  function parseNumber(text,max=Number.MAX_SAFE_INTEGER){
    const matches=(text||'').match(/\d[\d,.\s]*/g)||[];
    const vals=matches.map(s=>s.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length);
    if(!vals.length) return null;
    const n=Number(vals[0]); return Number.isFinite(n)&&n<=max?n:null;
  }
  function parseDate(text){ return ((text||'').match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||''; }

  async function speciesNames(){
    if(Array.isArray(S.pokemonNames)&&S.pokemonNames.length) return S.pokemonNames;
    try{
      const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000');
      const j=await r.json(); S.pokemonNames=(j.results||[]).map(x=>x.name);
    }catch{ S.pokemonNames=[]; }
    return S.pokemonNames;
  }
  async function parseBuddy(text){
    const n=normalized(text), names=await speciesNames();
    const direct=names.filter(p=>p.length>=3&&n.includes(normalized(p))).sort((a,b)=>b.length-a.length)[0];
    if(direct) return direct.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase());
    const tokens=(text||'').match(/[A-Za-z][A-Za-z-]{2,24}/g)||[];
    return tokens.sort((a,b)=>b.length-a.length)[0]||'';
  }

  async function readRegion(spec){
    const [x,y,w,h]=spec.rect;
    const normal=S.crop(S.sourceImage,x,y,w,h,8,'normal');
    let r=await S.read(normal,'7',spec.whitelist);
    let value='';
    if(spec.kind==='name') value=parseName(r.text);
    else if(spec.kind==='buddy') value=await parseBuddy(r.text);
    else if(spec.kind==='date') value=parseDate(r.text);
    else value=parseNumber(r.text,spec.max||Number.MAX_SAFE_INTEGER);
    return {value,confidence:Number(r.confidence||0),raw:compact(r.text)};
  }

  async function verifyLocally(token){
    const out={};
    const order=['trainerName','buddyName','level','pokemonCaught','pokeStopsVisited','totalXP','startDate'];
    for(const key of order){
      if(token!==S.jobToken) throw new Error('cancelled');
      $('scanDetail').textContent=`Verifying ${key==='trainerName'?'trainer name':key==='buddyName'?'buddy':key==='pokemonCaught'?'Pokémon caught':key==='pokeStopsVisited'?'PokéStops visited':key==='totalXP'?'Total XP':key==='startDate'?'start date':'level'}`;
      out[key]=await readRegion(R[key]);
    }
    return out;
  }

  function setField(id,value,confidence){
    if(value===null||value===undefined||value===''){ S.setState(id,'review'); return; }
    if(['caught','stops','xp'].includes(id)) value=Number(value).toLocaleString('en-US');
    $(id).value=String(value); S.setState(id,Number(confidence||0)>=.75?'ok':'review');
  }

  S.scanProfileOpenAI = async () => {
    if(!S.sourceImage||!S.hasOpenAIConfig()) return false;
    const cfg=S.getOpenAIConfig(), token=++S.jobToken; S.scanning=true;
    $('scanCard').classList.remove('hidden'); $('scanTitle').textContent='Reading profile with OpenAI + exact OCR…'; $('scanPct').textContent='AI';
    try{
      $('scanDetail').textContent='OpenAI is identifying the profile and team';
      const ai=await analyze(cfg,fullDataURL(S.sourceImage)); if(token!==S.jobToken)return false;
      const local=await verifyLocally(token); if(token!==S.jobToken)return false;
      const p=ai.profile||{}, c=p.confidence||{};
      const choose=(key)=>local[key]?.value!==''&&local[key]?.value!==null&&local[key]?.value!==undefined?local[key].value:p[key];
      const q=(key)=>local[key]?.value!==''&&local[key]?.value!==null&&local[key]?.value!==undefined?Math.max(.90,Math.min(1,(local[key].confidence||0)/100)):Number(c[key]||0);

      setField('trainerName',choose('trainerName'),q('trainerName'));
      setField('level',choose('level'),q('level'));
      setField('buddy',choose('buddyName'),q('buddyName'));
      setField('caught',choose('pokemonCaught'),q('pokemonCaught'));
      setField('stops',choose('pokeStopsVisited'),q('pokeStopsVisited'));
      setField('xp',choose('totalXP'),q('totalXP'));
      setField('startDate',choose('startDate'),q('startDate'));

      const team=['valor','mystic','instinct'].includes(p.team)?p.team:S.detectTeam(S.sourceImage);
      S.setTeam(team,true);
      S.openAITrainerBox=p.trainerBox||null; S.openAIBuddyBox=p.buddyBox||null;
      S.lastProfileRead={ai:p,local};
      S.updateQuality(); S.drawFront(); S.drawBack();
      const remaining=Number(ai.remainingBudget);
      $('scanTitle').textContent='Profile verified';
      $('scanDetail').textContent=Number.isFinite(remaining)?`OpenAI + local text verification · budget remaining $${Math.max(0,remaining).toFixed(2)}`:'OpenAI + local text verification complete';
      S.toast('Profile text verified against the exact Pokémon GO fields.');
      return true;
    }catch(err){
      if(err?.message==='cancelled') return false;
      console.error('OpenAI Vision scan failed',err);
      const message=err?.name==='AbortError'?'OpenAI Vision timed out.':(err?.message||'OpenAI Vision failed.');
      S.toast(message+' Falling back to local OCR.'); return false;
    }finally{
      if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');}
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('setup')==='1')document.body.classList.add('show-owner-setup');S.refreshOpenAIStatus();});
})();
