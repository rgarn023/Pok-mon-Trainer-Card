(() => {
  const S=window.TC,$=S.$;
  const W=600,H=800,SCALE=2;
  const palette={
    valor:{accent:'#ff315d',glow:'#ffb08a',pale:'#fff2e7'},
    mystic:{accent:'#2ab4ff',glow:'#b9f4ff',pale:'#f2fdff'},
    instinct:{accent:'#ffd21f',glow:'#fff49a',pale:'#fffbe8'}
  };
  const backgrounds={},emblems={};
  ['valor','mystic','instinct'].forEach(team=>{
    const bg=new Image();bg.src=`assets/${team}-bg.svg?v=17`;bg.onload=()=>{S.drawFront();S.drawBack();};backgrounds[team]=bg;
    const e=new Image();e.src=`assets/${team}-emblem.svg?v=17`;e.onload=()=>{S.drawFront();S.drawBack();};emblems[team]=e;
  });

  function panelPath(g,x,y,w,h,cut=14){g.beginPath();g.moveTo(x+cut,y);g.lineTo(x+w-cut,y);g.lineTo(x+w,y+cut);g.lineTo(x+w,y+h-cut);g.lineTo(x+w-cut,y+h);g.lineTo(x+cut,y+h);g.lineTo(x,y+h-cut);g.lineTo(x,y+cut);g.closePath();}
  function framePath(g,inset=9,cut=22){panelPath(g,inset,inset,W-inset*2,H-inset*2,cut);}
  function fitText(g,text,x,y,max,size,weight=900,align='center'){if(!text)return;let s=size;g.textAlign=align;g.textBaseline='middle';while(s>9){g.font=`${weight} ${s}px system-ui,-apple-system,Segoe UI,sans-serif`;if(g.measureText(text).width<=max)break;s--;}g.fillText(text,x,y,max);}
  function contain(g,img,x,y,w,h,z=1,px=0,py=0){const iw=img?.naturalWidth||img?.width||0,ih=img?.naturalHeight||img?.height||0;if(!iw||!ih)return;const s=Math.min(w/iw,h/ih)*z,nw=iw*s,nh=ih*s;g.drawImage(img,x+(w-nw)/2+px*w*.18,y+(h-nh)/2+py*h*.18,nw,nh);}

  function drawBackground(g,team){
    const p=palette[team]||palette.valor,bg=backgrounds[team];
    if(bg?.complete&&(bg.naturalWidth||bg.width))g.drawImage(bg,0,0,W,H);else{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#10131d');gr.addColorStop(1,'#030408');g.fillStyle=gr;g.fillRect(0,0,W,H);}
    // subtle team emblem behind the subjects; fixed position on every team.
    const em=emblems[team];
    if(em?.complete&&(em.naturalWidth||em.width)){
      const o=document.createElement('canvas');o.width=o.height=240;const og=o.getContext('2d');og.drawImage(em,0,0,240,240);og.globalCompositeOperation='source-in';og.fillStyle=p.glow;og.fillRect(0,0,240,240);
      g.save();g.globalAlpha=.14;g.drawImage(o,378,44,176,176);g.restore();
    }
  }

  function drawFrame(g,team){
    const p=palette[team]||palette.valor,phase=S.animPhase||0,flicker=team==='valor'?2+2*Math.sin(phase*Math.PI*8):team==='instinct'?3+4*(Math.sin(phase*Math.PI*10)>0.74?1:0):3;
    g.save();g.shadowColor=p.accent;g.shadowBlur=14+flicker;g.strokeStyle=p.glow;g.lineWidth=4.2;framePath(g,9,22);g.stroke();
    g.shadowBlur=0;g.globalAlpha=.9;g.strokeStyle=p.pale;g.lineWidth=1.15;framePath(g,16,17);g.stroke();
    g.globalAlpha=.5;g.strokeStyle=p.accent;g.lineWidth=1;framePath(g,22,13);g.stroke();g.restore();
  }

  function drawAnimatedEffect(g,team){
    const p=palette[team]||palette.valor,t=S.animPhase||0;
    g.save();
    if(team==='valor'){
      // embers rise in a 4-second seamless loop.
      for(let i=0;i<24;i++){
        const seed=(i*37)%97/97, x=36+((i*83)%528), y=690-((t+seed)%1)*520, r=1+((i*11)%8)/8*1.7;
        g.globalAlpha=.18+.58*(1-((t+seed)%1));g.fillStyle=i%3?p.glow:p.accent;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
      }
      g.globalAlpha=.16+.08*Math.sin(t*Math.PI*8);g.fillStyle=p.accent;g.beginPath();g.ellipse(300,720,255,70,0,0,Math.PI*2);g.fill();
    }else if(team==='mystic'){
      for(let i=0;i<22;i++){
        const seed=(i*29)%89/89,x=38+((i*71)%520),y=115+((t*.55+seed)%1)*520;
        g.globalAlpha=.22+.35*(.5+.5*Math.sin((t+seed)*Math.PI*2));g.fillStyle=p.pale;g.beginPath();g.arc(x,y,1+((i*7)%5)*.35,0,Math.PI*2);g.fill();
      }
      g.globalAlpha=.12;g.strokeStyle=p.glow;g.lineWidth=9;g.beginPath();g.moveTo(-40,555+Math.sin(t*Math.PI*2)*14);g.bezierCurveTo(160,500,390,620,650,535);g.stroke();
    }else{
      // intermittent corner lightning; deterministic and subtle.
      const flash=Math.sin(t*Math.PI*12);
      if(flash>.58||flash<-.82){g.globalAlpha=.55;g.strokeStyle=p.glow;g.lineWidth=2.3;const bolts=[[[35,160],[72,205],[53,235],[92,278]],[[565,194],[530,226],[548,259],[510,301]],[[61,525],[95,553],[77,582],[112,612]]];for(const pts of bolts){g.beginPath();g.moveTo(...pts[0]);pts.slice(1).forEach(q=>g.lineTo(...q));g.stroke();}}
      for(let i=0;i<13;i++){const a=t*Math.PI*2+i*.8,x=300+Math.cos(a)*260,y=390+Math.sin(a*1.3)*300;g.globalAlpha=.18;g.fillStyle=p.glow;g.beginPath();g.arc(x,y,1.5,0,Math.PI*2);g.fill();}
    }
    g.restore();
  }

  function drawHeader(g,team){
    const p=palette[team]||palette.valor;
    g.fillStyle=p.pale;g.textAlign='left';g.textBaseline='middle';g.font='750 8.5px system-ui';g.fillText('TRAINER',34,38);g.fillText('CARD',34,50);g.strokeStyle=p.glow;g.lineWidth=1.2;g.beginPath();g.moveTo(34,64);g.lineTo(59,64);g.stroke();
    const name=($('trainerName').value||'TRAINER').trim(),ng=g.createLinearGradient(130,20,515,95);ng.addColorStop(0,p.pale);ng.addColorStop(.55,'#fff');ng.addColorStop(1,p.accent);g.fillStyle=ng;g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=7;fitText(g,name,330,57,395,47,950);g.shadowBlur=0;
    g.strokeStyle=p.accent;g.lineWidth=1.2;g.beginPath();g.moveTo(145,91);g.lineTo(515,91);g.stroke();
    g.fillStyle=p.pale;g.font='800 15px system-ui';g.textAlign='right';g.fillText('Lv.',228,113);g.fillStyle='#fff';fitText(g,($('level').value||'—').trim(),276,111,84,33,950);
    g.strokeStyle=p.glow;g.globalAlpha=.5;g.beginPath();g.moveTo(317,97);g.lineTo(317,130);g.stroke();g.globalAlpha=1;g.fillStyle=p.pale;g.font='800 12px system-ui';g.textAlign='left';g.fillText('Buddy:',335,103);g.fillStyle='#fff';fitText(g,($('buddy').value||'—').trim(),335,122,205,18,900,'left');
  }

  function drawSubjects(g){
    const img=S.generatedSubject||S.combinedCutout||null;
    g.save();panelPath(g,26,126,548,465,18);g.clip();
    if(img){contain(g,img,36,124,528,470,S.buddyPose?.zoom||1.04,S.buddyPose?.x||0,S.buddyPose?.y||0);}
    else{
      if(S.buddyCutout)contain(g,S.buddyCutout,40,132,390,450,S.buddyPose?.zoom||1,S.buddyPose?.x||0,S.buddyPose?.y||0);
      if(S.trainerCutout)contain(g,S.trainerCutout,270,190,285,382,S.trainerPose?.zoom||1,S.trainerPose?.x||0,S.trainerPose?.y||0);
    }
    g.restore();
  }

  function statIcon(g,cx,cy,kind,team){const p=palette[team]||palette.valor;g.save();g.shadowColor=p.accent;g.shadowBlur=8;g.strokeStyle=p.glow;g.lineWidth=2;g.beginPath();g.arc(cx,cy,27,0,Math.PI*2);g.stroke();g.shadowBlur=0;g.fillStyle=p.pale;g.textAlign='center';g.textBaseline='middle';if(kind==='xp'){g.font='900 19px system-ui';g.fillText('XP',cx,cy+1);}else if(kind==='stop'){g.beginPath();g.arc(cx,cy-2,9,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(cx,cy+8);g.lineTo(cx,cy+18);g.moveTo(cx-8,cy+18);g.lineTo(cx+8,cy+18);g.stroke();}else{g.beginPath();g.arc(cx,cy,10,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(cx-18,cy);g.lineTo(cx-10,cy);g.moveTo(cx+10,cy);g.lineTo(cx+18,cy);g.stroke();g.beginPath();g.arc(cx,cy,3,0,Math.PI*2);g.fill();}g.restore();}
  function statBlock(g,label,value,x,w,kind,team){const p=palette[team]||palette.valor,iconX=x+48,textX=x+92;statIcon(g,iconX,645,kind,team);g.fillStyle=p.pale;g.textAlign='left';g.textBaseline='middle';g.font='750 8px system-ui';const words=label.split(' ');if(words.length>1){g.fillText(words.slice(0,-1).join(' '),textX,628);g.fillText(words[words.length-1],textX,641);}else g.fillText(label,textX,635);g.fillStyle='#fff';fitText(g,value||'—',textX,672,w-100,21,950,'left');}
  function drawStats(g,team){
    const p=palette[team]||palette.valor;g.save();const gr=g.createLinearGradient(0,600,0,756);gr.addColorStop(0,'rgba(10,7,13,.62)');gr.addColorStop(1,'rgba(3,4,8,.90)');g.fillStyle=gr;g.strokeStyle=p.glow;g.lineWidth=1.5;panelPath(g,24,596,552,156,18);g.fill();g.stroke();g.globalAlpha=.30;g.strokeStyle=p.glow;[208,392].forEach(x=>{g.beginPath();g.moveTo(x,620);g.lineTo(x,706);g.stroke();});g.globalAlpha=1;
    statBlock(g,'POKÉMON CAUGHT',($('caught').value||'').trim(),28,180,'caught',team);statBlock(g,'POKÉSTOPS VISITED',($('stops').value||'').trim(),212,180,'stop',team);statBlock(g,'TOTAL XP',($('xp').value||'').trim(),396,176,'xp',team);g.restore();
    g.textBaseline='middle';g.font='650 6.8px system-ui';g.fillStyle=p.pale;g.textAlign='left';g.fillText(`START  ${($('startDate').value||'—').trim()}`,35,773);g.textAlign='center';g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,780);
  }

  S.drawFront=()=>{
    const c=$('cardCanvas');if(!c)return;if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.scale(SCALE,SCALE);const team=S.team||'valor';drawBackground(g,team);drawAnimatedEffect(g,team);drawFrame(g,team);drawHeader(g,team);drawSubjects(g);drawStats(g,team);g.restore();
  };

  S.drawBack=()=>{
    const c=$('backCanvas');if(!c)return;if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.scale(SCALE,SCALE);const team=S.team||'valor',p=palette[team]||palette.valor,cfg=S.TEAM[team];drawBackground(g,team);drawAnimatedEffect(g,team);drawFrame(g,team);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle=p.pale;g.font='800 9px system-ui';g.fillText('TRAINER CARD',300,60);g.fillStyle='#fff';fitText(g,($('trainerName').value||'TRAINER').trim(),300,101,455,36,950);g.fillStyle=p.glow;g.font='900 14px system-ui';g.fillText((cfg?.name||team).toUpperCase(),300,136);
    const gr=g.createLinearGradient(0,175,0,620);gr.addColorStop(0,'rgba(7,8,12,.58)');gr.addColorStop(1,'rgba(2,4,7,.90)');g.fillStyle=gr;g.strokeStyle=p.glow;g.lineWidth=1.5;panelPath(g,90,174,420,432,20);g.fill();g.stroke();
    g.fillStyle='#fff';panelPath(g,157,219,286,286,16);g.fill();if(S.qrCrop)contain(g,S.qrCrop,174,236,252,252);else{g.fillStyle='#151922';g.font='800 13px system-ui';g.fillText('UPLOAD TRAINER CODE',300,360);g.fillStyle='#657080';g.font='600 9px system-ui';g.fillText('QR preview appears here',300,382);}
    g.fillStyle='#fff';fitText(g,S.formatCode($('trainerCode').value)||'••••  ••••  ••••',300,552,360,24,950);g.fillStyle=p.pale;g.font='800 8px system-ui';g.fillText('TRAINER CODE',300,580);
    g.fillStyle='rgba(4,6,10,.72)';g.strokeStyle='rgba(255,255,255,.14)';panelPath(g,90,632,420,94,16);g.fill();g.stroke();g.textAlign='left';g.fillStyle=p.pale;g.font='700 7.5px system-ui';g.fillText('LEVEL',118,655);g.fillText('BUDDY',252,655);g.fillText('TEAM',420,655);g.fillStyle='#fff';g.font='900 17px system-ui';g.fillText(($('level').value||'—').trim(),118,687);fitText(g,($('buddy').value||'—').trim(),252,687,135,17,900,'left');g.fillStyle=p.glow;g.fillText(cfg?.name||team,420,687);
    g.font='650 6.8px system-ui';g.fillStyle=p.pale;g.textAlign='center';g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,780);g.restore();
  };
})();
