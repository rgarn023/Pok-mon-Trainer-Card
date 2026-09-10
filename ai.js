(() => {
  const S=window.TC,$=S.$;
  // Pokémon GO's ME/profile character stage is stable. Keep trainer + buddy together
  // for the final card so subtracting the trainer cannot destroy visible buddy pixels.
  const CHARACTER_RECT={x:.30,y:.085,w:.68,h:.455};

  function sourceCrop(img,rect,maxDim=1180){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const sw=iw*rect.w,sh=ih*rect.h,scale=Math.min(2,maxDim/Math.max(sw,sh));
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(sw*scale)); c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d',{willReadFrequently:true}); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.drawImage(img,iw*rect.x,ih*rect.y,sw,sh,0,0,c.width,c.height); return c;
  }
  function cloneCanvas(c){const o=document.createElement('canvas');o.width=c.width;o.height=c.height;o.getContext('2d').drawImage(c,0,0);return o;}

  function dilateMask(data,w,h,passes=2){
    let src=Uint8Array.from(data,v=>v?1:0);
    for(let pass=0;pass<passes;pass++){
      const out=src.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x;if(src[i])continue;
        if(src[i-1]||src[i+1]||src[i-w]||src[i+w]||src[i-w-1]||src[i-w+1]||src[i+w-1]||src[i+w+1])out[i]=1;
      }
      src=out;
    }
    return src;
  }

  function trimAlpha(canvas,minFraction=.0025){
    const w=canvas.width,h=canvas.height,g=canvas.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data,n=w*h;
    const labels=new Int32Array(n),queue=new Int32Array(n),areas=[0];let id=0,maxArea=0;
    for(let p=0;p<n;p++){
      if(labels[p]||d[p*4+3]<24)continue;
      id++;let head=0,tail=0,area=0;labels[p]=id;queue[tail++]=p;
      while(head<tail){const q=queue[head++],x=q%w,y=(q/w)|0;area++;const add=nq=>{if(nq>=0&&nq<n&&!labels[nq]&&d[nq*4+3]>=24){labels[nq]=id;queue[tail++]=nq;}};if(x>0)add(q-1);if(x<w-1)add(q+1);if(y>0)add(q-w);if(y<h-1)add(q+w);}
      areas[id]=area;maxArea=Math.max(maxArea,area);
    }
    const keep=new Uint8Array(id+1),threshold=Math.max(45,Math.round(maxArea*minFraction));for(let i=1;i<=id;i++)if(areas[i]>=threshold)keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let p=0;p<n;p++){const lab=labels[p];if(!lab||!keep[lab]){d[p*4+3]=0;continue;}const x=p%w,y=(p/w)|0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    g.putImageData(im,0,0);if(maxX<0)return null;
    const pad=Math.max(5,Math.round(Math.max(w,h)*.014));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
  }

  async function bodyPixModel(){
    if(S.bodyPixNet)return S.bodyPixNet;if(!window.bodyPix)throw new Error('BodyPix library did not load');
    $('extractStatus').textContent='Loading trainer model…';
    S.bodyPixNet=await bodyPix.load({architecture:'MobileNetV1',outputStride:16,multiplier:1.0,quantBytes:2});return S.bodyPixNet;
  }

  async function removeForeground(canvas,token){
    if(!S.removeBg){$('extractStatus').textContent='Loading foreground model…';const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');S.removeBg=mod.removeBackground||mod.default;}
    if(token!==S.jobToken)throw new Error('cancelled');
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encode failed')),'image/png'));
    const run=device=>S.removeBg(blob,{device,model:'isnet_quint8',output:{format:'image/png',quality:1,type:'foreground'},progress:(key,current,total)=>{if(token===S.jobToken&&total>0)$('extractStatus').textContent=`Foreground ${Math.round(current/total*100)}%`;}});
    let out;try{out=await run(navigator.gpu?'gpu':'cpu');}catch(e){if(!navigator.gpu)throw e;out=await run('cpu');}
    if(token!==S.jobToken)throw new Error('cancelled');
    const url=URL.createObjectURL(out),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});URL.revokeObjectURL(url);
    const full=document.createElement('canvas');full.width=canvas.width;full.height=canvas.height;full.getContext('2d').drawImage(img,0,0,full.width,full.height);return full;
  }

  function trainerFromMask(source,seg){
    const w=source.width,h=source.height,mask=dilateMask(seg.data,w,h,1),out=document.createElement('canvas');out.width=w;out.height=h;
    const g=out.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);const im=g.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<mask.length;i++)d[i*4+3]=mask[i]?255:0;g.putImageData(im,0,0);return trimAlpha(out,.003);
  }

  function buddyFromCombined(combined,seg){
    const w=combined.width,h=combined.height,person=dilateMask(seg.data,seg.width,seg.height,3),g=combined.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const sx=Math.min(seg.width-1,Math.floor(x/w*seg.width)),sy=Math.min(seg.height-1,Math.floor(y/h*seg.height));
      if(person[sy*seg.width+sx])d[(y*w+x)*4+3]=0;
    }
    g.putImageData(im,0,0);return trimAlpha(combined,.004);
  }

  S.extractSubjects=async({trainerThreshold=.43}={})=>{
    if(!S.sourceImage)return;const token=++S.jobToken;
    $('retryTrainerBtn').disabled=true;$('retryBuddyBtn').disabled=true;$('trainerCutoutState').textContent='Working…';$('buddyCutoutState').textContent='Working…';$('extractStatus').textContent='Extracting the profile characters together…';
    S.trainerCutout=null;S.buddyCutout=null;S.combinedCutout=null;S.trainerCrop=null;S.buddyCrop=null;S.drawPreviews();S.drawFront();
    try{
      const scene=sourceCrop(S.sourceImage,CHARACTER_RECT,1180);
      S.trainerCrop=scene;S.buddyCrop=scene;S.drawPreviews();

      // First preserve the entire visible trainer+buddy composition as one layer.
      $('extractStatus').textContent='Removing the profile background…';
      const foregroundRaw=await removeForeground(scene,token);if(token!==S.jobToken)return;
      const buddyWork=cloneCanvas(foregroundRaw);
      const combined=trimAlpha(foregroundRaw,.0025);if(!combined)throw new Error('combined foreground empty');
      S.combinedCutout=combined;S.drawFront();

      // Trainer mask is still produced for the preview/editor, but the final card uses
      // the combined layer so the buddy cannot be damaged by subtracting the trainer.
      $('extractStatus').textContent='Finding trainer inside the preserved composition…';
      const net=await bodyPixModel();if(token!==S.jobToken)return;
      const seg=await net.segmentPerson(scene,{flipHorizontal:false,internalResolution:'high',segmentationThreshold:trainerThreshold});if(token!==S.jobToken)return;
      const personPixels=Array.from(seg.data).reduce((a,b)=>a+(b?1:0),0),fraction=personPixels/(seg.width*seg.height);
      if(fraction>=.012&&fraction<=.72){
        const trainer=trainerFromMask(scene,seg);if(trainer){S.trainerCutout=trainer;$('trainerCutoutState').textContent='Ready';}
      }

      const buddy=buddyFromCombined(buddyWork,seg);
      if(buddy){S.buddyCutout=buddy;$('buddyCutoutState').textContent='Ready';}else{$('buddyCutoutState').textContent='Preserved';}
      if(!S.trainerCutout)$('trainerCutoutState').textContent='Preserved';
      $('extractStatus').textContent='Ready';
      $('extractHelp').textContent='The final card preserves the trainer and buddy together exactly as they overlap in the profile screenshot. Separate masks are only used for previews, so a failed buddy subtraction can no longer erase the buddy from the card.';
      S.drawPreviews();S.drawFront();
    }catch(e){
      if(token!==S.jobToken)return;console.warn('subject extraction',e);$('extractStatus').textContent='Needs review';
      if(!S.trainerCutout)$('trainerCutoutState').textContent='Retry';if(!S.buddyCutout)$('buddyCutoutState').textContent='Retry';
      $('extractHelp').textContent='Automatic background removal did not finish cleanly. Retry extraction; the card will never use a raw screenshot rectangle.';S.drawPreviews();S.drawFront();
    }finally{if(token===S.jobToken){$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;}}
  };

  S.extractTrainerCutout=()=>S.extractSubjects({trainerThreshold:.36});
  S.extractBuddyCutout=()=>S.extractSubjects({trainerThreshold:.50});
})();
