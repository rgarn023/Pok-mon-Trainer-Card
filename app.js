(() => {
  const S=window.TC,$=S.$;
  const revoke=u=>u&&URL.revokeObjectURL(u);
  const meta=f=>`${Math.round(f.size/1024)} KB · ${f.type||'image'}`;
  const load=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({img,url});img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url});

  async function clearOldAppCaches(){
    try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('trainer-card-studio-')).map(k=>caches.delete(k)));}}catch(e){console.warn('cache cleanup',e)}
  }
  clearOldAppCaches();

  async function handleProfile(file){
    if(!file)return;
    try{
      const {img,url}=await load(file);revoke(S.sourceURL);S.sourceURL=url;S.sourceImage=img;
      $('thumb').src=url;$('sourceName').textContent=file.name;$('sourceMeta').textContent=meta(file);$('sourceCard').classList.remove('hidden');$('cardEmpty').classList.add('hidden');$('saveBtn').disabled=false;$('rescanBtn').disabled=false;
      $('autoPickBtn').disabled=false;$('pickTrainerBtn').disabled=false;$('pickBuddyBtn').disabled=false;$('printDate').value=S.today();S.drawPicker();S.drawPreviews();S.drawFront();S.drawBack();
      await S.scanProfile();
      S.autoPickSubjects();
    }catch(e){console.error(e);S.toast('Could not open that profile screenshot.')}
  }
  async function handleCode(file){if(!file)return;try{const {img,url}=await load(file);revoke(S.codeURL);S.codeURL=url;S.codeImage=img;$('codeThumb').src=url;$('codeSourceName').textContent=file.name;$('codeSourceMeta').textContent=meta(file);$('codeSourceCard').classList.remove('hidden');$('codeEmpty').classList.add('hidden');$('rescanCodeBtn').disabled=false;await S.scanCode()}catch(e){console.error(e);S.toast('Could not open that Trainer Code screenshot.')}}

  $('profileInput').addEventListener('change',e=>handleProfile(e.target.files?.[0]||null));
  $('trainerCodeInput').addEventListener('change',e=>handleCode(e.target.files?.[0]||null));
  $('replaceBtn').addEventListener('click',()=>$('profileInput').click());$('replaceCodeBtn').addEventListener('click',()=>$('trainerCodeInput').click());$('rescanBtn').addEventListener('click',()=>S.scanProfile());$('rescanCodeBtn').addEventListener('click',()=>S.scanCode());
  document.querySelectorAll('.team').forEach(b=>b.addEventListener('click',()=>S.setTeam(b.dataset.team,false)));

  function setPickerMode(mode){S.pickerMode=mode;$('pickTrainerBtn').classList.toggle('active',mode==='trainer');$('pickBuddyBtn').classList.toggle('active',mode==='buddy');$('pickerHelp').textContent=`Tap directly on the ${mode} in the screenshot. Local Segment Anything will isolate that exact subject.`;}
  $('pickTrainerBtn').addEventListener('click',()=>setPickerMode('trainer'));
  $('pickBuddyBtn').addEventListener('click',()=>setPickerMode('buddy'));
  $('autoPickBtn').addEventListener('click',()=>S.autoPickSubjects());
  $('retryTrainerBtn').addEventListener('click',()=>setPickerMode('trainer'));
  $('retryBuddyBtn').addEventListener('click',()=>setPickerMode('buddy'));
  $('pickerCanvas').addEventListener('pointerup',async e=>{
    if(!S.sourceImage||!S.pickerMode||!S.pickerMap)return;
    const r=$('pickerCanvas').getBoundingClientRect(),cx=(e.clientX-r.left)*$('pickerCanvas').width/r.width,cy=(e.clientY-r.top)*$('pickerCanvas').height/r.height,m=S.pickerMap;
    if(cx<m.x||cx>m.x+m.w||cy<m.y||cy>m.y+m.h){S.toast('Tap inside the screenshot.');return;}
    const x=(cx-m.x)/m.scale,y=(cy-m.y)/m.scale,kind=S.pickerMode;
    if(kind==='trainer')S.lastTrainerPoint={x,y};else S.lastBuddyPoint={x,y};S.drawPicker();
    await S.pickSubjectAt(kind,x,y);
  });

  function syncRange(id,out,pose,key){const input=$(id),output=$(out);const update=()=>{const v=+input.value;output.textContent=(key==='zoom'?v.toFixed(2)+'×':v.toFixed(2));S[pose][key]=v;S.drawPreviews();S.drawFront();};input.addEventListener('input',update);update();}
  syncRange('tZoom','tZoomOut','trainerPose','zoom');syncRange('tPanX','tPanXOut','trainerPose','x');syncRange('tPanY','tPanYOut','trainerPose','y');syncRange('bZoom','bZoomOut','buddyPose','zoom');syncRange('bPanX','bPanXOut','buddyPose','x');syncRange('bPanY','bPanYOut','buddyPose','y');
  ['trainerName','level','buddy','caught','stops','xp','startDate','printDate','trainerCode'].forEach(id=>$(id).addEventListener('input',()=>{S.updateQuality();S.drawFront();S.drawBack()}));
  $('trainerCode').addEventListener('blur',()=>{$('trainerCode').value=S.formatCode($('trainerCode').value);S.drawBack()});

  const flip=()=>{S.showingBack=!S.showingBack;$('cardFlipper').classList.toggle('flipped',S.showingBack);$('sidePill').textContent=S.showingBack?'Back':'Front';};
  $('flipBtn').addEventListener('click',flip);$('cardStage').addEventListener('click',flip);$('cardStage').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}});
  $('saveBtn').addEventListener('click',()=>{const canvas=S.showingBack?$('backCanvas'):$('cardCanvas'),a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`trainer-card-${S.showingBack?'back':'front'}-${S.team}-v11.png`;a.click()});

  $('resetBtn').addEventListener('click',async()=>{
    S.hardReset();await clearOldAppCaches();
    location.replace(`${location.pathname}?v=11&reset=${Date.now()}`);
  });

  $('printDate').value=S.today();S.hardReset();
})();
