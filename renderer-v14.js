(() => {
  const S=window.TC,$=S.$;
  const W=600,H=800,SCALE=2;
  const palette={
    valor:{accent:'#ff315d',glow:'#ffb08a',pale:'#fff2e7'},
    mystic:{accent:'#2ab4ff',glow:'#b9f4ff',pale:'#f2fdff'},
    instinct:{accent:'#ffd21f',glow:'#fff49a',pale:'#fffbe8'}
  };
  const backgrounds={};

  function loadLockedBackground(team){
    fetch(`assets/locked/${team}.b64?v=20`,{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error(`missing ${team}`);return r.text();})
      .then(b64=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='data:image/avif;base64,'+b64.trim();}))
      .then(img=>{backgrounds[team]=img;S.drawFront?.();S.drawBack?.();})
      .catch(()=>{const img=new Image();img.onload=()=>{backgrounds[team]=img;S.drawFront?.();S.drawBack?.();};img.src=`assets/${team}-bg.svg?v=20`;});
  }
  ['valor','mystic','instinct'].forEach(loadLockedBackground);

  function panelPath(g,x,y,w,h,cut=14){g.beginPath();g.moveTo(x+cut,y);g.lineTo(x+w-cut,y);g.lineTo(x+w,y+cut);g.lineTo(x+w,y+h-cut);g.lineTo(x+w-cut,y+h);g.lineTo(x+cut,y+h);g.lineTo(x,y+h-cut);g.lineTo(x,y+cut);g.closePath();}
  function fitText(g,text,x,y,max,size,weight=900,align='center'){if(!text)return;let s=size;g.textAlign=align;g.textBaseline='middle';while(s>9){g.font=`${weight} ${s}px system-ui,-apple-system,Segoe UI,sans-serif`;if(g.measureText(text).width<=max)break;s--;}g.fillText(text,x,y,max);}
  function bottomFit(g,img,cx,bottom,maxW,maxH,zoom=1,dx=0,dy=0){const iw=img?.naturalWidth||img?.width||0,ih=img?.naturalHeight||img?.height||0;if(!iw||!ih)return;const scale=Math.min(maxW/iw,maxH/ih)*zoom,nw=iw*scale,nh=ih*scale;g.drawImage(img,cx-nw/2+dx,bottom-nh+dy,nw,nh);}

  function drawBackground(g,team){
    const bg=backgrounds[team];
    if(bg?.complete&&(bg.naturalWidth||bg.width)){g.drawImage(bg,0,0,W,H);return;}
    const p=palette[team]||palette.valor,gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#12131a');gr.addColorStop(.5,p.accent+'66');gr.addColorStop(1,'#030407');g.fillStyle=gr;g.fillRect(0,0,W,H);
  }

  function drawAnimatedEffect(g,team){
    const p=palette[team]||palette.valor,t=S.animPhase||0;g.save();
    if(team==='valor'){
      for(let i=0;i<26;i++){const seed=((i*37)%97)/97,x=34+((i*83)%532),y=690-((t+seed)%1)*525,r=1+((i*11)%8)*.22;g.globalAlpha=.18+.58*(1-((t+seed)%1));g.fillStyle=i%3?p.glow:p.accent;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
    }else if(team==='mystic'){
      for(let i=0;i<24;i++){const seed=((i*29)%89)/89,x=35+((i*71)%530),y=115+((t*.55+seed)%1)*520;g.globalAlpha=.18+.34*(.5+.5*Math.sin((t+seed)*Math.PI*2));g.fillStyle=p.pale;g.beginPath();g.arc(x,y,1+((i*7)%5)*.32,0,Math.PI*2);g.fill();}
      g.globalAlpha=.09;g.strokeStyle=p.glow;g.lineWidth=9;g.beginPath();g.moveTo(-40,550+Math.sin(t*Math.PI*2)*13);g.bezierCurveTo(150,500,400,620,650,530);g.stroke();
    }else{
      const flash=Math.sin(t*Math.PI*12);if(flash>.58||flash<-.82){g.globalAlpha=.55;g.strokeStyle=p.glow;g.lineWidth=2.2;const bolts=[[[35,160],[72,205],[53,235],[92,278]],[[565,194],[530,226],[548,259],[510,301]],[[61,525],[95,553],[77,582],[112,612]]];for(const pts of bolts){g.beginPath();g.moveTo(...pts[0]);pts.slice(1).forEach(q=>g.lineTo(...q));g.stroke();}}
    }
    g.restore();
  }

  function drawHeader(g,team){
    const p=palette[team]||palette.valor,name=($('trainerName').value||'TRAINER').trim();
    g.fillStyle=p.pale;g.textAlign='left';g.textBaseline='middle';g.font='750 8.5px system-ui';g.fillText('TRAINER',34,38);g.fillText('CARD',34,50);
    const ng=g.createLinearGradient(125,22,515,92);ng.addColorStop(0,p.pale);ng.addColorStop(.58,'#fff');ng.addColorStop(1,p.accent);g.fillStyle=ng;g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=7;fitText(g,name,330,58,400,45,950);g.shadowBlur=0;
    g.fillStyle=p.pale;g.font='800 14px system-ui';g.textAlign='right';g.fillText('Lv.',228,111);g.fillStyle='#fff';fitText(g,($('level').value||'—').trim(),278,110,82,31,950);
    g.fillStyle=p.pale;g.font='800 11px system-ui';g.textAlign='left';g.fillText('Buddy:',338,103);g.fillStyle='#fff';fitText(g,($('buddy').value||'—').trim(),338,122,205,18,900,'left');
  }

  // All three locked backgrounds have a dark foreground ledge at the same height.
  // Add a shallow perspective plane on top of that ledge so the character feet have a real surface to contact.
  function drawGroundPlane(g,team){
    const p=palette[team]||palette.valor;
    g.save();
    const gr=g.createLinearGradient(0,614,0,676);gr.addColorStop(0,'rgba(3,5,9,.06)');gr.addColorStop(.40,'rgba(3,5,9,.22)');gr.addColorStop(1,'rgba(3,5,9,.58)');
    g.fillStyle=gr;g.beginPath();g.moveTo(128,615);g.lineTo(472,615);g.lineTo(566,675);g.lineTo(34,675);g.closePath();g.fill();
    g.globalAlpha=.38;g.strokeStyle=p.glow;g.lineWidth=1.2;g.beginPath();g.moveTo(128,615);g.lineTo(472,615);g.stroke();
    g.globalAlpha=.13;g.lineWidth=.9;for(const x of [185,245,300,355,415]){g.beginPath();g.moveTo(300,615);g.lineTo(x+(x-300)*1.15,675);g.stroke();}
    g.globalAlpha=.11;for(const y of [632,648,662]){const q=(y-615)/60,left=128-(94*q),right=472+(94*q);g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();}
    g.restore();
  }

  function drawGroundShadow(g,team){
    const p=palette[team]||palette.valor;
    g.save();
    const gr=g.createRadialGradient(302,653,8,302,653,178);gr.addColorStop(0,'rgba(0,0,0,.48)');gr.addColorStop(.52,'rgba(0,0,0,.26)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.beginPath();g.ellipse(302,653,180,20,0,0,Math.PI*2);g.fill();
    g.globalAlpha=.20;g.strokeStyle=p.glow;g.lineWidth=1;g.beginPath();g.ellipse(302,653,112,8,0,0,Math.PI*2);g.stroke();g.restore();
  }

  function drawSubjects(g,team){
    g.save();panelPath(g,22,128,556,548,18);g.clip();
    drawGroundPlane(g,team);drawGroundShadow(g,team);
    const groundY=652;
    if(S.generatedSubject||S.combinedCutout){
      bottomFit(g,S.generatedSubject||S.combinedCutout,300,groundY,520,500,1.04,0,0);
    }else{
      // Locked composition: buddy large behind-left, trainer foreground right-center, both feet on the same plane.
      if(S.buddyCutout)bottomFit(g,S.buddyCutout,217,groundY,390,485,1.04,-7,0);
      if(S.trainerCutout)bottomFit(g,S.trainerCutout,407,groundY,292,405,1.04,5,0);
    }
    g.restore();
  }

  function statBlock(g,label,value,cx,team){const p=palette[team]||palette.valor;g.textAlign='center';g.textBaseline='middle';g.fillStyle=p.pale;g.font='800 7.5px system-ui';g.fillText(label,cx,699);g.fillStyle='#fff';fitText(g,value||'—',cx,728,155,20,950);}
  function drawStats(g,team){
    statBlock(g,'POKÉMON CAUGHT',($('caught').value||'').trim(),118,team);statBlock(g,'POKÉSTOPS VISITED',($('stops').value||'').trim(),300,team);statBlock(g,'TOTAL XP',($('xp').value||'').trim(),482,team);
    const p=palette[team]||palette.valor;g.fillStyle=p.pale;g.font='650 6.6px system-ui';g.textBaseline='middle';g.textAlign='left';g.fillText(`START  ${($('startDate').value||'—').trim()}`,42,765);g.textAlign='center';g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,782);
  }

  S.drawFront=()=>{const c=$('cardCanvas');if(!c)return;if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.scale(SCALE,SCALE);const team=S.team||'valor';drawBackground(g,team);drawAnimatedEffect(g,team);drawHeader(g,team);drawSubjects(g,team);drawStats(g,team);g.restore();};

  S.drawBack=()=>{
    const c=$('backCanvas');if(!c)return;if(c.width!==W*SCALE||c.height!==H*SCALE){c.width=W*SCALE;c.height=H*SCALE;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.scale(SCALE,SCALE);const team=S.team||'valor',p=palette[team]||palette.valor,cfg=S.TEAM[team];drawBackground(g,team);drawAnimatedEffect(g,team);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';fitText(g,($('trainerName').value||'TRAINER').trim(),300,82,460,35,950);g.fillStyle=p.pale;g.font='900 13px system-ui';g.fillText((cfg?.name||team).toUpperCase(),300,119);
    g.fillStyle='rgba(4,6,10,.72)';g.strokeStyle=p.glow;g.lineWidth=1.5;panelPath(g,90,165,420,455,20);g.fill();g.stroke();
    g.fillStyle='#fff';panelPath(g,157,212,286,286,16);g.fill();if(S.qrCrop)bottomFit(g,S.qrCrop,300,481,252,252,1,0,0);else{g.fillStyle='#151922';g.font='800 13px system-ui';g.fillText('UPLOAD TRAINER CODE',300,353);g.fillStyle='#657080';g.font='600 9px system-ui';g.fillText('QR preview appears here',300,375);}
    g.fillStyle='#fff';fitText(g,S.formatCode($('trainerCode').value)||'••••  ••••  ••••',300,546,360,24,950);g.fillStyle=p.pale;g.font='800 8px system-ui';g.fillText('TRAINER CODE',300,575);
    g.fillStyle='rgba(4,6,10,.72)';panelPath(g,90,645,420,82,16);g.fill();g.textAlign='left';g.fillStyle=p.pale;g.font='700 7.5px system-ui';g.fillText('LEVEL',118,665);g.fillText('BUDDY',252,665);g.fillText('TEAM',420,665);g.fillStyle='#fff';g.font='900 16px system-ui';g.fillText(($('level').value||'—').trim(),118,697);fitText(g,($('buddy').value||'—').trim(),252,697,135,16,900,'left');g.fillStyle=p.glow;g.fillText(cfg?.name||team,420,697);
    g.fillStyle=p.pale;g.font='650 6.6px system-ui';g.textAlign='center';g.fillText(`PRINT DATE  ${($('printDate').value||'—').trim()}`,300,779);g.restore();
  };
})();
