(() => {
  const S = window.TC, $ = S.$;
  const W = 600, H = 800, SCALE = 2;

  const palette = {
    valor:   {dark:'#25040b', mid:'#8f102b', accent:'#ff315d', glow:'#ff9db1', pale:'#fff1f5'},
    mystic:  {dark:'#03182e', mid:'#075b9c', accent:'#2ab4ff', glow:'#9cecff', pale:'#effbff'},
    instinct:{dark:'#261d02', mid:'#9a7104', accent:'#ffd21f', glow:'#fff29a', pale:'#fffbe9'}
  };

  const emblems = {};
  ['valor','mystic','instinct'].forEach(team => {
    const i = new Image();
    i.src = `assets/${team}-emblem.svg?v=16`;
    i.onload = () => { S.drawFront(); S.drawBack(); };
    emblems[team] = i;
  });

  function fitText(g,text,x,y,maxWidth,size,weight=900,align='center'){
    if(!text) return;
    let s=size;
    g.textAlign=align; g.textBaseline='middle';
    while(s>9){
      g.font=`${weight} ${s}px system-ui,-apple-system,Segoe UI,sans-serif`;
      if(g.measureText(text).width<=maxWidth) break;
      s-=1;
    }
    g.fillText(text,x,y,maxWidth);
  }

  function contain(g,img,x,y,w,h,z=1,px=0,py=0){
    const iw=img?.naturalWidth||img?.width||0, ih=img?.naturalHeight||img?.height||0;
    if(!iw||!ih) return;
    const s=Math.min(w/iw,h/ih)*z, nw=iw*s, nh=ih*s;
    g.drawImage(img,x+(w-nw)/2+px*w*.18,y+(h-nh)/2+py*h*.18,nw,nh);
  }

  function chamferPath(g,inset=8,cut=20){
    g.beginPath();
    g.moveTo(inset+cut,inset);
    g.lineTo(W-inset-cut,inset);
    g.lineTo(W-inset,inset+cut);
    g.lineTo(W-inset,H-inset-cut);
    g.lineTo(W-inset-cut,H-inset);
    g.lineTo(inset+cut,H-inset);
    g.lineTo(inset,H-inset-cut);
    g.lineTo(inset,inset+cut);
    g.closePath();
  }

  function panelPath(g,x,y,w,h,cut=14){
    g.beginPath();
    g.moveTo(x+cut,y); g.lineTo(x+w-cut,y); g.lineTo(x+w,y+cut);
    g.lineTo(x+w,y+h-cut); g.lineTo(x+w-cut,y+h); g.lineTo(x+cut,y+h);
    g.lineTo(x,y+h-cut); g.lineTo(x,y+cut); g.closePath();
  }

  function tintEmblem(team,size=220){
    const img=emblems[team], p=palette[team]||palette.valor;
    if(!(img?.complete && (img.naturalWidth||img.width))) return null;
    const o=document.createElement('canvas'); o.width=o.height=size;
    const og=o.getContext('2d'); og.drawImage(img,0,0,size,size);
    og.globalCompositeOperation='source-in'; og.fillStyle=p.accent; og.fillRect(0,0,size,size);
    return o;
  }

  function teamLogo(g,team,x,y,size,alpha=.16){
    const p=palette[team]||palette.valor, img=tintEmblem(team);
    g.save(); g.globalAlpha=alpha;
    if(img) g.drawImage(img,x,y,size,size);
    else { g.strokeStyle=p.glow; g.lineWidth=4; g.beginPath(); g.arc(x+size/2,y+size/2,size*.38,0,Math.PI*2); g.stroke(); }
    g.restore();
  }

  function energyBackground(g,team){
    const p=palette[team]||palette.valor;
    const base=g.createLinearGradient(0,0,0,H);
    base.addColorStop(0,p.dark); base.addColorStop(.45,p.mid); base.addColorStop(1,p.dark);
    g.fillStyle=base; g.fillRect(0,0,W,H);

    // Bright central wash, same geometry for every team.
    const center=g.createRadialGradient(330,250,10,330,250,370);
    center.addColorStop(0,p.pale+'e8'); center.addColorStop(.18,p.glow+'9a');
    center.addColorStop(.48,p.accent+'55'); center.addColorStop(1,'transparent');
    g.fillStyle=center; g.fillRect(0,0,W,H);

    const lower=g.createRadialGradient(300,515,10,300,515,360);
    lower.addColorStop(0,p.glow+'40'); lower.addColorStop(1,'transparent');
    g.fillStyle=lower; g.fillRect(0,160,W,470);

    // Angular energy shards. Identical positions across teams.
    g.save(); g.globalAlpha=.28; g.fillStyle=p.pale;
    const shards=[
      [[22,300],[245,125],[130,365]], [[575,250],[365,118],[475,385]],
      [[35,470],[260,312],[155,545]], [[570,470],[365,300],[455,555]],
      [[100,575],[282,398],[230,602]], [[500,575],[350,390],[390,610]]
    ];
    shards.forEach(s=>{g.beginPath();g.moveTo(...s[0]);g.lineTo(...s[1]);g.lineTo(...s[2]);g.closePath();g.fill();});
    g.restore();

    // Sweeping energy arcs and particles.
    g.save(); g.lineCap='round';
    for(let i=0;i<7;i++){
      g.globalAlpha=.13+i*.015; g.strokeStyle=i%2?p.glow:p.accent; g.lineWidth=1.2+(i%3)*.6;
      g.beginPath();
      g.moveTo(-40,240+i*52);
      g.bezierCurveTo(145,95+i*16,425,590-i*18,650,300+i*18);
      g.stroke();
    }
    const particles=[[44,93,2],[88,420,1.5],[153,203,1.8],[210,540,1.5],[250,150,1.2],[322,365,1.5],[382,102,1.8],[430,510,1.4],[490,185,1.6],[548,395,2],[566,78,1.2],[115,590,1.4],[340,585,1.5],[530,560,1.7]];
    particles.forEach(([x,y,r])=>{g.globalAlpha=.7;g.fillStyle=p.pale;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();});
    g.restore();

    // Large watermark emblem in upper-right, behind the subjects.
    teamLogo(g,team,377,42,185,.17);

    // Clean full outer frame: identical top/bottom/left/right treatment.
    g.save();
    g.shadowColor=p.accent; g.shadowBlur=16; g.strokeStyle=p.glow; g.lineWidth=4.2;
    chamferPath(g,9,22); g.stroke();
    g.shadowBlur=0; g.globalAlpha=.94; g.strokeStyle=p.pale; g.lineWidth=1.2;
    chamferPath(g,16,17); g.stroke();
    g.globalAlpha=.55; g.strokeStyle=p.accent; g.lineWidth=1;
    chamferPath(g,22,13); g.stroke();
    g.restore();
  }

  function drawHeader(g,team){
    const p=palette[team]||palette.valor;
    g.fillStyle=p.pale; g.textAlign='left'; g.textBaseline='middle';
    g.font='750 9px system-ui,-apple-system,Segoe UI,sans-serif';
    g.fillText('TRAINER',33,37); g.fillText('CARD',33,50);
    g.strokeStyle=p.glow; g.lineWidth=1.2; g.beginPath(); g.moveTo(33,64); g.lineTo(58,64); g.stroke();

    const name=($('trainerName').value||'TRAINER').trim();
    const nameGrad=g.createLinearGradient(130,30,500,92);
    nameGrad.addColorStop(0,p.pale); nameGrad.addColorStop(.55,'#ffffff'); nameGrad.addColorStop(1,p.accent);
    g.fillStyle=nameGrad; g.shadowColor='rgba(0,0,0,.5)'; g.shadowBlur=7;
    fitText(g,name,330,57,390,47,950);
    g.shadowBlur=0;
    g.strokeStyle=p.accent; g.lineWidth=1.2; g.beginPath(); g.moveTo(145,91); g.lineTo(515,91); g.stroke();

    g.fillStyle=p.pale; g.font='800 15px system-ui'; g.textAlign='right'; g.fillText('Lv.',228,113);
    g.fillStyle='#fff'; fitText(g,($('level').value||'—').trim(),276,111,84,33,950);
    g.strokeStyle=p.glow; g.globalAlpha=.55; g.beginPath(); g.moveTo(317,96); g.lineTo(317,130); g.stroke(); g.globalAlpha=1;
    g.fillStyle=p.pale; g.font='800 12px system-ui'; g.textAlign='left'; g.fillText('Buddy:',335,103);
    g.fillStyle='#fff'; fitText(g,($('buddy').value||'—').trim(),335,122,205,18,900,'left');
  }

  function drawSubjects(g){
    g.save();
    // Keep characters clear of the title and stats but allow them to fill the card like the reference.
    panelPath(g,26,126,548,465,18); g.clip();
    if(S.combinedCutout){
      contain(g,S.combinedCutout,32,126,536,466,S.buddyPose?.zoom||1.05,S.buddyPose?.x||0,S.buddyPose?.y||0);
    }else{
      if(S.buddyCutout) contain(g,S.buddyCutout,40,132,390,450,S.buddyPose?.zoom||1,S.buddyPose?.x||0,S.buddyPose?.y||0);
      if(S.trainerCutout) contain(g,S.trainerCutout,270,190,285,382,S.trainerPose?.zoom||1,S.trainerPose?.x||0,S.trainerPose?.y||0);
    }
    g.restore();
  }

  function statIcon(g,cx,cy,kind,team){
    const p=palette[team]||palette.valor;
    g.save(); g.shadowColor=p.accent; g.shadowBlur=9; g.strokeStyle=p.glow; g.lineWidth=2;
    g.beginPath(); g.arc(cx,cy,27,0,Math.PI*2); g.stroke(); g.shadowBlur=0;
    g.fillStyle=p.pale; g.textAlign='center'; g.textBaseline='middle';
    if(kind==='xp'){g.font='900 19px system-ui';g.fillText('XP',cx,cy+1);}
    else if(kind==='stop'){
      g.beginPath();g.arc(cx,cy-2,9,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(cx,cy+8);g.lineTo(cx,cy+18);g.stroke();g.beginPath();g.moveTo(cx-8,cy+18);g.lineTo(cx+8,cy+18);g.stroke();
    }else{
      g.beginPath();g.arc(cx,cy,10,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(cx-18,cy);g.lineTo(cx-10,cy);g.moveTo(cx+10,cy);g.lineTo(cx+18,cy);g.stroke();g.beginPath();g.arc(cx,cy,3,0,Math.PI*2);g.fill();
    }
    g.restore();
  }

  function statBlock(g,label,value,x,w,kind,team){
    const p=palette[team]||palette.valor, iconX=x+48, textX=x+92;
    statIcon(g,iconX,645,kind,team);
    g.fillStyle=p.pale; g.textAlign='left'; g.textBaseline='middle'; g.font='750 8px system-ui';
    const words=label.split(' ');
    if(words.length>1){g.fillText(words.slice(0,-1).join(' '),textX,628);g.fillText(words[words.length-1],textX,641);} else g.fillText(label,textX,635);
    g.fillStyle='#fff'; fitText(g,value||'—',textX,672,w-100,21,950,'left');
  }

  function drawStats(g,team){
    const p=palette[team]||palette.valor;
    g.save();
    const grad=g.createLinearGradient(0,600,0,756); grad.addColorStop(0,'rgba(15,8,16,.70)'); grad.addColorStop(1,'rgba(4,5,9,.92)');
    g.fillStyle=grad; g.strokeStyle=p.glow; g.lineWidth=1.5; panelPath(g,24,596,552,156,18); g.fill(); g.stroke();
    g.globalAlpha=.34; g.strokeStyle=p.glow; [208,392].forEach(x=>{g.beginPath();g.moveTo(x,620);g.lineTo(x,706);g.stroke();});
    g.globalAlpha=.24; g.beginPath();g.moveTo(66,721);g.lineTo(534,721);g.stroke(); g.globalAlpha=1;
    statBlock(g,'POKÉMON CAUGHT',($('caught').value||'').trim(),28,180,'caught',team);
    statBlock(g,'POKÉSTOPS VISITED',($('stops').value||'').trim(),212,180,'stop',team);
    statBlock(g,'TOTAL XP',($('xp').value||'').trim(),396,176,'xp',team);
    g.restore();

    // Minimal footer only. Print date is intentionally small and bottom-center.
    g.textBaseline='middle'; g.font='650 6.8px system-ui'; g.fillStyle=p.pale;
    g.textAlign='left'; g.fillText(`START  ${($('startDate').value||'—').trim()}`,35,773);
    g.textAlign='center'; g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,780);
  }

  S.drawFront = () => {
    const c=$('cardCanvas'); if(!c) return;
    if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}
    const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(SCALE,SCALE);
    const team=S.team||'valor';
    energyBackground(g,team); drawHeader(g,team); drawSubjects(g); drawStats(g,team);
    g.restore();
  };

  S.drawBack = () => {
    const c=$('backCanvas'); if(!c) return;
    if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}
    const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.save(); g.scale(SCALE,SCALE);
    const team=S.team||'valor', p=palette[team]||palette.valor, cfg=S.TEAM[team];
    energyBackground(g,team); teamLogo(g,team,180,135,240,.13);

    g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=p.pale; g.font='800 9px system-ui'; g.fillText('TRAINER CARD',300,55);
    g.fillStyle='#fff'; fitText(g,($('trainerName').value||'TRAINER').trim(),300,92,470,34,950);
    g.fillStyle=p.glow; g.font='900 14px system-ui'; g.fillText((cfg?.name||team).toUpperCase(),300,124);

    const grad=g.createLinearGradient(0,180,0,604);grad.addColorStop(0,'rgba(10,9,16,.66)');grad.addColorStop(1,'rgba(3,5,9,.90)');
    g.fillStyle=grad; g.strokeStyle=p.glow; g.lineWidth=1.5; panelPath(g,92,170,416,430,20); g.fill(); g.stroke();
    g.fillStyle='#fff'; panelPath(g,158,214,284,284,16); g.fill();
    if(S.qrCrop) contain(g,S.qrCrop,174,230,252,252);
    else {g.fillStyle='#151922';g.font='800 13px system-ui';g.fillText('UPLOAD TRAINER CODE',300,356);}
    g.fillStyle='#fff'; fitText(g,S.formatCode($('trainerCode').value)||'••••  ••••  ••••',300,540,360,25,950);
    g.fillStyle=p.pale; g.font='800 8px system-ui'; g.fillText('TRAINER CODE',300,568);

    g.fillStyle='rgba(4,7,12,.65)';g.strokeStyle=p.glow+'88';panelPath(g,92,625,416,90,14);g.fill();g.stroke();
    g.textAlign='left';g.fillStyle=p.pale;g.font='700 7px system-ui';g.fillText('LEVEL',116,648);g.fillText('BUDDY',247,648);g.fillText('TEAM',414,648);
    g.fillStyle='#fff';g.font='900 17px system-ui';g.fillText(($('level').value||'—').trim(),116,677);fitText(g,($('buddy').value||'—').trim(),247,677,145,17,900,'left');
    g.fillStyle=p.glow;g.fillText(cfg?.name||team,414,677);
    g.font='650 6.8px system-ui';g.fillStyle=p.pale;g.textAlign='center';g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,780);
    g.restore();
  };
})();
