(() => {
  const S=window.TC,$=S.$;

  function revoke(url){ if(url) URL.revokeObjectURL(url); }
  function fileMeta(f){ return `${Math.round(f.size/1024)} KB · ${f.type || 'image'}`; }
  function setSourceCard(kind,file,url){
    if(kind==='profile'){
      $('thumb').src=url; $('sourceName').textContent=file.name; $('sourceMeta').textContent=fileMeta(file); $('sourceCard').classList.remove('hidden');
      $('cardEmpty').classList.add('hidden'); $('saveBtn').disabled=false; $('rescanBtn').disabled=false;
    } else {
      $('codeThumb').src=url; $('codeSourceName').textContent=file.name; $('codeSourceMeta').textContent=fileMeta(file); $('codeSourceCard').classList.remove('hidden');
      $('rescanCodeBtn').disabled=false; $('codeEmpty').classList.add('hidden');
    }
  }

  function loadImageFromFile(file){ return new Promise((resolve,reject)=>{ const url=URL.createObjectURL(file); const img=new Image(); img.onload=()=>resolve({img,url}); img.onerror=e=>{URL.revokeObjectURL(url); reject(e)}; img.src=url; }); }

  async function handleProfile(file){
    if(!file) return;
    try{
      const {img,url}=await loadImageFromFile(file);
      revoke(S.sourceURL); S.sourceURL=url; S.sourceImage=img; setSourceCard('profile',file,url);
      $('printDate').value=S.today();
      S.drawPreviews(); S.drawFront(); S.drawBack();
      await S.scanProfile();
    }catch(e){ console.error(e); S.toast('Could not read that profile screenshot.'); }
  }

  async function handleCode(file){
    if(!file) return;
    try{
      const {img,url}=await loadImageFromFile(file);
      revoke(S.codeURL); S.codeURL=url; S.codeImage=img; setSourceCard('code',file,url);
      S.drawBack();
      await S.scanCode();
    }catch(e){ console.error(e); S.toast('Could not read that trainer code screenshot.'); }
  }

  $('profileInput').addEventListener('change',e=>handleProfile(e.target.files?.[0]||null));
  $('trainerCodeInput').addEventListener('change',e=>handleCode(e.target.files?.[0]||null));
  $('replaceBtn').addEventListener('click',()=> $('profileInput').click());
  $('replaceCodeBtn').addEventListener('click',()=> $('trainerCodeInput').click());
  $('rescanBtn').addEventListener('click',()=> S.scanProfile());
  $('rescanCodeBtn').addEventListener('click',()=> S.scanCode());
  $('retryTrainerBtn').addEventListener('click',()=> S.extractTrainerCutout());
  $('retryBuddyBtn').addEventListener('click',()=> S.extractBuddyCutout());
  document.querySelectorAll('.team').forEach(button => button.addEventListener('click',()=>S.setTeam(button.dataset.team,false)));

  function syncOutput(inputId,outId,formatter=v=>v){ const input=$(inputId); const out=$(outId); const update=()=>{ out.textContent=formatter(input.value); if(inputId==='tZoom'||inputId==='tPanX'||inputId==='tPanY'){ S.trainerPose.zoom=+$('tZoom').value; S.trainerPose.x=+$('tPanX').value; S.trainerPose.y=+$('tPanY').value; }
      if(inputId==='bZoom'||inputId==='bPanX'||inputId==='bPanY'){ S.buddyPose.zoom=+$('bZoom').value; S.buddyPose.x=+$('bPanX').value; S.buddyPose.y=+$('bPanY').value; }
      S.drawPreviews(); S.drawFront(); };
    input.addEventListener('input',update); update(); }

  syncOutput('tZoom','tZoomOut',v=>`${(+v).toFixed(2)}×`); syncOutput('tPanX','tPanXOut',v=>(+v).toFixed(2)); syncOutput('tPanY','tPanYOut',v=>(+v).toFixed(2));
  syncOutput('bZoom','bZoomOut',v=>`${(+v).toFixed(2)}×`); syncOutput('bPanX','bPanXOut',v=>(+v).toFixed(2)); syncOutput('bPanY','bPanYOut',v=>(+v).toFixed(2));

  ['trainerName','level','buddy','caught','stops','xp','startDate','printDate','trainerCode'].forEach(id=>$(id).addEventListener('input',()=>{ S.drawFront(); S.drawBack(); }));
  $('trainerCode').addEventListener('blur',()=>{ $('trainerCode').value=S.formatCode($('trainerCode').value); S.drawBack(); });

  function flip(){ S.showingBack=!S.showingBack; $('cardFlipper').classList.toggle('flipped',S.showingBack); $('sidePill').textContent=S.showingBack?'Back':'Front'; }
  $('flipBtn').addEventListener('click',flip); $('cardStage').addEventListener('click',flip); $('cardStage').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); }});

  $('saveBtn').addEventListener('click',()=>{
    const canvas=S.showingBack ? $('backCanvas') : $('cardCanvas');
    const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download=`trainer-card-${S.showingBack?'back':'front'}-${S.team}.png`; a.click();
  });

  $('resetBtn').addEventListener('click',()=>{
    revoke(S.sourceURL); revoke(S.codeURL);
    S.sourceURL=''; S.codeURL=''; S.sourceImage=null; S.codeImage=null; S.trainerCrop=null; S.buddyCrop=null; S.trainerCutout=null; S.buddyCutout=null; S.qrCrop=null; S.qrRaw=''; S.showingBack=false;
    $('profileInput').value=''; $('trainerCodeInput').value=''; $('sourceCard').classList.add('hidden'); $('codeSourceCard').classList.add('hidden'); $('scanCard').classList.add('hidden'); $('rescanBtn').disabled=true; $('rescanCodeBtn').disabled=true; $('retryTrainerBtn').disabled=true; $('retryBuddyBtn').disabled=true;
    $('cardEmpty').classList.remove('hidden'); $('codeEmpty').classList.remove('hidden'); $('saveBtn').disabled=true; $('trainerEmpty').classList.remove('hidden'); $('buddyEmpty').classList.remove('hidden');
    $('teamStatus').textContent='Waiting for upload'; $('previewTeam').textContent='Choose a team'; $('extractStatus').textContent='Waiting'; $('extractHelp').textContent='The card front will not render a screenshot rectangle. If cutout fails, review and retry extraction.'; $('codeScanStatus').textContent='Waiting'; $('qrStatus').textContent='Waiting'; $('qrStatus').className='chip'; $('sidePill').textContent='Front'; $('cardFlipper').classList.remove('flipped');
    $('trainerCutoutState').textContent='Waiting'; $('buddyCutoutState').textContent='Waiting';
    ['trainerName','level','buddy','caught','stops','xp','startDate','trainerCode'].forEach(id=>{ $(id).value=''; S.setState(id,'manual'); }); $('printDate').value=S.today();
    S.setTeam('valor',false); $('teamStatus').textContent='Waiting for upload'; $('previewTeam').textContent='Choose a team';
    S.updateQuality(); S.drawPreviews(); S.drawFront(); S.drawBack();
  });

  $('printDate').value=S.today();
  S.updateQuality(); S.drawPreviews(); S.drawFront(); S.drawBack();
})();
