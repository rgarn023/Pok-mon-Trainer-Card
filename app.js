(() => {
  const S=window.TC,$=S.$;
  const revoke=u=>u&&URL.revokeObjectURL(u);
  const meta=f=>`${Math.round(f.size/1024)} KB · ${f.type||'image'}`;
  const load=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({img,url});img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url});

  async function clearLegacyCaches(){
    try{
      if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}
      if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('trainer-card-studio-')).map(k=>caches.delete(k)));}
    }catch(e){console.warn('cache cleanup',e)}
  }
  clearLegacyCaches();

  async function scanProfilePrimary(){
    let usedAI=false;
    if(S.hasOpenAIConfig?.()) usedAI=await S.scanProfileOpenAI();
    if(!usedAI) await S.scanProfile();
    return usedAI;
  }

  async function handleProfile(file){
    if(!file)return;
    try{
      const {img,url}=await load(file);
      S.jobToken++;S.scanning=false;
      revoke(S.sourceURL);S.sourceURL=url;S.sourceImage=img;S.trainerCutout=null;S.buddyCutout=null;S.openAITrainerBox=null;S.openAIBuddyBox=null;
      $('thumb').src=url;$('sourceName').textContent=file.name;$('sourceMeta').textContent=meta(file);$('sourceCard').classList.remove('hidden');$('cardEmpty').classList.add('hidden');$('saveBtn').disabled=false;$('rescanBtn').disabled=false;$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;$('printDate').value=S.today();S.drawPreviews();S.drawFront();S.drawBack();
      const ref=img;
      await scanProfilePrimary();
      if(S.sourceImage!==ref)return;
      await S.extractSubjects();
    }catch(e){console.error(e);S.toast('Could not process that profile screenshot.')}
  }

  async function handleCode(file){
    if(!file)return;
    try{
      const {img,url}=await load(file);revoke(S.codeURL);S.codeURL=url;S.codeImage=img;
      $('codeThumb').src=url;$('codeSourceName').textContent=file.name;$('codeSourceMeta').textContent=meta(file);$('codeSourceCard').classList.remove('hidden');$('codeEmpty').classList.add('hidden');$('rescanCodeBtn').disabled=false;await S.scanCode();
    }catch(e){console.error(e);S.toast('Could not process that Trainer Code screenshot.')}
  }

  $('profileInput').addEventListener('change',e=>handleProfile(e.target.files?.[0]||null));
  $('trainerCodeInput').addEventListener('change',e=>handleCode(e.target.files?.[0]||null));
  $('replaceBtn').addEventListener('click',()=>$('profileInput').click());
  $('replaceCodeBtn').addEventListener('click',()=>$('trainerCodeInput').click());
  $('saveAIConfigBtn')?.addEventListener('click',()=>S.saveOpenAIConfig());
  $('rescanBtn').addEventListener('click',async()=>{const ref=S.sourceImage;await scanProfilePrimary();if(S.sourceImage===ref)S.extractSubjects();});
  $('rescanCodeBtn').addEventListener('click',()=>S.scanCode());
  $('retryTrainerBtn').addEventListener('click',()=>S.extractTrainerCutout());
  $('retryBuddyBtn').addEventListener('click',()=>S.extractBuddyCutout());
  document.querySelectorAll('.team').forEach(b=>b.addEventListener('click',()=>S.setTeam(b.dataset.team,false)));

  function syncRange(id,out,pose,key){const input=$(id),output=$(out);const update=()=>{const v=+input.value;output.textContent=key==='zoom'?v.toFixed(2)+'×':v.toFixed(2);S[pose][key]=v;S.drawPreviews();S.drawFront();};input.addEventListener('input',update);update();}
  syncRange('tZoom','tZoomOut','trainerPose','zoom');syncRange('tPanX','tPanXOut','trainerPose','x');syncRange('tPanY','tPanYOut','trainerPose','y');syncRange('bZoom','bZoomOut','buddyPose','zoom');syncRange('bPanX','bPanXOut','buddyPose','x');syncRange('bPanY','bPanYOut','buddyPose','y');

  const detectedFields=['trainerName','level','buddy','caught','stops','xp','startDate'];
  [...detectedFields,'printDate','trainerCode'].forEach(id=>$(id).addEventListener('input',()=>{if(detectedFields.includes(id))S.setState(id,'manual');S.updateQuality();S.drawFront();S.drawBack()}));
  $('trainerCode').addEventListener('input',()=>{$('trainerCodeState').textContent='Manual';$('trainerCodeState').className='';});
  $('trainerCode').addEventListener('blur',()=>{$('trainerCode').value=S.formatCode($('trainerCode').value);S.drawBack()});

  const setFlip=back=>{S.showingBack=!!back;$('cardFlipper').classList.toggle('flipped',S.showingBack);$('sidePill').textContent=S.showingBack?'Back':'Front';$('saveBtn').querySelector('small').textContent=(S.showingBack?'Back':'Front')+' · high-resolution PNG';};
  const flip=()=>setFlip(!S.showingBack);
  $('flipBtn').addEventListener('click',flip);$('cardStage').addEventListener('click',flip);$('cardStage').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}});
  $('saveBtn').addEventListener('click',()=>{S.drawFront();S.drawBack();const canvas=S.showingBack?$('backCanvas'):$('cardCanvas'),a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`${($('trainerName').value||'trainer').replace(/\W+/g,'_')}_${S.team}_trainer_card_${S.showingBack?'back':'front'}_v14.png`;a.click();S.toast(`${S.showingBack?'Back':'Front'} saved.`)});

  $('resetBtn').addEventListener('click',async()=>{
    const worker=S.ocr;S.ocr=null;S.hardReset();
    if(worker?.terminate)worker.terminate().catch(()=>{});
    await clearLegacyCaches();
    window.scrollTo({top:0,behavior:'smooth'});
    S.toast('Reset complete. Ready for a new profile.');
  });

  $('printDate').value=S.today();S.hardReset();S.refreshOpenAIStatus?.();
})();
