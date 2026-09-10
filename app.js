(() => {
  const S=window.TC,$=S.$;
  const fields=['trainerName','level','buddy','caught','stops','xp','startDate'],all=[...fields,'printDate'];
  $('printDate').value=S.today();
  document.querySelectorAll('.team').forEach(b=>b.addEventListener('click',()=>S.setTeam(b.dataset.team,false)));

  function loadProfile(file){if(!file)return;if(S.sourceURL)URL.revokeObjectURL(S.sourceURL);S.sourceURL=URL.createObjectURL(file);const im=new Image();im.onload=()=>{S.sourceImage=im;$('thumb').src=S.sourceURL;$('sourceName').textContent=file.name;$('sourceMeta').textContent=`${im.naturalWidth} × ${im.naturalHeight} · ${(file.size/1048576).toFixed(1)} MB`;$('sourceCard').classList.remove('hidden');$('saveBtn').disabled=false;$('rescanBtn').disabled=false;$('cardEmpty').classList.add('hidden');S.setTeam(S.detectTeam(im),true);S.makeCharacterCrop(im);S.scanProfile()};im.src=S.sourceURL}
  function loadCode(file){if(!file)return;if(S.codeURL)URL.revokeObjectURL(S.codeURL);S.codeURL=URL.createObjectURL(file);const im=new Image();im.onload=()=>{S.codeImage=im;$('codeThumb').src=S.codeURL;$('codeSourceName').textContent=file.name;$('codeSourceMeta').textContent=`${im.naturalWidth} × ${im.naturalHeight}`;$('codeSourceCard').classList.remove('hidden');$('codeEmpty').classList.add('hidden');$('rescanCodeBtn').disabled=false;S.scanCode()};im.src=S.codeURL}

  $('profileInput').addEventListener('change',e=>loadProfile(e.target.files?.[0]));
  $('replaceBtn').addEventListener('click',()=>$('profileInput').click());
  $('rescanBtn').addEventListener('click',()=>S.scanProfile());
  $('retryExtractBtn').addEventListener('click',()=>S.extractCutout());
  $('trainerCodeInput').addEventListener('change',e=>loadCode(e.target.files?.[0]));
  $('replaceCodeBtn').addEventListener('click',()=>$('trainerCodeInput').click());
  $('rescanCodeBtn').addEventListener('click',()=>S.scanCode());
  $('trainerCode').addEventListener('input',()=>{$('trainerCodeState').textContent='Manual';$('trainerCodeState').className='';S.drawBack()});
  all.forEach(id=>$(id).addEventListener('input',()=>{if(fields.includes(id))S.setState(id,'manual');S.updateQuality();S.drawFront();S.drawBack()}));
  ['zoom','panX','panY'].forEach(id=>$(id).addEventListener('input',()=>{$(id+'Out').textContent=id==='zoom'?(+$(id).value).toFixed(2)+'×':(+$(id).value).toFixed(2);S.drawPortrait();S.drawFront()}));

  const setFlip=back=>{S.showingBack=!!back;$('cardFlipper').classList.toggle('flipped',S.showingBack);$('sidePill').textContent=S.showingBack?'Back':'Front';$('saveBtn').querySelector('small').textContent=(S.showingBack?'Back':'Front')+' · high-resolution PNG'};
  const flip=()=>setFlip(!S.showingBack);
  $('cardStage').addEventListener('click',flip);$('flipBtn').addEventListener('click',flip);$('cardStage').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}});
  $('saveBtn').addEventListener('click',()=>{S.drawFront();S.drawBack();const c=S.showingBack?$('backCanvas'):$('cardCanvas'),side=S.showingBack?'back':'front',a=document.createElement('a');a.download=`${($('trainerName').value||'trainer').replace(/\W+/g,'_')}_${S.team}_trainer_card_${side}.png`;a.href=c.toDataURL('image/png');a.click();S.toast(`${S.showingBack?'Back':'Front'} of card saved.`)});

  $('resetBtn').addEventListener('click',()=>{if(S.sourceURL)URL.revokeObjectURL(S.sourceURL);if(S.codeURL)URL.revokeObjectURL(S.codeURL);Object.assign(S,{sourceImage:null,sourceURL:'',codeImage:null,codeURL:'',crop:null,cutout:null,qrCrop:null,qrRaw:''});$('profileInput').value='';$('trainerCodeInput').value='';$('sourceCard').classList.add('hidden');$('codeSourceCard').classList.add('hidden');$('codeEmpty').classList.remove('hidden');$('trainerCode').value='';$('trainerCodeState').textContent='Manual';$('trainerCodeState').className='';$('qrStatus').textContent='Waiting';$('codeScanStatus').textContent='Waiting';$('rescanCodeBtn').disabled=true;$('saveBtn').disabled=true;$('rescanBtn').disabled=true;$('retryExtractBtn').disabled=true;$('cardEmpty').classList.remove('hidden');$('portraitEmpty').classList.remove('hidden');all.forEach(id=>$(id).value=id==='printDate'?S.today():'');fields.forEach(id=>S.setState(id,'manual'));document.body.dataset.team='neutral';document.querySelectorAll('.team').forEach(b=>b.classList.remove('active'));$('teamStatus').textContent='Waiting for upload';$('previewTeam').textContent='Choose a team';S.updateQuality();setFlip(false);S.drawPortrait();S.drawFront();S.drawBack()});

  if('serviceWorker'in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  S.setTeam('valor');document.body.dataset.team='neutral';document.querySelectorAll('.team').forEach(b=>b.classList.remove('active'));$('teamStatus').textContent='Waiting for upload';$('previewTeam').textContent='Choose a team';S.drawPortrait();S.drawFront();S.drawBack();
})();
