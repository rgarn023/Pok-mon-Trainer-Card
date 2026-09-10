(() => {
  const S=window.TC,$=S.$;
  const FALLBACK_RECT={x:.30,y:.065,w:.70,h:.47};

  function safeRect(box,fallback,pad=.06){
    const b=box&&Number.isFinite(+box.x)&&Number.isFinite(+box.y)&&Number.isFinite(+box.width)&&Number.isFinite(+box.height)
      ?{x:+box.x,y:+box.y,w:+box.width,h:+box.height}:fallback;
    if(!b||b.w<=0||b.h<=0||b.w>1.2||b.h>1.2) return fallback;
    const px=b.w*pad, py=b.h*pad;
    const x=Math.max(0,b.x-px), y=Math.max(0,b.y-py), x2=Math.min(1,b.x+b.w+px), y2=Math.min(1,b.y+b.h+py);
    return {x,y,w:Math.max(.02,x2-x),h:Math.max(.02,y2-y)};
  }

  function sourceCrop(img,rect,maxDim=1080){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const sw=iw*rect.w,sh=ih*rect.h,scale=Math.min(2,maxDim/Math.max(sw,sh));
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(sw*scale)); c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d',{willReadFrequently:true}); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.drawImage(img,iw*rect.x,ih*rect.y,sw,sh,0,0,c.width,c.height); return c;
  }

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

  function trimAlpha(canvas,minFraction=.0012){
    const w=canvas.width,h=canvas.height,g=canvas.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data,n=w*h;
    const labels=new Int32Array(n),queue=new Int32Array(n),areas=[0];let id=0,maxArea=0;
    for(let p=0;p<n;p++){
      if(labels[p]||d[p*4+3]<24)continue;
      id++;let head=0,tail=0,area=0;labels[p]=id;queue[tail++]=p;
      while(head<tail){const q=queue[head++],x=q%w,y=(q/w)|0;area++;const add=nq=>{if(nq>=0&&nq<n&&!labels[nq]&&d[nq*4+3]>=24){labels[nq]=id;queue[tail++]=nq;}};if(x>0)add(q-1);if(x<w-1)add(q+1);if(y>0)add(q-w);if(y<h-1)add(q+w);}
      areas[id]=area;maxArea=Math.max(maxArea,area);
    }
    const keep=new Uint8Array(id+1),threshold=Math.max(30,Math.round(maxArea*minFraction));for(let i=1;i<=id;i++)if(areas[i]>=threshold)keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let p=0;p<n;p++){const lab=labels[p];if(!lab||!keep[lab]){d[p*4+3]=0;continue;}const x=p%w,y=(p/w)|0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    g.putImageData(im,0,0);if(maxX<0)return null;
    const pad=Math.max(4,Math.round(Math.max(w,h)*.012));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
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
    for(let i=0;i<mask.length;i++)d[i*4+3]=mask[i]?255:0;g.putImageData(im,0,0);return trimAlpha(out,.002);
  }

  function subtractTrainerFromBuddy(buddyForeground,buddyRect,trainerRect,trainerSeg){
    const w=buddyForeground.width,h=buddyForeground.height,g=buddyForeground.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data;
    const tw=trainerSeg.width,th=trainerSeg.height,mask=dilateMask(trainerSeg.data,tw,th,2);
    for(let by=0;by<h;by++)for(let bx=0;bx<w;bx++){
      const sx=buddyRect.x+(bx+.5)/w*buddyRect.w, sy=buddyRect.y+(by+.5)/h*buddyRect.h;
      const u=(sx-trainerRect.x)/trainerRect.w, v=(sy-trainerRect.y)/trainerRect.h;
      if(u<0||u>=1||v<0||v>=1)continue;
      const tx=Math.min(tw-1,Math.max(0,Math.floor(u*tw))),ty=Math.min(th-1,Math.max(0,Math.floor(v*th)));
      if(mask[ty*tw+tx])d[(by*w+bx)*4+3]=0;
    }
    g.putImageData(im,0,0);return trimAlpha(buddyForeground,.0007);
  }

  S.extractSubjects=async({trainerThreshold=.43}={})=>{
    if(!S.sourceImage)return;const token=++S.jobToken;
    $('retryTrainerBtn').disabled=true;$('retryBuddyBtn').disabled=true;$('trainerCutoutState').textContent='Working…';$('buddyCutoutState').textContent='Working…';$('extractStatus').textContent='Using OpenAI subject locations…';
    S.trainerCutout=null;S.buddyCutout=null;S.trainerCrop=null;S.buddyCrop=null;S.drawPreviews();S.drawFront();
    try{
      const trainerRect=safeRect(S.openAITrainerBox,FALLBACK_RECT,.10);
      const buddyRect=safeRect(S.openAIBuddyBox,FALLBACK_RECT,.08);
      const trainerSource=sourceCrop(S.sourceImage,trainerRect,1080),buddySource=sourceCrop(S.sourceImage,buddyRect,1180);
      S.trainerCrop=trainerSource;S.buddyCrop=buddySource;S.drawPreviews();

      $('extractStatus').textContent='Isolating trainer…';const net=await bodyPixModel();if(token!==S.jobToken)return;
      const seg=await net.segmentPerson(trainerSource,{flipHorizontal:false,internalResolution:'high',segmentationThreshold:trainerThreshold});if(token!==S.jobToken)return;
      const personPixels=Array.from(seg.data).reduce((a,b)=>a+(b?1:0),0),fraction=personPixels/(seg.width*seg.height);
      if(fraction<.012||fraction>.72)throw new Error('trainer mask not plausible');
      const trainer=trainerFromMask(trainerSource,seg);if(!trainer)throw new Error('trainer mask empty');
      S.trainerCutout=trainer;$('trainerCutoutState').textContent='Ready';S.drawPreviews();S.drawFront();

      $('extractStatus').textContent='Isolating buddy…';const buddyForeground=await removeForeground(buddySource,token);if(token!==S.jobToken)return;
      const buddy=subtractTrainerFromBuddy(buddyForeground,buddyRect,trainerRect,seg);if(!buddy)throw new Error('buddy mask empty');
      S.buddyCutout=buddy;$('buddyCutoutState').textContent='Ready';$('extractStatus').textContent='Ready';
      $('extractHelp').textContent='OpenAI locates the trainer and buddy first. The browser then removes the background and subtracts only the detected trainer pixels from the buddy layer.';
      S.drawPreviews();S.drawFront();
    }catch(e){
      if(token!==S.jobToken)return;console.warn('subject extraction',e);$('extractStatus').textContent='Needs review';if(!S.trainerCutout)$('trainerCutoutState').textContent='Retry';if(!S.buddyCutout)$('buddyCutoutState').textContent='Retry';
      $('extractHelp').textContent='Automatic extraction did not finish cleanly. Retry either subject; the final card will not paste a screenshot rectangle.';S.drawPreviews();S.drawFront();
    }finally{if(token===S.jobToken){$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;}}
  };

  S.extractTrainerCutout=()=>S.extractSubjects({trainerThreshold:.36});
  S.extractBuddyCutout=()=>S.extractSubjects({trainerThreshold:.50});
})();
