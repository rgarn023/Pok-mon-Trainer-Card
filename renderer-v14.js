(() => {
  const S = window.TC, $ = S.$;
  const W = 600, H = 800, SCALE = 2;

  const palette = {
    valor: {dark:'#16050b', mid:'#6b0d1f', accent:'#ff315d', glow:'#ff8aa7', pale:'#ffe7ef'},
    mystic:{dark:'#031426', mid:'#07518a', accent:'#24a8ff', glow:'#86e7ff', pale:'#e7f9ff'},
    instinct:{dark:'#211800', mid:'#876500', accent:'#ffd21f', glow:'#fff08a', pale:'#fff9dc'}
  };

  function rr(g,x,y,w,h,r){ g.beginPath(); g.roundRect(x,y,w,h,r); }
  function fitText(g,text,x,y,maxWidth,size,weight=900,align='center'){
    if(!text) return;
    let s=size;
    g.textAlign=align; g.textBaseline='middle';
    while(s>10){ g.font=`${weight} ${s}px system-ui,-apple-system,Segoe UI,sans-serif`; if(g.measureText(text).width<=maxWidth) break; s-=1; }
    g.fillText(text,x,y,maxWidth);
  }
  function contain(g,img,x,y,w,h,z=1,px=0,py=0){
    const iw=img?.naturalWidth||img?.width||0, ih=img?.naturalHeight||img?.height||0; if(!iw||!ih) return;
    const s=Math.min(w/iw,h/ih)*z,nw=iw*s,nh=ih*s;
    g.drawImage(img,x+(w-nw)/2+px*w*.18,y+(h-nh)/2+py*h*.18,nw,nh);
  }

  function teamLogo(g, team, x, y, size, alpha=.22){
    const img=S.templates?.[team];
    g.save(); g.globalAlpha=alpha;
    if(img?.complete && (img.naturalWidth||img.width)){
      g.drawImage(img,78,214,302,330,x,y,size,size*1.08);
    } else {
      const p=palette[team]||palette.valor;
      g.strokeStyle=p.glow; g.lineWidth=8; g.beginPath(); g.arc(x+size/2,y+size/2,size*.38,0,Math.PI*2); g.stroke();
    }
    g.restore();
  }

  function background(g, team){
    const p=palette[team]||palette.valor;
    const grad=g.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,p.dark); grad.addColorStop(.52,p.mid); grad.addColorStop(1,p.dark);
    g.fillStyle=grad; g.fillRect(0,0,W,H);

    const halo=g.createRadialGradient(300,300,20,300,310,390);
    halo.addColorStop(0,p.glow+'66'); halo.addColorStop(.55,p.accent+'28'); halo.addColorStop(1,'transparent');
    g.fillStyle=halo; g.fillRect(0,0,W,H);

    g.save(); g.globalAlpha=.23; g.strokeStyle=p.glow; g.lineWidth=2;
    [[-70,510,300,210],[670,500,300,220],[-20,620,330,330],[620,610,300,320]].forEach(([x1,y1,x2,y2])=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();});
    g.globalAlpha=.10; g.fillStyle=p.glow;
    g.beginPath();g.moveTo(0,370);g.lineTo(260,130);g.lineTo(145,520);g.closePath();g.fill();
    g.beginPath();g.moveTo(W,350);g.lineTo(360,135);g.lineTo(470,540);g.closePath();g.fill();
    g.restore();

    g.save();
    g.shadowColor=p.accent; g.shadowBlur=18; g.strokeStyle=p.glow; g.lineWidth=5; rr(g,9,9,W-18,H-18,24); g.stroke();
    g.shadowBlur=0; g.globalAlpha=.75; g.strokeStyle=p.pale; g.lineWidth=1.5; rr(g,18,18,W-36,H-36,18); g.stroke();
    g.globalAlpha=.4; g.strokeStyle=p.accent; rr(g,25,25,W-50,H-50,14); g.stroke();
    g.restore();

    teamLogo(g,team,405,74,155,.20);
  }

  function drawSubjects(g){
    g.save(); rr(g,24,125,552,505,20); g.clip();
    if(S.buddyCutout) contain(g,S.buddyCutout,20,128,390,505,S.buddyPose.zoom,S.buddyPose.x,S.buddyPose.y);
    if(S.trainerCutout) contain(g,S.trainerCutout,270,198,300,425,S.trainerPose.zoom,S.trainerPose.x,S.trainerPose.y);
    g.restore();
  }

  function stat(g,label,value,cx,team){
    const p=palette[team]||palette.valor;
    g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle=p.glow; g.font='800 9px system-ui'; g.fillText(label,cx,683);
    g.fillStyle='#fff'; fitText(g,value||'—',cx,711,158,22,900);
  }

  S.drawFront = () => {
    const c=$('cardCanvas'); if(!c) return; if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}
    const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(SCALE,SCALE);
    const team=S.team||'valor', p=palette[team]||palette.valor; background(g,team);

    g.fillStyle=p.pale; g.textAlign='left'; g.font='800 9px system-ui'; g.fillText('TRAINER',35,54); g.fillText('CARD',35,69);
    g.strokeStyle=p.glow; g.lineWidth=1.5; g.beginPath(); g.moveTo(35,83); g.lineTo(74,83); g.stroke();

    g.fillStyle='#fff'; g.shadowColor='rgba(0,0,0,.65)'; g.shadowBlur=8;
    fitText(g,$('trainerName').value.trim()||'TRAINER',300,71,430,42,950);
    g.shadowBlur=0;
    g.fillStyle=p.pale; g.font='800 15px system-ui'; g.textAlign='center';
    g.fillText('Lv.',235,113); g.fillStyle='#fff'; fitText(g,$('level').value.trim()||'—',282,113,76,31,950);
    g.fillStyle=p.pale; g.fillText('Buddy:',365,105); g.fillStyle='#fff'; fitText(g,$('buddy').value.trim()||'—',405,126,190,20,900);

    drawSubjects(g);

    g.fillStyle='rgba(5,7,12,.73)'; g.strokeStyle=p.glow+'aa'; g.lineWidth=1.6; rr(g,28,650,544,112,18); g.fill(); g.stroke();
    g.globalAlpha=.45; g.strokeStyle=p.glow; [210,390].forEach(x=>{g.beginPath();g.moveTo(x,670);g.lineTo(x,738);g.stroke();}); g.globalAlpha=1;
    stat(g,'POKÉMON CAUGHT',$('caught').value.trim(),120,team);
    stat(g,'POKÉSTOPS VISITED',$('stops').value.trim(),300,team);
    stat(g,'TOTAL XP',$('xp').value.trim(),480,team);

    g.textBaseline='middle'; g.font='700 8px system-ui'; g.fillStyle=p.pale;
    g.textAlign='left'; g.fillText(`STARTED  ${$('startDate').value.trim()||'—'}`,42,778);
    g.textAlign='right'; g.fillText(`PRINTED  ${$('printDate').value.trim()||'—'}`,558,778);
    g.restore();
  };

  S.drawBack = () => {
    const c=$('backCanvas'); if(!c) return; if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}
    const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(SCALE,SCALE);
    const team=S.team||'valor', p=palette[team]||palette.valor, cfg=S.TEAM[team]; background(g,team);
    teamLogo(g,team,150,160,300,.18);

    g.textAlign='center'; g.fillStyle=p.pale; g.font='850 10px system-ui'; g.fillText('TRAINER CARD',300,65);
    g.fillStyle='#fff'; fitText(g,$('trainerName').value.trim()||'TRAINER',300,103,460,32,950);
    g.fillStyle=p.glow; g.font='900 16px system-ui'; g.fillText(cfg.name.toUpperCase(),300,135);

    g.fillStyle='rgba(4,7,12,.76)'; g.strokeStyle=p.glow+'bb'; rr(g,92,184,416,416,24); g.fill(); g.stroke();
    g.fillStyle='#fff'; rr(g,155,220,290,290,18); g.fill();
    if(S.qrCrop) contain(g,S.qrCrop,169,234,262,262); else {g.fillStyle='#111822';g.font='800 14px system-ui';g.fillText('UPLOAD TRAINER CODE',300,350);}
    g.fillStyle='#fff'; fitText(g,S.formatCode($('trainerCode').value)||'••••  ••••  ••••',300,554,360,25,950);
    g.fillStyle=p.pale; g.font='800 9px system-ui'; g.fillText('TRAINER CODE',300,580);

    g.fillStyle='rgba(4,7,12,.68)'; g.strokeStyle='rgba(255,255,255,.14)'; rr(g,92,626,416,104,18); g.fill(); g.stroke();
    g.textAlign='left'; g.fillStyle=p.pale; g.font='750 8px system-ui'; g.fillText('LEVEL',118,655); g.fillText('BUDDY',255,655); g.fillText('TEAM',420,655);
    g.fillStyle='#fff'; g.font='900 18px system-ui'; g.fillText($('level').value.trim()||'—',118,686); fitText(g,$('buddy').value.trim()||'—',255,686,140,18,900,'left');
    g.fillStyle=p.glow; g.fillText(cfg.name,420,686);
    g.restore();
  };
})();
