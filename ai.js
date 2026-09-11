(() => {
  const S=window.TC,$=S.$;

  // Pokémon GO profile fallback regions. Vision boxes are preferred whenever available.
  const FALLBACK_TRAINER={x:.46,y:.145,w:.39,h:.39};
  const FALLBACK_BUDDY={x:.055,y:.075,w:.62,h:.43};

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function normalizeBox(box,fallback,pad=.035){
    if(!box||![box.x,box.y,box.width,box.height].every(Number.isFinite)) return fallback;
    let x=clamp(box.x-pad,0,1),y=clamp(box.y-pad,0,1),r=clamp(box.x+box.width+pad,0,1),b=clamp(box.y+box.height+pad,0,1);
    if(r-x<.08||b-y<.10) return fallback;
    return {x,y,w:r-x,h:b-y};
  }
  function sourceCrop(img,rect,maxDim=1050){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const sw=iw*rect.w,sh=ih*rect.h,scale=Math.min(2.2,maxDim/Math.max(sw,sh));
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(img,iw*rect.x,ih*rect.y,sw,sh,0,0,c.width,c.height);return c;
  }

  function trimAlpha(canvas,minFraction=.0015){
    const w=canvas.width,h=canvas.height,g=canvas.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data,n=w*h;
    const labels=new Int32Array(n),queue=new Int32Array(n),areas=[0];let id=0,maxArea=0;
    for(let p=0;p<n;p++){
      if(labels[p]||d[p*4+3]<24)continue;
      id++;let head=0,tail=0,area=0;labels[p]=id;queue[tail++]=p;
      while(head<tail){const q=queue[head++],x=q%w,y=(q/w)|0;area++;const add=nq=>{if(nq>=0&&nq<n&&!labels[nq]&&d[nq*4+3]>=24){labels[nq]=id;queue[tail++]=nq;}};if(x>0)add(q-1);if(x<w-1)add(q+1);if(y>0)add(q-w);if(y<h-1)add(q+w);}
      areas[id]=area;maxArea=Math.max(maxArea,area);
    }
    const keep=new Uint8Array(id+1),threshold=Math.max(28,Math.round(maxArea*minFraction));for(let i=1;i<=id;i++)if(areas[i]>=threshold)keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let p=0;p<n;p++){const lab=labels[p];if(!lab||!keep[lab]){d[p*4+3]=0;continue;}const x=p%w,y=(p/w)|0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    g.putImageData(im,0,0);if(maxX<0)return null;
    const pad=Math.max(5,Math.round(Math.max(w,h)*.018));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
  }

  async function removeForeground(canvas,token,label){
    if(!S.removeBg){$('extractStatus').textContent='Loading foreground model…';const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');S.removeBg=mod.removeBackground||mod.default;}
    if(token!==S.jobToken)throw new Error('cancelled');
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encode failed')),'image/png'));
    const run=device=>S.removeBg(blob,{device,model:'isnet_quint8',output:{format:'image/png',quality:1,type:'foreground'},progress:(key,current,total)=>{if(token===S.jobToken&&total>0)$('extractStatus').textContent=`${label} ${Math.round(current/total*100)}%`;}});
    let out;try{out=await run(navigator.gpu?'gpu':'cpu');}catch(e){if(!navigator.gpu)throw e;out=await run('cpu');}
    if(token!==S.jobToken)throw new Error('cancelled');
    const url=URL.createObjectURL(out),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});URL.revokeObjectURL(url);
    const full=document.createElement('canvas');full.width=canvas.width;full.height=canvas.height;full.getContext('2d').drawImage(img,0,0,full.width,full.height);return trimAlpha(full);
  }

  S.extractSubjects=async()=>{
    if(!S.sourceImage)return false;
    const token=++S.jobToken;
    $('retryTrainerBtn').disabled=true;$('retryBuddyBtn').disabled=true;
    $('trainerCutoutState').textContent='Working…';$('buddyCutoutState').textContent='Working…';$('extractStatus').textContent='Finding trainer and buddy…';
    S.generatedSubject=null;S.combinedCutout=null;S.trainerCutout=null;S.buddyCutout=null;
    try{
      const trainerRect=normalizeBox(S.openAITrainerBox,FALLBACK_TRAINER,.025);
      const buddyRect=normalizeBox(S.openAIBuddyBox,FALLBACK_BUDDY,.028);
      S.trainerCrop=sourceCrop(S.sourceImage,trainerRect,1050);
      S.buddyCrop=sourceCrop(S.sourceImage,buddyRect,1050);
      S.drawPreviews?.();

      $('extractStatus').textContent='Extracting trainer pixels…';
      const trainer=await removeForeground(S.trainerCrop,token,'Trainer');if(token!==S.jobToken)return false;
      if(!trainer)throw new Error('trainer extraction empty');
      S.trainerCutout=trainer;$('trainerCutoutState').textContent='Exact pixels';S.drawPreviews?.();S.drawFront?.();

      $('extractStatus').textContent='Extracting buddy pixels…';
      const buddy=await removeForeground(S.buddyCrop,token,'Buddy');if(token!==S.jobToken)return false;
      if(!buddy)throw new Error('buddy extraction empty');
      S.buddyCutout=buddy;$('buddyCutoutState').textContent='Exact pixels';
      $('extractStatus').textContent='Ready';
      $('extractHelp').textContent='The trainer and buddy are extracted separately from the uploaded screenshot, then placed into the locked card pose: buddy large behind-left, trainer foreground right-center. Their clothing and character colors are not regenerated or recolored.';
      S.drawPreviews?.();S.drawFront?.();S.drawBack?.();
      return true;
    }catch(e){
      if(token!==S.jobToken)return false;console.warn('subject extraction',e);
      $('extractStatus').textContent='Needs review';
      if(!S.trainerCutout)$('trainerCutoutState').textContent='Retry';if(!S.buddyCutout)$('buddyCutoutState').textContent='Retry';
      $('extractHelp').textContent='Foreground extraction did not finish cleanly. Tap Retry extraction. The raw screenshot is never pasted onto the card.';
      S.drawPreviews?.();S.drawFront?.();return false;
    }finally{if(token===S.jobToken){$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;}}
  };
  S.extractTrainerCutout=()=>S.extractSubjects();
  S.extractBuddyCutout=()=>S.extractSubjects();
})();
