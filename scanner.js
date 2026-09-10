(() => {
  const S=window.TC,$=S.$;
  const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const formatNum=d=>d.replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const cleanDate=t=>(t.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';
  const lev=(a,b)=>{a=norm(a);b=norm(b);const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const q=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=q}}return d[b.length]};

  async function pokemonNames(){
    if(S.pokemonNames)return S.pokemonNames;
    try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000');const j=await r.json();S.pokemonNames=j.results.map(x=>x.name);}catch{S.pokemonNames=[];}
    return S.pokemonNames;
  }

  function textTokens(text){
    const out=[];
    for(const line of (text||'').split(/[\r\n]+/)){
      const compact=line.replace(/[^A-Za-z0-9_-]/g,'').replace(/^[_-]+|[_-]+$/g,'');
      if(compact.length>=2&&compact.length<=28)out.push(compact);
      out.push(...(line.match(/[A-Za-z][A-Za-z0-9_-]{1,27}/g)||[]));
    }
    return [...new Set(out.map(x=>x.replace(/^[_-]+|[_-]+$/g,'')).filter(Boolean))];
  }

  function chooseTrainer(reads){
    const blocked=new Set(['me','friends','social','level','buddy','history','scrapbook','journal','style','total','activity']);
    const candidates=[];
    reads.forEach(r=>textTokens(r.text).forEach(t=>{if(blocked.has(norm(t))||/^\d+$/.test(t))return;let score=(r.confidence||0);if(/[A-Za-z]/.test(t)&&/\d/.test(t))score+=45;if(t.length>=5&&t.length<=18)score+=15;candidates.push({t,score});}));
    const freq={};candidates.forEach(c=>freq[c.t]=(freq[c.t]||0)+1);
    candidates.forEach(c=>c.score+=(freq[c.t]-1)*35);
    candidates.sort((a,b)=>b.score-a.score||b.t.length-a.t.length);
    return candidates[0]?.t||'';
  }

  async function chooseBuddy(reads,trainer){
    const joined=reads.map(r=>r.text).join(' '), joinedNorm=norm(joined), names=await pokemonNames();
    if(names.length){
      const direct=names.filter(p=>p.length>=3&&joinedNorm.includes(norm(p))).sort((a,b)=>b.length-a.length)[0];
      if(direct)return direct.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase());
    }
    const blocked=new Set(['buddy','history','scrapbook','journal','style','friends','social','me','mega','cp']);
    const words=textTokens(joined).map(x=>x.replace(/^mega/i,'').replace(/^\d+|\d+$/g,'')).filter(x=>x.length>=3&&!blocked.has(norm(x))&&norm(x)!==norm(trainer));
    if(!names.length)return words[0]||'';
    let best=['',99];
    for(const w of words){for(const p of names){const score=lev(w,p)/Math.max(w.length,p.length);if(score<best[1])best=[p,score];}}
    return best[1]<=.5?best[0].replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()):(words[0]||'');
  }

  function numberFrom(text){
    const ms=(text||'').match(/[\d][\d,\.\s]*/g)||[];
    const ds=ms.map(s=>s.replace(/\D/g,'')).filter(Boolean);
    return ds.sort((a,b)=>b.length-a.length)[0]||'';
  }

  function consensusNumber(reads,rules={}){
    const {minDigits=1,maxDigits=12,maxValue=Number.MAX_SAFE_INTEGER}=rules;
    const map=new Map();
    reads.forEach(r=>{const d=numberFrom(r.text);if(!d||d.length<minDigits||d.length>maxDigits||Number(d)>maxValue)return;const v=map.get(d)||{digits:d,count:0,confidence:0};v.count++;v.confidence=Math.max(v.confidence,r.confidence||0);map.set(d,v);});
    return [...map.values()].sort((a,b)=>b.count-a.count||b.confidence-a.confidence||b.digits.length-a.digits.length)[0]||null;
  }

  function consensusDate(reads){
    const map=new Map();reads.forEach(r=>{const d=cleanDate(r.text);if(!d)return;const v=map.get(d)||{value:d,count:0,confidence:0};v.count++;v.confidence=Math.max(v.confidence,r.confidence||0);map.set(d,v);});
    return [...map.values()].sort((a,b)=>b.count-a.count||b.confidence-a.confidence)[0]||null;
  }

  async function readSet(normal,masked,whitelist,extraPSM=false){
    const out=[];
    out.push(await S.read(normal,'7',whitelist));
    out.push(await S.read(masked,'7',whitelist));
    out.push(await S.read(normal,'6',whitelist));
    if(extraPSM)out.push(await S.read(masked,'13',whitelist));
    return out;
  }

  async function scanIdentity(token){
    $('scanDetail').textContent='Trainer name';
    const nameNormal=S.crop(S.sourceImage,.045,.126,.40,.038,6),nameMask=S.crop(S.sourceImage,.045,.126,.40,.038,6,'maroon');
    const nr=await readSet(nameNormal,nameMask,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',true);if(token!==S.jobToken)return;
    const trainer=chooseTrainer(nr);if(trainer){$('trainerName').value=trainer;S.setState('trainerName','ok');}else S.setState('trainerName','review');

    $('scanDetail').textContent='Buddy name';
    const buddyNormal=S.crop(S.sourceImage,.045,.151,.40,.036,7),buddyMask=S.crop(S.sourceImage,.045,.151,.40,.036,7,'maroon');
    const br=await readSet(buddyNormal,buddyMask,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-',true);if(token!==S.jobToken)return;
    const buddy=await chooseBuddy(br,trainer);if(token!==S.jobToken)return;if(buddy){$('buddy').value=buddy;S.setState('buddy','ok');}else S.setState('buddy','review');
  }

  async function scanStats(token){
    const jobs=[
      ['level','Level',[.055,.526,.16,.050],'red','0123456789',{minDigits:1,maxDigits:3,maxValue:100}],
      ['caught','Pokémon caught',[.585,.792,.30,.035],'green','0123456789,',{minDigits:2,maxDigits:9}],
      ['stops','PokéStops visited',[.585,.831,.30,.035],'green','0123456789,',{minDigits:2,maxDigits:9}],
      ['xp','Total XP',[.585,.870,.36,.035],'green','0123456789,',{minDigits:4,maxDigits:12}],
      ['startDate','Start date',[.585,.909,.30,.035],'green','0123456789/-',null]
    ];
    for(const [id,label,r,mode,whitelist,rules] of jobs){
      if(token!==S.jobToken)return;$('scanDetail').textContent=label;
      const normal=S.crop(S.sourceImage,...r,6),masked=S.crop(S.sourceImage,...r,6,mode),reads=await readSet(normal,masked,whitelist,id==='stops');
      if(token!==S.jobToken)return;
      if(id==='startDate'){
        const pick=consensusDate(reads);if(pick){$(id).value=pick.value;S.setState(id,pick.count>=2?'ok':'review');}else S.setState(id,'review');
      }else{
        const pick=consensusNumber(reads,rules||{});if(pick){$(id).value=id==='level'?String(Number(pick.digits)):formatNum(pick.digits);S.setState(id,pick.count>=2?'ok':'review');}else S.setState(id,'review');
      }
    }
  }

  S.scanProfile=async()=>{
    if(!S.sourceImage||S.scanning)return;const token=++S.jobToken;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanTitle').textContent='Reading profile locally…';$('scanPct').textContent='0%';
    ['trainerName','level','buddy','caught','stops','xp','startDate'].forEach(id=>{$(id).value='';S.setState(id,'manual');});
    try{S.setTeam(S.detectTeam(S.sourceImage),true);await scanIdentity(token);await scanStats(token);if(token!==S.jobToken)return;S.updateQuality();S.toast('Profile fields scanned. Review anything marked Review.');}
    catch(e){if(token===S.jobToken){console.error(e);S.toast('Profile scan needs manual review.');}}
    finally{if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');S.drawFront();S.drawBack();}}
  };

  const canvasFrom=img=>{const max=1800,s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c};
  const qrCrop=(c,b)=>{if(!b)return null;const p=Math.max(b.width,b.height)*.12,x=Math.max(0,b.x-p),y=Math.max(0,b.y-p),w=Math.min(c.width-x,b.width+2*p),h=Math.min(c.height-y,b.height+2*p),side=Math.min(c.width,c.height,Math.max(w,h)),cx=x+w/2,cy=y+h/2,sx=Math.max(0,Math.min(c.width-side,cx-side/2)),sy=Math.max(0,Math.min(c.height-side,cy-side/2)),o=document.createElement('canvas');o.width=o.height=640;o.getContext('2d').drawImage(c,sx,sy,side,side,0,0,640,640);return o};
  const extractCode=t=>{let m=t.match(/\b\d{4}[\s-]+\d{4}[\s-]+\d{4}\b/);if(m)return m[0].replace(/\D/g,'');m=t.match(/(?:^|\D)(\d{12})(?:\D|$)/);if(m)return m[1];for(const line of t.split(/[\r\n]+/)){const d=line.replace(/\D/g,'');if(d.length===12)return d;}return''};
  async function detectQr(c){if('BarcodeDetector'in window)try{const d=new BarcodeDetector({formats:['qr_code']}),r=await d.detect(c);if(r.length)return{raw:r[0].rawValue||'',crop:qrCrop(c,r[0].boundingBox)}}catch(e){console.warn(e)}if(window.jsQR)try{const g=c.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,c.width,c.height),r=window.jsQR(im.data,c.width,c.height,{inversionAttempts:'attemptBoth'});if(r){const p=[r.location.topLeftCorner,r.location.topRightCorner,r.location.bottomLeftCorner,r.location.bottomRightCorner],x=Math.min(...p.map(q=>q.x)),X=Math.max(...p.map(q=>q.x)),y=Math.min(...p.map(q=>q.y)),Y=Math.max(...p.map(q=>q.y));return{raw:r.data||'',crop:qrCrop(c,{x,y,width:X-x,height:Y-y})}}}catch(e){console.warn(e)}return{raw:'',crop:null}}
  S.scanCode=async()=>{if(!S.codeImage||S.codeScanning)return;const token=S.jobToken;S.codeScanning=true;$('codeScanStatus').textContent='Scanning…';try{const c=canvasFrom(S.codeImage),q=await detectQr(c);if(token!==S.jobToken)return;S.qrRaw=q.raw;S.qrCrop=q.crop;let code=extractCode(q.raw);if(!code){for(const psm of ['6','11']){const r=await S.read(c,psm,'0123456789 -');if(token!==S.jobToken)return;code=extractCode(r.text);if(code)break;}}if(code){$('trainerCode').value=code;$('trainerCodeState').textContent='Detected';$('trainerCodeState').className='ok'}else{$('trainerCodeState').textContent='Review';$('trainerCodeState').className='review'}$('qrStatus').textContent=S.qrCrop?'QR detected':'QR needs review';$('qrStatus').className=S.qrCrop?'chip accent':'chip';$('codeScanStatus').textContent=code&&S.qrCrop?'Ready':'Review';S.drawBack();}catch(e){if(token===S.jobToken){console.error(e);$('codeScanStatus').textContent='Review';}}finally{if(token===S.jobToken)S.codeScanning=false;}};
})();
