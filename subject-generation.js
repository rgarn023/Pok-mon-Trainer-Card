(() => {
  const S=window.TC,$=S.$;

  function referenceDataURL(img){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    // Pokemon GO profile character stage: include trainer + buddy together, exclude most stats/UI.
    const r={x:.16,y:.025,w:.84,h:.53};
    const sx=iw*r.x, sy=ih*r.y, sw=iw*r.w, sh=ih*r.h;
    const max=1280, scale=Math.min(2,max/Math.max(sw,sh));
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*scale)); c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.95);
  }

  function loadDataImage(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img); img.onerror=reject; img.src=url;
    });
  }

  S.generateSubjectOpenAI=async()=>{
    if(!S.sourceImage||!S.hasOpenAIConfig?.()) return false;
    const cfg=S.getOpenAIConfig(), token=++S.jobToken;
    const status=$('extractStatus');
    try{
      status.textContent='Creating trainer + buddy with OpenAI…';
      $('trainerCutoutState').textContent='AI working…';
      $('buddyCutoutState').textContent='AI working…';
      const body={
        image:referenceDataURL(S.sourceImage),
        team:S.team||'unknown',
        trainerName:$('trainerName').value.trim()||null,
        buddyName:$('buddy').value.trim()||null
      };
      if(cfg.accessCode) body.accessCode=cfg.accessCode;
      const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),120000);
      let response;
      try{
        response=await fetch(cfg.endpoint+'/subject',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      } finally { clearTimeout(timeout); }
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload?.error||`AI subject request failed (${response.status})`);
      if(token!==S.jobToken) return false;
      const dataUrl=payload.image||payload.imageDataUrl||(payload.imageBase64?`data:image/png;base64,${payload.imageBase64}`:'');
      if(!dataUrl) throw new Error('OpenAI returned no subject image.');
      const img=await loadDataImage(dataUrl);
      if(token!==S.jobToken) return false;
      S.generatedSubject=img;
      S.combinedCutout=img;
      // Show the same combined AI composition in both review panes; the final card uses one locked composition.
      S.trainerCutout=img; S.buddyCutout=img;
      $('trainerCutoutState').textContent='AI ready';
      $('buddyCutoutState').textContent='AI ready';
      status.textContent='AI subject ready';
      $('extractHelp').textContent='OpenAI recreated the trainer and buddy as one transparent layer in the locked pose. Team colors are applied only to the card background, never to the subjects.';
      S.drawPreviews?.(); S.drawFront?.(); S.drawBack?.();
      S.toast('AI trainer + buddy ready.');
      return true;
    }catch(err){
      if(token!==S.jobToken) return false;
      console.warn('AI subject recreation failed',err);
      status.textContent='AI unavailable — using local fallback';
      $('trainerCutoutState').textContent='Fallback'; $('buddyCutoutState').textContent='Fallback';
      $('extractHelp').textContent='The AI subject endpoint was unavailable, so the browser will fall back to local foreground extraction.';
      return false;
    }
  };
})();
