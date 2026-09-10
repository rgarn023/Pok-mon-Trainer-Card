(() => {
  const $ = id => document.getElementById(id);
  const TEAM = {
    valor:{name:'Valor',accent:'#ff4d55',accent2:'#ff9a75',asset:'assets/valor.svg'},
    mystic:{name:'Mystic',accent:'#30a5ff',accent2:'#83e8ff',asset:'assets/mystic.svg'},
    instinct:{name:'Instinct',accent:'#ffd534',accent2:'#fff18c',asset:'assets/instinct.svg'}
  };

  const S = window.TC = {
    $, TEAM,
    team:'valor',
    sourceImage:null, sourceURL:'',
    codeImage:null, codeURL:'',
    trainerCrop:null, buddyCrop:null,
    trainerCutout:null, buddyCutout:null,
    qrCrop:null, qrRaw:'',
    ocr:null, pokemonNames:null,
    showingBack:false,
    scanning:false, codeScanning:false,
    subjectRect:{x:44,y:132,w:370,h:592},
    trainerPose:{zoom:1,x:0,y:0},
    buddyPose:{zoom:1,x:0,y:0}
  };

  const templates = S.templates = {};
  Object.entries(TEAM).forEach(([k,v])=>{ const i=new Image(); i.src=v.asset; i.onload=()=>{S.drawFront();S.drawBack()}; templates[k]=i; });

  S.today = () => new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'});
  S.toast = msg => { const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2600); };
  S.setState = (id,state) => { const e=$(id+'State'); if(!e) return; e.textContent = state==='ok' ? 'Detected' : state==='review' ? 'Review' : state==='bad' ? 'Missing' : 'Manual'; e.className = state==='ok' ? 'ok' : state==='review' ? 'review' : state==='bad' ? 'bad' : ''; };
  S.updateQuality = () => { const ids=['trainerName','level','buddy','caught','stops','xp','startDate']; let n=0; ids.forEach(id=>{ if($(id+'State')?.classList.contains('ok')) n++;}); const q=Math.round(n/ids.length*100); $('qualityBar').style.width=q+'%'; $('qualityText').textContent=q+'%'; };
  S.setTeam = (t,detected=false) => { if(!TEAM[t]) return; S.team=t; document.body.dataset.team=t; document.querySelectorAll('.team').forEach(b=>b.classList.toggle('active', b.dataset.team===t)); $('teamStatus').textContent=(detected?'Detected: ':'Selected: ')+TEAM[t].name; $('previewTeam').textContent=TEAM[t].name; S.drawFront(); S.drawBack(); };
  S.detectTeam = img => {
    const c=document.createElement('canvas'); c.width=240; c.height=360; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0,c.width,c.height); const d=x.getImageData(0,0,c.width,c.height).data;
    let R=0,B=0,Y=0; for(let i=0;i<d.length;i+=20){ const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b); if(mx-mn<25) continue; R+=Math.max(0,r-(g+b)/2); B+=Math.max(0,b-(r+g)/2); Y+=Math.max(0,Math.min(r,g)-b*.72) }
    return Object.entries({valor:R,mystic:B,instinct:Y}).sort((a,b)=>b[1]-a[1])[0][0];
  };

  S.crop = (img,x,y,w,h,scale=3,mode='normal') => {
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(iw*w*scale)); c.height=Math.max(1,Math.round(ih*h*scale));
    const g=c.getContext('2d',{willReadFrequently:true}); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(img,iw*x,ih*y,iw*w,ih*h,0,0,c.width,c.height);
    if(mode!=='normal'){
      const im=g.getImageData(0,0,c.width,c.height), d=im.data;
      for(let i=0;i<d.length;i+=4){ const r=d[i], gg=d[i+1], b=d[i+2]; let hit=false;
        if(mode==='maroon') hit=r>85&&r>gg*1.28&&r>b*1.15&&gg<150;
        if(mode==='red') hit=r>120&&r>gg*1.25&&r>b*1.18;
        if(mode==='green') hit=gg>95&&gg>r*1.18&&gg>b*.92;
        if(mode==='dark') hit=(r+gg+b)<400;
        const v=hit?0:255; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
      }
      g.putImageData(im,0,0);
    }
    return c;
  };

  S.worker = async()=>{ if(!S.ocr) S.ocr = await Tesseract.createWorker('eng',1,{logger:m=>{ if(m.status==='recognizing text' && $('scanPct')) $('scanPct').textContent=Math.round((m.progress||0)*100)+'%'; }}); return S.ocr; };
  S.read = async(c,psm='7',whitelist='')=>{ const w=await S.worker(); await w.setParameters({tessedit_pageseg_mode:psm,...(whitelist?{tessedit_char_whitelist:whitelist}:{})}); const r=await w.recognize(c); return {text:r.data.text||'',confidence:r.data.confidence||0}; };

  const dims = i => ({w:i?.naturalWidth||i?.width||0,h:i?.naturalHeight||i?.height||0});
  S.contain = (ctx,img,x,y,w,h,z=1,px=0,py=0) => { const d=dims(img); if(!d.w||!d.h) return; const s=Math.min(w/d.w,h/d.h)*z, nw=d.w*s, nh=d.h*s; ctx.drawImage(img,x+(w-nw)/2+px*w*.18,y+(h-nh)/2+py*h*.18,nw,nh); };
  const center = (g,text,x,y,max,size=13)=>{ if(!text) return; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#fff'; g.shadowColor='rgba(0,0,0,.85)'; g.shadowBlur=4; let s=size; do{ g.font=`700 ${s}px system-ui`; if(g.measureText(text).width<=max) break; s-=.5 }while(s>8); g.fillText(text,x,y,max); g.shadowBlur=0; };
  const rr=(g,x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r)};

  function drawSinglePreview(canvasId, emptyId, cutout, crop, pose, label){
    const c=$(canvasId), g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
    const grad=g.createLinearGradient(0,0,0,c.height); grad.addColorStop(0,'#111923'); grad.addColorStop(1,'#080b10'); g.fillStyle=grad; g.fillRect(0,0,c.width,c.height);
    const img = cutout || crop;
    if(!img){ $(emptyId).classList.remove('hidden'); return; }
    $(emptyId).classList.add('hidden');
    S.contain(g,img,16,16,c.width-32,c.height-32,pose.zoom,pose.x,pose.y);
    if(!cutout){
      g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(10,c.height-44,c.width-20,34);
      g.fillStyle='#fff'; g.font='800 12px system-ui'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(label+' crop only — run cutout',c.width/2,c.height-27);
    }
  }

  S.drawPreviews = ()=>{
    drawSinglePreview('trainerCanvas','trainerEmpty',S.trainerCutout,S.trainerCrop,S.trainerPose,'Trainer');
    drawSinglePreview('buddyCanvas','buddyEmpty',S.buddyCutout,S.buddyCrop,S.buddyPose,'Buddy');
  };

  function drawFrontSubjects(g){
    const box=S.subjectRect;
    if(S.buddyCutout){ g.save(); g.beginPath(); g.roundRect(box.x,box.y,box.w,box.h,18); g.clip(); S.contain(g,S.buddyCutout,box.x+6,box.y+6,box.w-12,box.h-12,S.buddyPose.zoom,S.buddyPose.x,S.buddyPose.y); g.restore(); }
    if(S.trainerCutout){ g.save(); g.beginPath(); g.roundRect(box.x,box.y,box.w,box.h,18); g.clip(); S.contain(g,S.trainerCutout,box.x+12,box.y+12,box.w-24,box.h-24,S.trainerPose.zoom,S.trainerPose.x,S.trainerPose.y); g.restore(); }
    if(!S.trainerCutout || !S.buddyCutout){
      g.save(); g.fillStyle='rgba(8,10,15,.7)'; g.fillRect(box.x+18,box.y+box.h-70,box.w-36,48); g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#fff'; g.font='800 10px system-ui';
      const msg = !S.trainerCutout && !S.buddyCutout ? 'Trainer and buddy cutouts required' : !S.trainerCutout ? 'Trainer cutout required' : 'Buddy cutout required';
      g.fillText(msg, box.x+box.w/2, box.y+box.h-46);
      g.restore();
    }
  }

  S.drawFront = ()=>{
    const c=$('cardCanvas'), g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(2,2); g.fillStyle='#0a0d14'; g.fillRect(0,0,458,1145);
    const t=templates[S.team]; if(t?.complete) g.drawImage(t,0,0,458,1145);
    drawFrontSubjects(g);
    const v={trainerName:[229,776,340,14],level:[93,837,94,13],buddy:[294,837,220,13],caught:[96,911,103,12],stops:[229,911,103,12],xp:[362,911,103,12],startDate:[129,984,150,12],printDate:[329,984,150,12]};
    Object.entries(v).forEach(([id,a])=>center(g,$(id).value.trim(),...a));
    g.restore();
  };

  S.formatCode = v => { const d=(v||'').replace(/\D/g,'').slice(0,12); return d.replace(/(\d{4})(?=\d)/g,'$1  ').trim(); };
  S.drawBack = ()=>{
    const c=$('backCanvas'),g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(2,2); const cfg=TEAM[S.team];
    const gr=g.createLinearGradient(0,0,0,1145); gr.addColorStop(0,'#080b12'); gr.addColorStop(.48,S.team==='valor'?'#2a0710':S.team==='mystic'?'#031b35':'#2e2600'); gr.addColorStop(1,'#080a0f'); g.fillStyle=gr; g.fillRect(0,0,458,1145);
    g.strokeStyle=cfg.accent; g.lineWidth=4; rr(g,8,8,442,1129,22); g.stroke(); g.globalAlpha=.4; g.lineWidth=1.5; rr(g,17,17,424,1111,17); g.stroke(); g.globalAlpha=1;
    const glow=g.createRadialGradient(229,265,20,229,265,250); glow.addColorStop(0,cfg.accent+'44'); glow.addColorStop(1,'transparent'); g.fillStyle=glow; g.fillRect(0,0,458,620);
    g.textAlign='center'; g.fillStyle=cfg.accent2; g.font='800 10px system-ui'; g.fillText('TRAINER CARD',229,58); g.fillStyle='#fff'; g.font='900 28px system-ui'; g.fillText(cfg.name.toUpperCase(),229,96); g.fillStyle=cfg.accent2; g.font='700 11px system-ui'; g.fillText($('trainerName').value.trim()||'TRAINER',229,126);
    g.fillStyle='rgba(255,255,255,.055)'; g.strokeStyle=cfg.accent+'99'; g.lineWidth=1.5; rr(g,54,174,350,422,20); g.fill(); g.stroke(); g.fillStyle=cfg.accent2; g.font='800 9px system-ui'; g.fillText('SCAN TO ADD TRAINER',229,202); g.fillStyle='#fff'; rr(g,94,225,270,270,18); g.fill();
    if(S.qrCrop) S.contain(g,S.qrCrop,108,239,242,242); else { g.fillStyle='#11151d'; g.font='800 13px system-ui'; g.fillText('UPLOAD TRAINER CODE',229,349); g.fillStyle='#657080'; g.font='600 9px system-ui'; g.fillText('QR preview appears here',229,371); }
    g.fillStyle='#fff'; g.font='900 22px ui-monospace,monospace'; g.fillText(S.formatCode($('trainerCode').value)||'••••  ••••  ••••',229,536); g.fillStyle='#8f9aab'; g.font='700 8px system-ui'; g.fillText('TRAINER CODE',229,560);
    g.fillStyle='rgba(255,255,255,.045)'; g.strokeStyle='rgba(255,255,255,.12)'; rr(g,54,628,350,225,18); g.fill(); g.stroke(); g.textAlign='left'; g.fillStyle='#8f9aab'; g.font='700 8px system-ui'; g.fillText('TRAINER',78,670); g.fillText('LEVEL',78,735); g.fillText('BUDDY',230,735); g.fillText('TEAM',78,800);
    g.fillStyle='#fff'; g.font='800 16px system-ui'; g.fillText($('trainerName').value.trim()||'—',78,695); g.font='800 15px system-ui'; g.fillText($('level').value.trim()||'—',78,760); g.fillText($('buddy').value.trim()||'—',230,760); g.fillStyle=cfg.accent2; g.fillText(cfg.name,78,825);
    g.textAlign='center'; g.font='700 8px system-ui'; g.fillText('TAP CARD TO FLIP',229,915); g.fillStyle='#7c8796'; g.fillText('Created with Trainer Card Studio v9',229,1084);
    g.restore();
  };
})();
