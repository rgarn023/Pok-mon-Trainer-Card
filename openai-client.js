(() => {
  const S = window.TC, $ = S.$;
  const ENDPOINT_KEY = 'trainerCardOpenAIEndpoint';
  const ACCESS_KEY = 'trainerCardOpenAIAccessCode';
  const DEFAULT_ENDPOINT = 'https://trainer-card-api.rgarn023.workers.dev';

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

  function drawCrop(g,img,dx,dy,dw,dh,r){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    g.drawImage(img,iw*r.x,ih*r.y,iw*r.w,ih*r.h,dx,dy,dw,dh);
  }

  function fullDataURL(img){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    const max=2200, scale=Math.min(1.4,max/Math.max(iw,ih));
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(iw*scale)); c.height=Math.max(1,Math.round(ih*scale));
    const g=c.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.94);
  }

  function textSheetDataURL(img){
    const c=document.createElement('canvas'); c.width=1800; c.height=2200;
    const g=c.getContext('2d'); g.fillStyle='#0a0d12'; g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#fff'; g.font='800 34px system-ui'; g.fillText('FULL PROFILE',60,55);
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    const fullH=1480, fullW=Math.round(fullH*iw/ih); g.drawImage(img,0,0,iw,ih,60,85,fullW,fullH);
    const rightX=Math.max(850,90+fullW), rightW=1800-Math.max(850,90+fullW)-60;
    const regions=[
      ['TRAINER NAME + BUDDY',{x:.03,y:.105,w:.62,h:.105},85,370],
      ['LEVEL',{x:.02,y:.485,w:.34,h:.10},570,300],
      ['TOTAL ACTIVITY',{x:.50,y:.765,w:.48,h:.175},985,650]
    ];
    for(const [label,r,y,h] of regions){
      g.fillStyle='#fff'; g.font='800 28px system-ui'; g.fillText(label,rightX,y-18);
      g.fillStyle='#151a22'; g.fillRect(rightX,y,rightW,h);
      drawCrop(g,img,rightX,y,rightW,h,r);
      g.strokeStyle='#fff'; g.lineWidth=3; g.strokeRect(rightX,y,rightW,h);
    }
    g.fillStyle='#fff'; g.font='700 25px system-ui'; g.fillText('Use the enlarged crops to verify exact characters and digits.',rightX,1740);
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

  function setField(id,value,confidence){
    if(value===null||value===undefined||value===''){ S.setState(id,'review'); return; }
    if(['caught','stops','xp'].includes(id)) value=Number(value).toLocaleString('en-US');
    $(id).value=String(value); S.setState(id,Number(confidence||0)>=.82?'ok':'review');
  }

  S.scanProfileOpenAI = async () => {
    if(!S.sourceImage||!S.hasOpenAIConfig()) return false;
    const cfg=S.getOpenAIConfig(), token=++S.jobToken; S.scanning=true;
    $('scanCard').classList.remove('hidden'); $('scanTitle').textContent='Reading profile with OpenAI Vision…'; $('scanPct').textContent='AI';
    try{
      $('scanDetail').textContent='Finding trainer, buddy and team';
      const full=await analyze(cfg,fullDataURL(S.sourceImage)); if(token!==S.jobToken)return false;
      $('scanDetail').textContent='Verifying exact text and activity totals';
      let text=full;
      try{text=await analyze(cfg,textSheetDataURL(S.sourceImage));}catch(e){console.warn('Enhanced text pass failed; using full screenshot result',e);}
      if(token!==S.jobToken)return false;

      const fp=full.profile||{}, tp=text.profile||{}, fc=fp.confidence||{}, tc=tp.confidence||{};
      const pick=(k)=>tp[k]!==null&&tp[k]!==undefined&&tp[k]!==''?tp[k]:fp[k];
      const conf=(k)=>Math.max(Number(tc[k]||0),Number(fc[k]||0));
      setField('trainerName',pick('trainerName'),conf('trainerName'));
      setField('level',pick('level'),conf('level'));
      setField('buddy',pick('buddyName'),conf('buddyName'));
      setField('caught',pick('pokemonCaught'),conf('pokemonCaught'));
      setField('stops',pick('pokeStopsVisited'),conf('pokeStopsVisited'));
      setField('xp',pick('totalXP'),conf('totalXP'));
      setField('startDate',pick('startDate'),conf('startDate'));

      const team=['valor','mystic','instinct'].includes(fp.team)?fp.team:tp.team;
      if(['valor','mystic','instinct'].includes(team)) S.setTeam(team,true);
      S.openAITrainerBox=fp.trainerBox||null; S.openAIBuddyBox=fp.buddyBox||null;
      S.updateQuality(); S.drawFront(); S.drawBack();
      const remaining=Number(text.remainingBudget ?? full.remainingBudget);
      $('scanTitle').textContent='OpenAI Vision scan complete';
      $('scanDetail').textContent=Number.isFinite(remaining)?`Estimated API budget remaining: $${Math.max(0,remaining).toFixed(2)}`:'Profile fields extracted';
      S.toast('OpenAI verified the profile using enlarged text crops.');
      return true;
    }catch(err){
      console.error('OpenAI Vision scan failed',err);
      const message=err?.name==='AbortError'?'OpenAI Vision timed out.':(err?.message||'OpenAI Vision failed.');
      S.toast(message+' Falling back to local OCR.'); return false;
    }finally{
      if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');}
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('setup')==='1')document.body.classList.add('show-owner-setup');S.refreshOpenAIStatus();});
})();
