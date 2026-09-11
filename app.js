(() => {
  const S=window.TC,$=S.$;
  const revoke=u=>u&&URL.revokeObjectURL(u);
  const meta=f=>`${Math.round(f.size/1024)} KB · ${f.type||'image'}`;
  const load=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({img,url});img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url;});

  async function clearLegacyCaches(){try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}}catch(e){console.warn('cache cleanup',e)}}
  clearLegacyCaches();

  function refreshReady(){const ready=!!(S.trainerCutout||S.buddyCutout||S.qrCrop||$('trainerName').value.trim());$('cardEmpty').classList.toggle('hidden',ready);$('saveBtn').disabled=!ready;$('saveAnimatedBtn').disabled=!ready;}

  async function handleAsset(kind,file){
    if(!file)return;
    try{
      const {img,url}=await load(file),cap=kind[0].toUpperCase()+kind.slice(1);
      if(kind==='trainer'){revoke(S.trainerURL);S.trainerURL=url;S.trainerCutout=img;$('trainerThumb').src=url;$('trainerSourceName').textContent=file.name;$('trainerSourceMeta').textContent=meta(file);$('trainerSourceCard').classList.remove('hidden');$('trainerCutoutState').textContent='Uploaded';}
      if(kind==='buddy'){revoke(S.buddyURL);S.buddyURL=url;S.buddyCutout=img;$('buddyThumb').src=url;$('buddySourceName').textContent=file.name;$('buddySourceMeta').textContent=meta(file);$('buddySourceCard').classList.remove('hidden');$('buddyCutoutState').textContent='Uploaded';}
      if(kind==='qr'){revoke(S.qrURL);S.qrURL=url;S.qrCrop=img;$('qrThumb').src=url;$('qrSourceName').textContent=file.name;$('qrSourceMeta').textContent=meta(file);$('qrSourceCard').classList.remove('hidden');$('qrStatus').textContent='Uploaded';}
      S.drawPreviews();S.drawFront();S.drawBack();refreshReady();S.toast(`${cap} image loaded.`);
    }catch(e){console.error(e);S.toast(`Could not load that ${kind} image.`);}
  }

  $('trainerImageInput').addEventListener('change',e=>handleAsset('trainer',e.target.files?.[0]||null));
  $('buddyImageInput').addEventListener('change',e=>handleAsset('buddy',e.target.files?.[0]||null));
  $('qrImageInput').addEventListener('change',e=>handleAsset('qr',e.target.files?.[0]||null));
  $('replaceTrainerBtn').addEventListener('click',()=>$('trainerImageInput').click());
  $('replaceBuddyBtn').addEventListener('click',()=>$('buddyImageInput').click());
  $('replaceQrBtn').addEventListener('click',()=>$('qrImageInput').click());
  document.querySelectorAll('.team').forEach(b=>b.addEventListener('click',()=>S.setTeam(b.dataset.team)));

  function syncRange(id,out,pose,key){const input=$(id),output=$(out);const update=()=>{const v=+input.value;output.textContent=key==='zoom'?v.toFixed(2)+'×':v.toFixed(2);S[pose][key]=v;S.drawPreviews();S.drawFront();};input.addEventListener('input',update);update();}
  syncRange('tZoom','tZoomOut','trainerPose','zoom');syncRange('tPanX','tPanXOut','trainerPose','x');syncRange('tPanY','tPanYOut','trainerPose','y');
  syncRange('bZoom','bZoomOut','buddyPose','zoom');syncRange('bPanX','bPanXOut','buddyPose','x');syncRange('bPanY','bPanYOut','buddyPose','y');

  function syncScene(){S.scene.bgY=+$('sceneBgY').value;S.scene.bgZoom=+$('sceneBgZoom').value;S.scene.groundY=+$('sceneGround').value;S.scene.buddyMode=$('buddyPlacement').value;S.scene.buddyFloat=+$('buddyFloat').value;$('sceneBgYOut').textContent=String(S.scene.bgY);$('sceneBgZoomOut').textContent=S.scene.bgZoom.toFixed(2)+'×';$('sceneGroundOut').textContent=String(S.scene.groundY);$('buddyFloatOut').textContent=String(S.scene.buddyFloat);$('buddyFloat').disabled=S.scene.buddyMode!=='float';$('buddyFloatLabel').style.opacity=S.scene.buddyMode==='float'?'1':'.45';S.drawFront();}
  ['sceneBgY','sceneBgZoom','sceneGround','buddyPlacement','buddyFloat'].forEach(id=>$(id).addEventListener('input',syncScene));
  $('resetSceneBtn').addEventListener('click',()=>{$('sceneBgY').value='0';$('sceneBgZoom').value='1';$('sceneGround').value='665';$('buddyPlacement').value='ground';$('buddyFloat').value='90';syncScene();});

  $('editLayer').addEventListener('change',()=>S.activeLayer=$('editLayer').value);
  let drag=null;
  $('cardCanvas').addEventListener('pointerdown',e=>{if(S.showingBack)return;const layer=S.activeLayer;if(layer!=='trainer'&&layer!=='buddy')return;drag={layer,x:e.clientX,y:e.clientY};$('cardCanvas').setPointerCapture?.(e.pointerId);e.preventDefault();});
  $('cardCanvas').addEventListener('pointermove',e=>{if(!drag)return;const rect=$('cardCanvas').getBoundingClientRect(),pose=drag.layer==='trainer'?S.trainerPose:S.buddyPose,dx=(e.clientX-drag.x)/rect.width*600,dy=(e.clientY-drag.y)/rect.height*800;pose.x=Math.max(-1,Math.min(1,pose.x+dx/(drag.layer==='trainer'?52:62)));pose.y=Math.max(-1,Math.min(1,pose.y+dy/(drag.layer==='trainer'?36:38)));drag.x=e.clientX;drag.y=e.clientY;const p=drag.layer==='trainer'?'t':'b';$(p+'PanX').value=pose.x;$(p+'PanY').value=pose.y;$(p+'PanXOut').textContent=pose.x.toFixed(2);$(p+'PanYOut').textContent=pose.y.toFixed(2);S.drawPreviews();S.drawFront();e.preventDefault();});
  const endDrag=()=>drag=null;$('cardCanvas').addEventListener('pointerup',endDrag);$('cardCanvas').addEventListener('pointercancel',endDrag);

  const fields=['trainerName','level','buddy','caught','stops','xp','startDate','printDate','trainerCode'];
  fields.forEach(id=>$(id).addEventListener('input',()=>{S.setState(id,'manual');S.drawFront();S.drawBack();refreshReady();}));
  $('trainerCode').addEventListener('blur',()=>{$('trainerCode').value=S.formatCode($('trainerCode').value);S.drawBack();});

  const setFlip=back=>{S.showingBack=!!back;$('cardFlipper').classList.toggle('flipped',S.showingBack);$('sidePill').textContent=S.showingBack?'Back':'Front';$('saveBtn').querySelector('small').textContent=(S.showingBack?'Back':'Front')+' · high-resolution PNG';$('saveAnimatedBtn').querySelector('small').textContent=(S.showingBack?'Back':'Front')+' · 4-second loop';};
  $('flipBtn').addEventListener('click',()=>setFlip(!S.showingBack));

  $('saveBtn').addEventListener('click',()=>{S.drawFront();S.drawBack();const canvas=S.showingBack?$('backCanvas'):$('cardCanvas'),a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`${($('trainerName').value||'trainer').replace(/\W+/g,'_')}_${S.team}_trainer_card_${S.showingBack?'back':'front'}_v24.png`;a.click();S.toast(`${S.showingBack?'Back':'Front'} PNG saved.`);});
  $('resetBtn').addEventListener('click',async()=>{S.hardReset();await clearLegacyCaches();$('editLayer').value='trainer';window.scrollTo({top:0,behavior:'smooth'});S.toast('Editor reset.');});

  $('printDate').value=S.today();S.hardReset();syncScene();
})();