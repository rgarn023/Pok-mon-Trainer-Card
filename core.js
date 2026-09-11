(() => {
  const $=id=>document.getElementById(id);
  const TEAM={
    valor:{name:'Valor',accent:'#ff4d55',accent2:'#ff9a75'},
    mystic:{name:'Mystic',accent:'#30a5ff',accent2:'#83e8ff'},
    instinct:{name:'Instinct',accent:'#ffd534',accent2:'#fff18c'}
  };
  const S=window.TC={
    $,TEAM,team:'valor',showingBack:false,
    trainerCutout:null,buddyCutout:null,qrCrop:null,
    trainerURL:'',buddyURL:'',qrURL:'',
    trainerPose:{zoom:1,x:0,y:0},buddyPose:{zoom:1,x:0,y:0},
    scene:{bgY:0,bgZoom:1,groundY:665,buddyMode:'ground',buddyFloat:90},
    activeLayer:'trainer'
  };

  S.today=()=>new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'});
  S.toast=msg=>{const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);};
  S.setState=(id,state='manual')=>{const e=$(id+'State');if(!e)return;e.textContent=state==='manual'?'Manual':'Ready';e.className=state==='manual'?'':'ok';};
  S.updateQuality=()=>{};
  S.setTeam=t=>{if(!TEAM[t])return;S.team=t;document.body.dataset.team=t;document.querySelectorAll('.team').forEach(b=>b.classList.toggle('active',b.dataset.team===t));if($('teamStatus'))$('teamStatus').textContent='Selected: '+TEAM[t].name;if($('previewTeam'))$('previewTeam').textContent=TEAM[t].name;S.drawFront?.();S.drawBack?.();};
  S.formatCode=v=>{const d=(v||'').replace(/\D/g,'').slice(0,12);return d.replace(/(\d{4})(?=\d)/g,'$1  ').trim();};

  const dims=i=>({w:i?.naturalWidth||i?.width||0,h:i?.naturalHeight||i?.height||0});
  S.contain=(ctx,img,x,y,w,h,z=1,px=0,py=0)=>{const d=dims(img);if(!d.w||!d.h)return;const s=Math.min(w/d.w,h/d.h)*z,nw=d.w*s,nh=d.h*s;ctx.drawImage(img,x+(w-nw)/2+px*w*.18,y+(h-nh)/2+py*h*.18,nw,nh);};

  function preview(canvasId,emptyId,img,pose){
    const c=$(canvasId);if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);const gr=g.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,'#111923');gr.addColorStop(1,'#080b10');g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);
    if(!img){$(emptyId)?.classList.remove('hidden');return;}$(emptyId)?.classList.add('hidden');S.contain(g,img,16,16,c.width-32,c.height-32,pose.zoom,pose.x,pose.y);
  }
  S.drawPreviews=()=>{preview('trainerCanvas','trainerEmpty',S.trainerCutout,S.trainerPose);preview('buddyCanvas','buddyEmpty',S.buddyCutout,S.buddyPose);};

  S.hardReset=()=>{
    ['trainerName','level','buddy','caught','stops','xp','startDate','trainerCode'].forEach(id=>{if($(id)){$(id).value='';S.setState(id,'manual');}});
    if($('printDate'))$('printDate').value=S.today();
    for(const k of ['trainerURL','buddyURL','qrURL']){if(S[k])URL.revokeObjectURL(S[k]);S[k]='';}
    Object.assign(S,{trainerCutout:null,buddyCutout:null,qrCrop:null,showingBack:false,trainerPose:{zoom:1,x:0,y:0},buddyPose:{zoom:1,x:0,y:0},scene:{bgY:0,bgZoom:1,groundY:665,buddyMode:'ground',buddyFloat:90},activeLayer:'trainer'});
    ['trainerImageInput','buddyImageInput','qrImageInput'].forEach(id=>{if($(id))$(id).value='';});
    ['trainerSourceCard','buddySourceCard','qrSourceCard'].forEach(id=>$(id)?.classList.add('hidden'));
    $('cardEmpty')?.classList.remove('hidden');if($('saveBtn'))$('saveBtn').disabled=true;if($('saveAnimatedBtn'))$('saveAnimatedBtn').disabled=true;
    if($('trainerCutoutState'))$('trainerCutoutState').textContent='Waiting';if($('buddyCutoutState'))$('buddyCutoutState').textContent='Waiting';if($('qrStatus'))$('qrStatus').textContent='Waiting';
    if($('sidePill'))$('sidePill').textContent='Front';$('cardFlipper')?.classList.remove('flipped');
    ['tZoom','bZoom','sceneBgZoom'].forEach(id=>{if($(id))$(id).value='1';});['tPanX','tPanY','bPanX','bPanY','sceneBgY'].forEach(id=>{if($(id))$(id).value='0';});if($('sceneGround'))$('sceneGround').value='665';if($('buddyPlacement'))$('buddyPlacement').value='ground';if($('buddyFloat'))$('buddyFloat').value='90';
    S.setTeam('valor');S.drawPreviews();S.drawFront?.();S.drawBack?.();
  };
})();