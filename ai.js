(() => {
  const S=window.TC,$=S.$;
  const CHARACTER_RECT={x:.34,y:.075,w:.66,h:.455};

  function sourceCrop(img,rect,maxDim=920){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const sw=iw*rect.w,sh=ih*rect.h,scale=Math.min(1,maxDim/Math.max(sw,sh));
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*scale)); c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.drawImage(img,iw*rect.x,ih*rect.y,sw,sh,0,0,c.width,c.height);
    return c;
  }

  function dilateMask(data,w,h,passes=2){
    let src=Uint8Array.from(data,v=>v?1:0);
    for(let pass=0;pass<passes;pass++){
      const out=src.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x; if(src[i]) continue;
        if(src[i-1]||src[i+1]||src[i-w]||src[i+w]||src[i-w-1]||src[i-w+1]||src[i+w-1]||src[i+w+1]) out[i]=1;
      }
      src=out;
    }
    return src;
  }

  function trimAlpha(canvas,minFraction=.0015){
    const w=canvas.width,h=canvas.height,g=canvas.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data,n=w*h;
    const labels=new Int32Array(n),queue=new Int32Array(n),areas=[0]; let id=0,maxArea=0;
    for(let p=0;p<n;p++){
      if(labels[p]||d[p*4+3]<24) continue;
      id++; let head=0,tail=0,area=0; labels[p]=id; queue[tail++]=p;
      while(head<tail){
        const q=queue[head++],x=q%w,y=(q/w)|0; area++;
        const add=nq=>{if(nq>=0&&nq<n&&!labels[nq]&&d[nq*4+3]>=24){labels[nq]=id;queue[tail++]=nq;}};
        if(x>0)add(q-1); if(x<w-1)add(q+1); if(y>0)add(q-w); if(y<h-1)add(q+w);
      }
      areas[id]=area; maxArea=Math.max(maxArea,area);
    }
    const keep=new Uint8Array(id+1); const threshold=Math.max(35,Math.round(maxArea*minFraction));
    for(let i=1;i<=id;i++) if(areas[i]>=threshold) keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let p=0;p<n;p++){
      const lab=labels[p]; if(!lab||!keep[lab]){d[p*4+3]=0;continue;}
      const x=p%w,y=(p/w)|0; minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    g.putImageData(im,0,0); if(maxX<0) return null;
    const pad=Math.max(4,Math.round(Math.max(w,h)*.012)); minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
  }

  async function bodyPixModel(){
    if(S.bodyPixNet) return S.bodyPixNet;
    if(!window.bodyPix) throw new Error('BodyPix library did not load');
    $('extractStatus').textContent='Loading trainer model…';
    S.bodyPixNet=await bodyPix.load({architecture:'MobileNetV1',outputStride:16,multiplier:1.0,quantBytes:2});
    return S.bodyPixNet;
  }

  async function removeForeground(canvas,token){
    if(!S.removeBg){
      $('extractStatus').textContent='Loading foreground model…';
      const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
      S.removeBg=mod.removeBackground||mod.default;
    }
    if(token!==S.jobToken) throw new Error('cancelled');
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encode failed')),'image/png'));
    const run=device=>S.removeBg(blob,{device,model:'isnet_quint8',output:{format:'image/png',quality:1,type:'foreground'},progress:(key,current,total)=>{if(token===S.jobToken&&total>0)$('extractStatus').textContent=`Foreground ${Math.round(current/total*100)}%`;}});
    let out;
    try{out=await run(navigator.gpu?'gpu':'cpu');}catch(e){if(!navigator.gpu)throw e;out=await run('cpu');}
    if(token!==S.jobToken) throw new Error('cancelled');
    const url=URL.createObjectURL(out),img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;}); URL.revokeObjectURL(url);
    const full=document.createElement('canvas'); full.width=canvas.width;full.height=canvas.height;full.getContext('2d').drawImage(img,0,0,full.width,full.height); return full;
  }

  function trainerFromMask(source,seg){
    const w=source.width,h=source.height,mask=dilateMask(seg.data,w,h,1),out=document.createElement('canvas');out.width=w;out.height=h;
    const g=out.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);const im=g.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<mask.length;i++) d[i*4+3]=mask[i]?255:0;g.putImageData(im,0,0);return trimAlpha(out,.0025);
  }

  function buddyFromCombined(combined,seg){
    const w=combined.width,h=combined.height,person=dilateMask(seg.data,w,h,3),g=combined.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<person.length;i++) if(person[i]) d[i*4+3]=0;g.putImageData(im,0,0);return trimAlpha(combined,.0008);
  }

  S.extractSubjects=async({trainerThreshold=.45}={})=>{
    if(!S.sourceImage)return;const token=++S.jobToken;
    $('retryTrainerBtn').disabled=true;$('retryBuddyBtn').disabled=true;$('trainerCutoutState').textContent='Working…';$('buddyCutoutState').textContent='Working…';$('extractStatus').textContent='Preparing subjects…';
    S.trainerCutout=null;S.buddyCutout=null;S.trainerCrop=null;S.buddyCrop=null;S.drawPreviews();S.drawFront();
    try{
      const crop=sourceCrop(S.sourceImage,CHARACTER_RECT,920);
      if(token!==S.jobToken)return;
      $('extractStatus').textContent='Finding trainer…';
      const net=await bodyPixModel(); if(token!==S.jobToken)return;
      const seg=await net.segmentPerson(crop,{flipHorizontal:false,internalResolution:'high',segmentationThreshold:trainerThreshold});
      if(token!==S.jobToken)return;
      const personPixels=Array.from(seg.data).reduce((a,b)=>a+(b?1:0),0);
      const fraction=personPixels/(seg.width*seg.height);
      if(fraction<.015||fraction>.55) throw new Error('trainer mask not plausible');
      const trainer=trainerFromMask(crop,seg); if(!trainer) throw new Error('trainer mask empty');
      S.trainerCutout=trainer;$('trainerCutoutState').textContent='Ready';S.drawPreviews();S.drawFront();

      $('extractStatus').textContent='Finding buddy…';
      const combined=await removeForeground(crop,token); if(token!==S.jobToken)return;
      const buddy=buddyFromCombined(combined,seg); if(!buddy) throw new Error('buddy mask empty');
      S.buddyCutout=buddy;$('buddyCutoutState').textContent='Ready';$('extractStatus').textContent='Ready';$('extractHelp').textContent='Trainer is isolated with a local person model. Buddy is the remaining foreground behind the trainer, so the two layers line up correctly on the card.';S.drawPreviews();S.drawFront();
    }catch(e){
      if(token!==S.jobToken)return;console.warn('subject extraction',e);$('extractStatus').textContent='Needs review';if(!S.trainerCutout)$('trainerCutoutState').textContent='Retry';if(!S.buddyCutout)$('buddyCutoutState').textContent='Retry';$('extractHelp').textContent='Automatic local extraction did not finish cleanly. Retry the subject extraction; the card will not use a screenshot rectangle.';S.drawPreviews();S.drawFront();
    }finally{if(token===S.jobToken){$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;}}
  };

  S.extractTrainerCutout=()=>S.extractSubjects({trainerThreshold:.38});
  S.extractBuddyCutout=()=>S.extractSubjects({trainerThreshold:.50});
})();
