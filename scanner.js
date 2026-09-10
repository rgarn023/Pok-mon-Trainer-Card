(() => {
  const S=window.TC,$=S.$;
  const cleanDate=t=>(t.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';
  const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const cap=s=>s?s.replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()):'';
  const textCandidates=t=>[...new Set((t||'').split(/[\n\r]+/).flatMap(line=>[line.replace(/[^A-Za-z0-9_-]/g,''),...(line.match(/[A-Za-z][A-Za-z0-9_-]{2,24}/g)||[])]).filter(Boolean))];
  const cleanTrainer=t=>{const blocked=new Set(['me','friends','social','level','buddy','history','scrapbook','journal','style','total','activity']);const c=textCandidates(t).filter(x=>!blocked.has(norm(x))&&!/^\d+$/.test(x));return c.find(x=>/[A-Za-z]/.test(x)&&/\d/.test(x))||c.find(x=>/[A-Z]/.test(x)&&/[a-z]/.test(x))||c[0]||''};
  const lev=(a,b)=>{a=norm(a);b=norm(b);const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const q=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=q}}return d[b.length]};
  async function names(){if(S.pokemonNames)return S.pokemonNames;try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000');const j=await r.json();S.pokemonNames=j.results.map(x=>x.name)}catch{S.pokemonNames=[]}return S.pokemonNames}
  async function cleanBuddy(t,trainer){const blocked=new Set(['buddy','history','scrapbook','journal','style','friends','social','me','mega','cp']);const words=textCandidates(t).map(x=>x.replace(/^mega/i,'').replace(/^\d+|\d+$/g,'')).filter(x=>x.length>=3&&!blocked.has(norm(x))&&norm(x)!==norm(trainer));const n=await names();if(!n.length)return words[0]||'';let best=['',99];for(const w of words)for(const p of n){const s=lev(w,p)/Math.max(w.length,p.length);if(s<best[1])best=[p,s]}return best[1]<=.45?cap(best[0]):(words[0]||'')}
  const num=t=>{const m=(t||'').match(/[\d][\d,\.\s]*/g)||[];return m.map(s=>s.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length)[0]||''};
  const fmt=d=>d.replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const bestConfidence=arr=>Math.round(Math.max(0,...arr.map(r=>Number(r.confidence)||0)));

  function fieldCrops(){
    const I=S.sourceImage;
    return {
      trainerName:[S.crop(I,.045,.126,.40,.038,4),S.crop(I,.045,.129,.40,.032,5,'maroon')],
      buddy:[S.crop(I,.045,.151,.40,.036,5),S.crop(I,.045,.154,.40,.030,6,'maroon')],
      level:[S.crop(I,.045,.518,.19,.062,4),S.crop(I,.045,.518,.19,.062,5,'red')],
      caught:[S.crop(I,.565,.786,.36,.047,4),S.crop(I,.565,.786,.36,.047,5,'green')],
      stops:[S.crop(I,.565,.825,.36,.047,4),S.crop(I,.565,.825,.36,.047,5,'green')],
      xp:[S.crop(I,.555,.863,.40,.047,4),S.crop(I,.555,.863,.40,.047,5,'green')],
      startDate:[S.crop(I,.565,.902,.34,.047,4),S.crop(I,.565,.902,.34,.047,5,'green')]
    };
  }

  async function paddleScan(){
    $('scanDetail').textContent='Loading local AI OCR…';
    const crops=fieldCrops();
    const keys=['trainerName','buddy','level','caught','stops','xp','startDate'];
    const flat=keys.flatMap(k=>crops[k]);
    const results=await S.paddleReadMany(flat);
    const grouped={};let j=0;for(const k of keys){grouped[k]=[results[j++],results[j++]];}

    const trainer=cleanTrainer(grouped.trainerName.map(r=>r.text).join('\n'));
    if(trainer){$('trainerName').value=trainer;S.setState('trainerName',bestConfidence(grouped.trainerName)>=55?'ok':'review')}else S.setState('trainerName','review');

    const buddy=await cleanBuddy(grouped.buddy.map(r=>r.text).join('\n'),trainer);
    if(buddy){$('buddy').value=buddy;S.setState('buddy',bestConfidence(grouped.buddy)>=45?'ok':'review')}else S.setState('buddy','review');

    const level=num(grouped.level.map(r=>r.text).join(' '));
    if(level&&+level<=100){$('level').value=String(+level);S.setState('level',bestConfidence(grouped.level)>=45?'ok':'review')}else S.setState('level','review');
    for(const id of ['caught','stops','xp']){const d=num(grouped[id].map(r=>r.text).join(' '));const min=id==='xp'?4:2;if(d.length>=min){$(id).value=fmt(d);S.setState(id,bestConfidence(grouped[id])>=45?'ok':'review')}else S.setState(id,'review')}
    const date=cleanDate(grouped.startDate.map(r=>r.text).join(' '));if(date){$('startDate').value=date;S.setState('startDate',bestConfidence(grouped.startDate)>=45?'ok':'review')}else S.setState('startDate','review');
  }

  async function tesseractFallback(){
    $('scanDetail').textContent='Local OCR fallback…';
    const C=fieldCrops();
    const specs={trainerName:['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'],buddy:['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-'],level:['0123456789'],caught:['0123456789,'],stops:['0123456789,'],xp:['0123456789,'],startDate:['0123456789/-']};
    const reads={};for(const id of Object.keys(C)){reads[id]=[];for(const c of C[id])reads[id].push(await S.read(c,'7',specs[id][0]));}
    const trainer=cleanTrainer(reads.trainerName.map(r=>r.text).join('\n'));if(!$('trainerName').value&&trainer){$('trainerName').value=trainer;S.setState('trainerName','review')}
    const buddy=await cleanBuddy(reads.buddy.map(r=>r.text).join('\n'),$('trainerName').value);if(!$('buddy').value&&buddy){$('buddy').value=buddy;S.setState('buddy','review')}
    for(const id of ['level','caught','stops','xp'])if(!$(id).value){const d=num(reads[id].map(r=>r.text).join(' '));if(d){$(id).value=id==='level'?String(+d):fmt(d);S.setState(id,'review')}}
    if(!$('startDate').value){const d=cleanDate(reads.startDate.map(r=>r.text).join(' '));if(d){$('startDate').value=d;S.setState('startDate','review')}}
  }

  S.scanProfile=async()=>{
    if(!S.sourceImage||S.scanning)return;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanPct').textContent='0%';
    try{S.setTeam(S.detectTeam(S.sourceImage),true);try{await paddleScan();$('scanTitle').textContent='Local AI scan complete';}catch(e){console.warn('PaddleOCR failed',e);$('scanTitle').textContent='Using OCR fallback';await tesseractFallback();}S.updateQuality();S.toast('Profile scan finished. Review anything marked Review.');}
    catch(e){console.error(e);S.toast('Profile scan needs manual review.');}
    finally{S.scanning=false;$('scanCard').classList.add('hidden');S.drawFront();S.drawBack();}
  };

  S.autoPickSubjects=async()=>{
    if(!S.sourceImage)return;try{$('extractStatus').textContent='AI selecting subjects…';const w=S.sourceImage.naturalWidth,h=S.sourceImage.naturalHeight;
      S.buddyCutout=await S.segmentAtPoint(S.sourceImage,w*.38,h*.26,'buddy');$('buddyCutoutState').textContent='Ready';S.drawPreviews();S.drawFront();
      S.trainerCutout=await S.segmentAtPoint(S.sourceImage,w*.67,h*.31,'trainer');$('trainerCutoutState').textContent='Ready';$('extractStatus').textContent='Ready';S.drawPreviews();S.drawFront();
    }catch(e){console.warn(e);$('extractStatus').textContent='Tap subjects manually';$('pickerHelp').textContent='Automatic subject picking was not confident. Tap Trainer or Buddy, then tap that subject in the screenshot.';S.drawPreviews();S.drawFront();}
  };

  S.pickSubjectAt=async(kind,x,y)=>{
    if(!S.sourceImage)return;const state=$(kind+'CutoutState');state.textContent='AI…';$('extractStatus').textContent='Finding '+kind+'…';
    try{const out=await S.segmentAtPoint(S.sourceImage,x,y,kind);if(kind==='trainer')S.trainerCutout=out;else S.buddyCutout=out;state.textContent='Ready';$('extractStatus').textContent='Ready';S.drawPreviews();S.drawFront();}
    catch(e){console.error(e);state.textContent='Retry';$('extractStatus').textContent='Needs review';S.toast('Could not isolate that subject. Tap a clearer part of it and retry.');}
  };

  const canvasFrom=img=>{const max=1800,s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c};
  const qrCrop=(c,b)=>{if(!b)return null;const p=Math.max(b.width,b.height)*.12,x=Math.max(0,b.x-p),y=Math.max(0,b.y-p),w=Math.min(c.width-x,b.width+2*p),h=Math.min(c.height-y,b.height+2*p),side=Math.min(c.width,c.height,Math.max(w,h)),cx=x+w/2,cy=y+h/2,sx=Math.max(0,Math.min(c.width-side,cx-side/2)),sy=Math.max(0,Math.min(c.height-side,cy-side/2)),o=document.createElement('canvas');o.width=o.height=640;o.getContext('2d').drawImage(c,sx,sy,side,side,0,0,640,640);return o};
  const extractCode=t=>{let m=t.match(/\b\d{4}[\s-]+\d{4}[\s-]+\d{4}\b/);if(m)return m[0].replace(/\D/g,'');m=t.match(/(?:^|\D)(\d{12})(?:\D|$)/);return m?m[1]:''};
  async function detectQr(c){if('BarcodeDetector'in window)try{const d=new BarcodeDetector({formats:['qr_code']}),r=await d.detect(c);if(r.length)return{raw:r[0].rawValue||'',crop:qrCrop(c,r[0].boundingBox)}}catch{}if(window.jsQR)try{const g=c.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,c.width,c.height),r=window.jsQR(im.data,c.width,c.height,{inversionAttempts:'attemptBoth'});if(r){const p=[r.location.topLeftCorner,r.location.topRightCorner,r.location.bottomLeftCorner,r.location.bottomRightCorner],x=Math.min(...p.map(q=>q.x)),X=Math.max(...p.map(q=>q.x)),y=Math.min(...p.map(q=>q.y)),Y=Math.max(...p.map(q=>q.y));return{raw:r.data||'',crop:qrCrop(c,{x,y,width:X-x,height:Y-y})}}}catch{}return{raw:'',crop:null}}
  S.scanCode=async()=>{if(!S.codeImage||S.codeScanning)return;S.codeScanning=true;$('codeScanStatus').textContent='Scanning…';try{const c=canvasFrom(S.codeImage),q=await detectQr(c);S.qrRaw=q.raw;S.qrCrop=q.crop;let code=extractCode(S.qrRaw);if(!code){const rr=await S.paddleReadMany([c]).catch(()=>[]);code=extractCode(rr[0]?.text||'')}if(!code){const r=await S.read(c,'6','0123456789 -');code=extractCode(r.text)}if(code){$('trainerCode').value=code;$('trainerCodeState').textContent='Detected';$('trainerCodeState').className='ok'}else{$('trainerCodeState').textContent='Review';$('trainerCodeState').className='review'}$('qrStatus').textContent=S.qrCrop?'QR detected':'QR needs review';$('qrStatus').className=S.qrCrop?'chip accent':'chip';$('codeScanStatus').textContent=code&&S.qrCrop?'Ready':'Review';S.drawBack();}catch(e){console.error(e);$('codeScanStatus').textContent='Review'}finally{S.codeScanning=false}};
})();
