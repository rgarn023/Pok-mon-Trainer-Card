(() => {
  const S=window.TC,$=S.$;
  S.animPhase=0; S.animationEnabled=true;
  let last=0;
  function tick(ts){
    requestAnimationFrame(tick);
    if(!S.animationEnabled||document.hidden||ts-last<33) return;
    last=ts; S.animPhase=(ts%4000)/4000;
    if(S.sourceImage){S.drawFront?.();S.drawBack?.();}
  }
  requestAnimationFrame(tick);

  function recorderType(){
    if(!window.MediaRecorder) return '';
    const choices=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    return choices.find(t=>MediaRecorder.isTypeSupported?.(t))||'';
  }
  function extFor(type){return type.includes('mp4')?'mp4':'webm';}

  S.saveAnimatedCard=async()=>{
    const c=S.showingBack?$('backCanvas'):$('cardCanvas');
    if(!c?.captureStream||!window.MediaRecorder){S.toast('Animated export is not supported by this browser.');return;}
    const type=recorderType();
    if(!type){S.toast('This browser does not offer a supported animated video format.');return;}
    const btn=$('saveAnimatedBtn'); if(btn)btn.disabled=true;
    try{
      const stream=c.captureStream(30), chunks=[];
      const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6_000_000});
      rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||e);});
      rec.start(250);
      S.toast('Recording a 4-second seamless team effect…');
      await new Promise(r=>setTimeout(r,4050));
      rec.stop(); await stopped; stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(chunks,{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
      const side=S.showingBack?'back':'front',name=($('trainerName').value||'trainer').replace(/\W+/g,'_');
      a.href=url;a.download=`${name}_${S.team}_trainer_card_${side}_animated_v17.${extFor(type)}`;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),4000);
      S.toast(`Animated ${side} saved as ${extFor(type).toUpperCase()}.`);
    }catch(e){console.error(e);S.toast('Could not create the animated download on this browser.');}
    finally{if(btn)btn.disabled=false;}
  };

  document.addEventListener('DOMContentLoaded',()=>{
    $('saveAnimatedBtn')?.addEventListener('click',e=>{e.stopPropagation();S.saveAnimatedCard();});
  });
})();
