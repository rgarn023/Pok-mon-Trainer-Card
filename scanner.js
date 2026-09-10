(() => {
  const S=window.TC,$=S.$;
  const cleanDate=t=>(t.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)||[])[0]||'';
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const textCandidates=t=>{const out=[];for(const line of t.split(/[\n\r]+/)){const compact=line.replace(/[^A-Za-z0-9_-]/g,'');if(compact.length>=3&&compact.length<=24)out.push(compact);out.push(...(line.match(/[A-Za-z][A-Za-z0-9_-]{2,23}/g)||[]))}return [...new Set(out)]};
  const cleanTrainer=t=>{const blocked=/^(me|friends|social|level|buddy|total|activity|today|week|trainer)$/i;const c=textCandidates(t).filter(x=>!blocked.test(x)&&!/^\d+$/.test(x));return c.find(x=>/[A-Za-z]/.test(x)&&/\d/.test(x))||c.find(x=>/[A-Z]/.test(x)&&/[a-z]/.test(x))||c[0]||''};
  const lev=(a,b)=>{a=norm(a);b=norm(b);const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const q=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=q}}return d[b.length]};
  async function pokemonNames(){if(S.pokemonNames)return S.pokemonNames;try{const r=await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=2000'),j=await r.json();S.pokemonNames=j.results.map(x=>x.name)}catch{S.pokemonNames=[]}return S.pokemonNames}
  async function cleanBuddy(t,trainer){const blocked=/^(me|friends|social|buddy|level|mega|cp|today|week)$/i;const words=textCandidates(t).map(x=>x.replace(/^\d+|\d+$/g,'')).filter(x=>x.length>=3&&!blocked.test(x)&&norm(x)!==norm(trainer));const names=await pokemonNames();if(!names.length)return words[0]||'';let best=['',99,''];for(const c of words)for(const p of names){const score=lev(c,p)/Math.max(c.length,p.length);if(score<best[1])best=[p,score,c]}return best[1]<=.48?best[0].replace(/(^|-)(\w)/g,(_,a,b)=>a+b.toUpperCase()):(words[0]||'')}
  const bestRead=arr=>[...arr].sort((a,b)=>b.confidence-a.confidence)[0]||{confidence:0};
  const numericCandidates=reads=>{const out=[];reads.forEach(r=>{const ms=r.text.match(/[\d][\d,\.\s]*/g)||[];ms.forEach(s=>{const d=s.replace(/\D/g,'');if(d)out.push({digits:d,confidence:r.confidence||0,raw:s})})});return out};
  function chooseNumber(reads,{minDigits=1,maxDigits=12,maxValue=Number.MAX_SAFE_INTEGER}={}){return numericCandidates(reads).filter(x=>x.digits.length>=minDigits&&x.digits.length<=maxDigits&&Number(x.digits)<=maxValue).sort((a,b)=>b.digits.length-a.digits.length||b.confidence-a.confidence)[0]||null}
  function formatDigits(d){return d.replace(/\B(?=(\d{3})+(?!\d))/g,',')}

  async function scanIdentity(){
    $('scanDetail').textContent='Trainer name';
    const n1=S.crop(S.sourceImage,.055,.132,.36,.030,6),n2=S.crop(S.sourceImage,.055,.132,.36,.030,6,'maroon');
    const nr=[await S.read(n1,'7','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'),await S.read(n2,'7','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'),await S.read(n2,'13','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-')];
    const name=cleanTrainer(nr.map(x=>x.text).join('\n')),nb=bestRead(nr);if(name){$('trainerName').value=name;S.setState('trainerName',nb.confidence>=52?'ok':'review')}else S.setState('trainerName','review');

    $('scanDetail').textContent='Buddy name';
    const b1=S.crop(S.sourceImage,.060,.157,.34,.026,7),b2=S.crop(S.sourceImage,.060,.157,.34,.026,7,'maroon');
    const br=[await S.read(b1,'7','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-'),await S.read(b2,'7','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-'),await S.read(b2,'13','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-')];
    const buddy=await cleanBuddy(br.map(x=>x.text).join('\n'),name),bb=bestRead(br);if(buddy){$('buddy').value=buddy;S.setState('buddy',bb.confidence>=45?'ok':'review')}else S.setState('buddy','review');
  }

  async function scanStats(){
    const jobs=[
      ['level','Level',[.055,.526,.16,.050],'red','0123456789',{minDigits:1,maxDigits:3,maxValue:100}],
      ['caught','Pokémon caught',[.585,.792,.30,.035],'green','0123456789,',{minDigits:2,maxDigits:9}],
      ['stops','PokéStops visited',[.585,.831,.30,.035],'green','0123456789,',{minDigits:2,maxDigits:9}],
      ['xp','Total XP',[.585,.870,.36,.035],'green','0123456789,',{minDigits:4,maxDigits:12}],
      ['startDate','Start date',[.585,.909,.30,.035],'green','0123456789/-',null]
    ];
    for(const [id,label,r,mode,list,rules] of jobs){
      $('scanDetail').textContent=label;
      const a=S.crop(S.sourceImage,...r,6),b=S.crop(S.sourceImage,...r,6,mode);
      const reads=[await S.read(a,'7',list),await S.read(b,'7',list),await S.read(b,'13',list)];
      if(id==='startDate'){
        const value=cleanDate(reads.map(x=>x.text).join(' '));
        if(value){$(id).value=value;S.setState(id,bestRead(reads).confidence>=50?'ok':'review')}else S.setState(id,'review');
      }else{
        const pick=chooseNumber(reads,rules||{});
        if(pick){$(id).value=id==='level'?pick.digits:formatDigits(pick.digits);S.setState(id,pick.confidence>=50?'ok':'review')}else S.setState(id,'review');
      }
    }
  }

  S.scanProfile=async()=>{if(!S.sourceImage||S.scanning)return;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanPct').textContent='0%';try{S.setTeam(S.detectTeam(S.sourceImage),true);await scanIdentity();await scanStats();S.updateQuality();S.toast('Profile scan complete. Review anything marked Review.')}catch(e){console.error(e);S.toast('Some profile fields need manual review.')}finally{S.scanning=false;$('scanCard').classList.add('hidden');S.drawFront();S.drawBack()}};

  S.makeCharacterCrop=img=>{
    const iw=img.naturalWidth,ih=img.naturalHeight;
    const sx=iw*.285,sy=ih*.078,sw=iw*.710,sh=ih*.475,c=document.createElement('canvas');
    c.width=Math.round(sw);c.height=Math.round(sh);c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
    S.crop=c;S.cutout=null;$('portraitEmpty').classList.add('hidden');$('retryExtractBtn').disabled=false;$('extractStatus').textContent='Preparing cutout';S.drawPortrait();S.drawFront();S.extractCutout();
  };
  const resize=(src,max=900)=>{const s=Math.min(1,max/Math.max(src.width,src.height));if(s===1)return src;const c=document.createElement('canvas');c.width=Math.round(src.width*s);c.height=Math.round(src.height*s);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c};
  function cleanAlpha(img){
    const c=document.createElement('canvas'),w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,w,h);const im=g.getImageData(0,0,w,h),d=im.data,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),areas=[0];let id=0,maxArea=0;
    for(let p=0;p<n;p++){if(labels[p]||d[p*4+3]<40)continue;id++;let head=0,tail=0,area=0;queue[tail++]=p;labels[p]=id;while(head<tail){const q=queue[head++],x=q%w,y=(q/w)|0;area++;const left=q-1,right=q+1,up=q-w,down=q+w;if(x>0&&!labels[left]&&d[left*4+3]>=40){labels[left]=id;queue[tail++]=left}if(x<w-1&&!labels[right]&&d[right*4+3]>=40){labels[right]=id;queue[tail++]=right}if(y>0&&!labels[up]&&d[up*4+3]>=40){labels[up]=id;queue[tail++]=up}if(y<h-1&&!labels[down]&&d[down*4+3]>=40){labels[down]=id;queue[tail++]=down}}areas[id]=area;if(area>maxArea)maxArea=area}
    const keep=new Uint8Array(id+1);for(let i=1;i<=id;i++)if(areas[i]>=Math.max(80,maxArea*.022))keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;for(let p=0;p<n;p++){const lab=labels[p];if(!lab||!keep[lab]){d[p*4+3]=0;continue}const x=p%w,y=(p/w)|0;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
    g.putImageData(im,0,0);if(maxX<0)return c;const pad=Math.round(Math.max(w,h)*.018),x0=Math.max(0,minX-pad),y0=Math.max(0,minY-pad),x1=Math.min(w,maxX+pad),y1=Math.min(h,maxY+pad),o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height);return o
  }
  async function runRemoveBg(blob,device){if(!S.removeBg){const m=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');S.removeBg=m.removeBackground||m.default}if(typeof S.removeBg!=='function')throw new Error('No background remover');return S.removeBg(blob,{device,model:'isnet_quint8',progress:(key,current,total)=>{if(total>0)$('extractStatus').textContent=`Cutout ${Math.round(current/total*100)}%`},output:{format:'image/png',quality:1,type:'foreground'}})}
  S.extractCutout=async()=>{if(!S.crop)return;$('extractStatus').textContent='Extracting…';try{const p=resize(S.crop),blob=await new Promise(r=>p.toBlob(r,'image/png'));let out;const gpu=!!navigator.gpu;try{out=await runRemoveBg(blob,gpu?'gpu':'cpu')}catch(e){if(!gpu)throw e;console.warn('GPU cutout failed, retrying on CPU',e);out=await runRemoveBg(blob,'cpu')}const url=URL.createObjectURL(out),im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=url});S.cutout=cleanAlpha(im);URL.revokeObjectURL(url);$('extractStatus').textContent='Cutout ready';$('extractHelp').textContent='Transparent trainer + buddy layer created and cleaned of small UI fragments.';S.drawPortrait();S.drawFront()}catch(e){console.warn(e);S.cutout=null;$('extractStatus').textContent='Needs adjustment';$('extractHelp').textContent='Automatic cutout failed. The full trainer + buddy crop is preserved for manual framing.';S.drawPortrait();S.drawFront()}};

  const canvasFrom=img=>{const m=1800,s=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c};
  const qrCrop=(c,b)=>{if(!b)return null;const p=Math.max(b.width,b.height)*.12,x=Math.max(0,b.x-p),y=Math.max(0,b.y-p),w=Math.min(c.width-x,b.width+2*p),h=Math.min(c.height-y,b.height+2*p),side=Math.min(c.width,c.height,Math.max(w,h)),cx=x+w/2,cy=y+h/2,sx=Math.max(0,Math.min(c.width-side,cx-side/2)),sy=Math.max(0,Math.min(c.height-side,cy-side/2)),o=document.createElement('canvas');o.width=o.height=640;o.getContext('2d').drawImage(c,sx,sy,side,side,0,0,640,640);return o};
  const extractCode=t=>{let m=t.match(/\b\d{4}[\s-]+\d{4}[\s-]+\d{4}\b/);if(m)return m[0].replace(/\D/g,'');m=t.match(/(?:^|\D)(\d{12})(?:\D|$)/);if(m)return m[1];for(const line of t.split(/[\n\r]+/)){const d=line.replace(/\D/g,'');if(d.length===12)return d}return''};
  async function detectQr(c){if('BarcodeDetector'in window)try{const d=new BarcodeDetector({formats:['qr_code']}),r=await d.detect(c);if(r.length)return{raw:r[0].rawValue||'',crop:qrCrop(c,r[0].boundingBox)}}catch(e){console.warn(e)}if(window.jsQR)try{const g=c.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,c.width,c.height),r=window.jsQR(im.data,c.width,c.height,{inversionAttempts:'attemptBoth'});if(r){const p=[r.location.topLeftCorner,r.location.topRightCorner,r.location.bottomLeftCorner,r.location.bottomRightCorner],x=Math.min(...p.map(q=>q.x)),X=Math.max(...p.map(q=>q.x)),y=Math.min(...p.map(q=>q.y)),Y=Math.max(...p.map(q=>q.y));return{raw:r.data||'',crop:qrCrop(c,{x,y,width:X-x,height:Y-y})}}}catch(e){console.warn(e)}return{raw:'',crop:null}}
  S.scanCode=async()=>{if(!S.codeImage||S.codeScanning)return;S.codeScanning=true;$('codeScanStatus').textContent='Scanning…';$('codeScanStatus').className='chip accent';try{const c=canvasFrom(S.codeImage),q=await detectQr(c);S.qrRaw=q.raw;S.qrCrop=q.crop;let code=extractCode(S.qrRaw);if(!code){const reads=[await S.read(c,'6','0123456789 -'),await S.read(c,'11','0123456789 -')];for(const r of reads){code=extractCode(r.text);if(code)break}}if(code){$('trainerCode').value=code;$('trainerCodeState').textContent='Detected';$('trainerCodeState').className='ok'}else{$('trainerCodeState').textContent='Review';$('trainerCodeState').className='review'}$('qrStatus').textContent=S.qrCrop?'QR detected':'QR needs review';$('qrStatus').className=S.qrCrop?'chip accent':'chip';$('codeScanStatus').textContent=code&&S.qrCrop?'Ready':'Review';S.drawBack();S.toast(code&&S.qrCrop?'Trainer code and QR captured.':'Code screen scanned — review missing items.')}catch(e){console.error(e);$('codeScanStatus').textContent='Review';S.toast('Trainer code screen could not be fully read.')}finally{S.codeScanning=false}};
})();
