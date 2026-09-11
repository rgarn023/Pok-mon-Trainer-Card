(() => {
  const S=window.TC,$=S.$;
  // Stable Pokémon GO profile stage. Keeping trainer + buddy together preserves their exact overlap.
  const CHARACTER_RECT={x:.045,y:.055,w:.91,h:.485};

  function sourceCrop(img,rect,maxDim=1180){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,sw=iw*rect.w,sh=ih*rect.h,scale=Math.min(2.2,maxDim/Math.max(sw,sh));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,iw*rect.x,ih*rect.y,sw,sh,0,0,c.width,c.height);return c;
  }
  function trimAlpha(canvas,minFraction=.0015){
    const w=canvas.width,h=canvas.height,g=canvas.getContext('2d',{willReadFrequently:true}),im=g.getImageData(0,0,w,h),d=im.data,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),areas=[0];let id=0,maxArea=0;
    for(let p=0;p<n;p++){
      if(labels[p]||d[p*4+3]<24)continue;id++;let head=0,tail=0,area=0;labels[p]=id;queue[tail++]=p;
      while(head<tail){const q=queue[head++],x=q%w,y=(q/w)|0;area++;const add=nq=>{if(nq>=0&&nq<n&&!labels[nq]&&d[nq*4+3]>=24){labels[nq]=id;queue[tail++]=nq;}};if(x>0)add(q-1);if(x<w-1)add(q+1);if(y>0)add(q-w);if(y<h-1)add(q+w);}
      areas[id]=area;maxArea=Math.max(maxArea,area);
    }
    const keep=new Uint8Array(id+1),threshold=Math.max(24,Math.round(maxArea*minFraction));for(let i=1;i<=id;i++)if(areas[i]>=threshold)keep[i]=1;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let p=0;p<n;p++){const lab=labels[p];if(!lab||!keep[lab]){d[p*4+3]=0;continue;}const x=p%w,y=(p/w)|0;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    g.putImageData(im,0,0);if(maxX<0)return null;const pad=Math.max(5,Math.round(Math.max(w,h)*.015));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
  }
  async function removeForeground(canvas,token){
    if(!S.removeBg){$('extractStatus').textContent='Loading foreground model…';const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');S.removeBg=mod.removeBackground||mod.default;}
    if(token!==S.jobToken)throw new Error('cancelled');
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encode failed')),'image/png'));
    const run=device=>S.removeBg(blob,{device,model:'isnet_quint8',output:{format:'image/png',quality:1,type:'foreground'},progress:(key,current,total)=>{if(token===S.jobToken&&total>0)$('extractStatus').textContent=`Extracting ${Math.round(current/total*100)}%`;}});
    let out;try{out=await run(navigator.gpu?'gpu':'cpu');}catch(e){if(!navigator.gpu)throw e;out=await run('cpu');}
    if(token!==S.jobToken)throw new Error('cancelled');
    const url=URL.createObjectURL(out),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});URL.revokeObjectURL(url);const full=document.createElement('canvas');full.width=canvas.width;full.height=canvas.height;full.getContext('2d').drawImage(img,0,0,full.width,full.height);return trimAlpha(full);
  }

  S.extractSubjects=async()=>{
    if(!S.sourceImage)return false;const token=++S.jobToken;
    $('retryTrainerBtn').disabled=true;$('retryBuddyBtn').disabled=true;$('trainerCutoutState').textContent='Working…';$('buddyCutoutState').textContent='Working…';$('extractStatus').textContent='Extracting trainer + buddy…';
    S.generatedSubject=null;S.trainerCutout=null;S.buddyCutout=null;S.combinedCutout=null;
    try{
      const scene=sourceCrop(S.sourceImage,CHARACTER_RECT,1180);S.trainerCrop=scene;S.buddyCrop=scene;S.drawPreviews?.();
      const combined=await removeForeground(scene,token);if(token!==S.jobToken)return false;if(!combined)throw new Error('foreground empty');
      S.combinedCutout=combined;
      // Both review panes intentionally show the preserved joint layer; the final card uses it once.
      S.trainerCutout=combined;S.buddyCutout=combined;
      $('trainerCutoutState').textContent='Exact pixels';$('buddyCutoutState').textContent='Exact pixels';$('extractStatus').textContent='Ready';
      $('extractHelp').textContent='Trainer and buddy are preserved together from the uploaded screenshot so their exact appearance and overlap are not changed. The card renderer places this preserved pair into the locked composition.';
      S.drawPreviews?.();S.drawFront?.();S.drawBack?.();return true;
    }catch(e){if(token!==S.jobToken)return false;console.warn('subject extraction',e);$('extractStatus').textContent='Needs review';$('trainerCutoutState').textContent='Retry';$('buddyCutoutState').textContent='Retry';$('extractHelp').textContent='Foreground extraction did not finish cleanly. Tap Retry extraction.';S.drawPreviews?.();S.drawFront?.();return false;}
    finally{if(token===S.jobToken){$('retryTrainerBtn').disabled=false;$('retryBuddyBtn').disabled=false;}}
  };
  S.extractTrainerCutout=()=>S.extractSubjects();S.extractBuddyCutout=()=>S.extractSubjects();
})();