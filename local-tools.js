(() => {
  const S=window.TC,$=S.$;
  const TERRAIN_Y={valor:665,mystic:665,instinct:664};
  const R={
    trainerName:{rect:[.045,.126,.40,.038],kind:'text',digits:true},
    buddy:{rect:[.045,.151,.40,.036],kind:'text',digits:false},
    level:{rect:[.055,.526,.16,.050],kind:'number',max:100},
    caught:{rect:[.585,.792,.30,.035],kind:'number'},
    stops:{rect:[.585,.831,.30,.035],kind:'number'},
    xp:{rect:[.585,.870,.36,.035],kind:'number'},
    startDate:{rect:[.585,.909,.30,.035],kind:'date'}
  };
  S.scene ||= {bgY:0,bgZoom:1,buddyMode:'ground',buddyFloat:90,autoGround:true};

  const norm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const formatNum=d=>String(Number(d)).replace(/\B(?=(\d{3})+(?!\d))/g,',');

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
      const r=d[i],gg=d[i+1],b=d[i+2],gr=gg/(r+1),br=b/(r+1);let ink=false;
      if(mode==='redtext')ink=r>55&&r<235&&gr>.20&&gr<.72&&br>.20&&br<.84&&(r-gg)>12;
      else if(mode==='reddiff')ink=r>65&&(r-Math.max(gg,b))>15;
      else if(mode==='green')ink=gg>80&&gg>r*1.04&&gg>b*.88;
      else if(mode==='red')ink=r>90&&r>gg*1.10&&r>b*1.04;
      else {const lum=.299*r+.587*gg+.114*b;ink=lum<150;}
      const v=ink?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
    g.putImageData(im,0,0);return c;
  }

  function textTokens(text,allowDigits){
    const re=allowDigits?/[A-Za-z][A-Za-z0-9_-]{2,27}/g:/[A-Za-z][A-Za-z-]{2,27}/g;
    return (text||'').match(re)||[];
  }

  function consensus(items){
    const groups=new Map();
    for(const item of items){
      const key=norm(item.value);if(!key)continue;
      const g=groups.get(key)||{value:item.value,count:0,total:0,max:0};
      g.count++;g.total+=Number(item.confidence||0);g.max=Math.max(g.max,Number(item.confidence||0));
      if(String(item.value).length>String(g.value).length)g.value=item.value;groups.set(key,g);
    }
    let best=null;
    for(const g of groups.values()){
      g.avg=g.total/g.count;g.score=g.count*75+g.avg+Math.min(String(g.value).length,18);
      if(!best||g.score>best.score)best=g;
    }
    return best||{value:'',count:0,avg:0,max:0,score:0};
  }

  async function readText(spec){
    const src=crop(spec.rect),candidates=[];
    for(const mode of ['redtext','reddiff','original','dark']){
      const img=variant(src,mode);
      for(const psm of ['7','8','13']){
        const whitelist=spec.digits?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-':'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-';
        const r=await S.read(img,psm,whitelist);
        for(const t of textTokens(r.text,spec.digits))candidates.push({value:t,confidence:r.confidence});
      }
    }
    return consensus(candidates);
  }

  function digitsFrom(text){
    const chunks=(text||'').match(/\d[\d,.\s]*/g)||[];
    return chunks.map(x=>x.replace(/\D/g,'')).filter(Boolean).sort((a,b)=>b.length-a.length)[0]||'';
  }

  async function readNumber(spec,id){
    const src=crop(spec.rect,10),modes=id==='level'?['red','original','dark']:['green','original','dark'],candidates=[];
    for(const mode of modes){
      const img=variant(src,mode);
      for(const psm of ['7','8']){
        const r=await S.read(img,psm,'0123456789,. '),digits=digitsFrom(r.text);
        if(!digits)continue;
        const n=Number(digits);if(!Number.isFinite(n)||(spec.max&&n>spec.max))continue;
        candidates.push({value:digits,confidence:r.confidence});
      }
    }
    return consensus(candidates);
  }

  async function readDate(spec){
    const src=crop(spec.rect,10),candidates=[];
    for(const mode of ['green','original','dark']){
      const img=variant(src,mode);
      for(const psm of ['7','8']){
        const r=await S.read(img,psm,'0123456789/- ');
        const m=(r.text||'').match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
        if(m)candidates.push({value:m[0],confidence:r.confidence});
      }
    }
    return consensus(candidates);
  }

  function applyField(id,pick,format=false){
    if(!pick?.value){$(id).value='';S.setState(id,'review');return;}
    $(id).value=format?formatNum(pick.value):String(pick.value);
    S.setState(id,pick.count>=2?'ok':'review');
  }

  S.scanProfile=async()=>{
    if(!S.sourceImage||S.scanning)return false;
    const token=++S.jobToken;S.scanning=true;$('scanCard').classList.remove('hidden');$('scanTitle').textContent='Reading profile with OCR…';$('scanPct').textContent='OCR';
    ['trainerName','level','buddy','caught','stops','xp','startDate'].forEach(id=>{$(id).value='';S.setState(id,'manual');});
    try{
      S.setTeam(S.detectTeam(S.sourceImage),true);
      const order=[
        ['trainerName','Trainer name',()=>readText(R.trainerName),false],
        ['buddy','Buddy name',()=>readText(R.buddy),false],
        ['level','Level',()=>readNumber(R.level,'level'),false],
        ['caught','Pokémon caught',()=>readNumber(R.caught,'caught'),true],
        ['stops','PokéStops visited',()=>readNumber(R.stops,'stops'),true],
        ['xp','Total XP',()=>readNumber(R.xp,'xp'),true],
        ['startDate','Start date',()=>readDate(R.startDate),false]
      ];
      for(const [id,label,reader,format] of order){
        if(token!==S.jobToken)return false;$('scanDetail').textContent=label;
        const pick=await reader();if(token!==S.jobToken)return false;applyField(id,pick,format);
      }
      S.updateQuality();S.toast('OCR finished. Review any field marked Review.');return true;
    }catch(e){
      if(token===S.jobToken){console.error('OCR scan',e);S.toast('OCR could not read every field. Fill in anything marked Review.');}
      return false;
    }finally{
      if(token===S.jobToken){S.scanning=false;$('scanCard').classList.add('hidden');S.drawFront();S.drawBack();}
    }
  };

  function autoGround(){
    const terrain=TERRAIN_Y[S.team]??665;Object.assign(S.scene,{bgY:0,bgZoom:1,groundY:terrain,autoGround:true});
    const bgY=$('sceneBgY'),bgZ=$('sceneBgZoom'),ground=$('sceneGround');if(bgY)bgY.value='0';if(bgZ)bgZ.value='1';if(ground)ground.value=String(terrain);
    if($('sceneBgYOut'))$('sceneBgYOut').textContent='0';if($('sceneBgZoomOut'))$('sceneBgZoomOut').textContent='1.00×';if($('sceneGroundOut'))$('sceneGroundOut').textContent=String(terrain);S.drawFront?.();
  }
  S.autoGroundScene=autoGround;

  function addSceneControls(){
    const anchor=$('extractHelp')?.parentElement;if(!anchor||$('sceneGround'))return;
    const wrap=document.createElement('div');wrap.className='controls single';wrap.style.marginTop='14px';const terrain=TERRAIN_Y[S.team]??665;
    wrap.innerHTML=`<label>Background vertical position <output id="sceneBgYOut">0</output><input id="sceneBgY" type="range" min="-70" max="70" value="0" step="1"></label><label>Background zoom <output id="sceneBgZoomOut">1.00×</output><input id="sceneBgZoom" type="range" min="1" max="1.16" value="1" step="0.01"></label><label>Ground/contact line <output id="sceneGroundOut">${terrain}</output><input id="sceneGround" type="range" min="630" max="680" value="${terrain}" step="1"></label><label>Buddy placement <select id="buddyPlacement"><option value="ground">Grounded</option><option value="float">Flying / floating</option></select></label><label id="buddyFloatLabel">Buddy floating height <output id="buddyFloatOut">90</output><input id="buddyFloat" type="range" min="20" max="200" value="90" step="1"></label><div class="row compact"><button id="autoSceneBtn" class="secondary" type="button">Auto-align to terrain</button></div>`;
    anchor.parentElement.insertBefore(wrap,anchor.nextSibling);
    const sync=()=>{
      S.scene.bgY=+$('sceneBgY').value;S.scene.bgZoom=+$('sceneBgZoom').value;S.scene.groundY=+$('sceneGround').value;S.scene.buddyMode=$('buddyPlacement').value;S.scene.buddyFloat=+$('buddyFloat').value;S.scene.autoGround=false;
      $('sceneBgYOut').textContent=String(S.scene.bgY);$('sceneBgZoomOut').textContent=S.scene.bgZoom.toFixed(2)+'×';$('sceneGroundOut').textContent=String(S.scene.groundY);$('buddyFloatOut').textContent=String(S.scene.buddyFloat);
      $('buddyFloatLabel').style.opacity=S.scene.buddyMode==='float'?'1':'.45';$('buddyFloat').disabled=S.scene.buddyMode!=='float';S.drawFront?.();
    };
    ['sceneBgY','sceneBgZoom','sceneGround','buddyPlacement','buddyFloat'].forEach(id=>$(id).addEventListener('input',sync));
    $('autoSceneBtn').addEventListener('click',autoGround);$('resetBtn')?.addEventListener('click',()=>setTimeout(autoGround,0));autoGround();
  }

  const oldExtract=S.extractSubjects?.bind(S);
  if(oldExtract&&!S._localExtractWrapped){S.extractSubjects=async(...args)=>{const r=await oldExtract(...args);if(r)autoGround();return r;};S._localExtractWrapped=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addSceneControls);else addSceneControls();
})();
