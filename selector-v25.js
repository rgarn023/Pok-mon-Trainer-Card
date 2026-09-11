(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let source=null,sourceUrl='',active='trainer',drag=null;
  const shapes={trainer:{x:.44,y:.08,w:.40,h:.46},buddy:{cx:.28,cy:.24,r:.20}};

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function load(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({img,url});img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url;});}
  function css(){
    const s=document.createElement('style');s.textContent=`
      .sourceSelector{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.025)}
      .selectorHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}.selectorHead b{display:block;font-size:11px}.selectorHead small{display:block;color:var(--muted);font-size:8px;line-height:1.4;margin-top:2px}
      .selectorModes{display:flex;gap:6px;flex-wrap:wrap}.selectorMode{border:1px solid var(--line);background:rgba(255,255,255,.04);color:#dbe4ef;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:900}.selectorMode.active{border-color:var(--accent);color:var(--accent2);background:color-mix(in srgb,var(--accent) 10%,transparent)}
      .selectorCanvasWrap{position:relative;width:100%;border-radius:13px;overflow:hidden;background:#05070b;border:1px solid var(--line);touch-action:none}.selectorCanvasWrap canvas{display:block;width:100%;height:auto;touch-action:none}
      .selectorLegend{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 0;color:var(--muted);font-size:8px}.selectorLegend b{color:#fff}.selectorActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.selectorActions button{flex:1;min-width:120px}
      .imageCard .controls label:first-child::before{content:'Fine tune · ';color:var(--muted);font-weight:700}
      @media(max-width:620px){.selectorHead{display:block}.selectorModes{margin-top:8px}.selectorActions button{min-width:100%}}
    `;document.head.appendChild(s);
  }

  function ensureUI(){
    if($('sourceSelector'))return;
    const sourceCard=$('sourceCard');if(!sourceCard)return;
    const wrap=document.createElement('div');wrap.id='sourceSelector';wrap.className='sourceSelector hidden';
    wrap.innerHTML=`
      <div class="selectorHead"><div><b>Select the exact screenshot areas</b><small>Drag the rectangle over the trainer and the circle over the buddy. Drag the corner/edge handle to resize. These selected pixels become the card images.</small></div><div class="selectorModes"><button id="selectTrainerMode" class="selectorMode active" type="button">▭ Trainer rectangle</button><button id="selectBuddyMode" class="selectorMode" type="button">○ Buddy circle</button></div></div>
      <div class="selectorCanvasWrap"><canvas id="sourceSelectCanvas"></canvas></div>
      <div class="selectorLegend"><span><b>Trainer:</b> rectangular source crop</span><span><b>Buddy:</b> circular source crop</span><span>Nothing is generated or redrawn.</span></div>
      <div class="selectorActions"><button id="applyTrainerSelection" class="secondary" type="button">Use trainer selection</button><button id="applyBuddySelection" class="secondary" type="button">Use buddy selection</button><button id="applyBothSelections" class="secondary" type="button">Use both selections</button></div>`;
    sourceCard.insertAdjacentElement('afterend',wrap);
    $('selectTrainerMode').addEventListener('click',()=>setMode('trainer'));
    $('selectBuddyMode').addEventListener('click',()=>setMode('buddy'));
    $('applyTrainerSelection').addEventListener('click',()=>apply('trainer'));
    $('applyBuddySelection').addEventListener('click',()=>apply('buddy'));
    $('applyBothSelections').addEventListener('click',async()=>{await apply('trainer');await apply('buddy');});
    const c=$('sourceSelectCanvas');
    c.addEventListener('pointerdown',pointerDown);c.addEventListener('pointermove',pointerMove);c.addEventListener('pointerup',pointerUp);c.addEventListener('pointercancel',pointerUp);
  }

  function setMode(mode){active=mode;$('selectTrainerMode')?.classList.toggle('active',mode==='trainer');$('selectBuddyMode')?.classList.toggle('active',mode==='buddy');draw();}
  function canvasPoint(e){const c=$('sourceSelectCanvas'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
  function pxShape(){const c=$('sourceSelectCanvas'),t=shapes.trainer,b=shapes.buddy;return{trainer:{x:t.x*c.width,y:t.y*c.height,w:t.w*c.width,h:t.h*c.height},buddy:{cx:b.cx*c.width,cy:b.cy*c.height,r:b.r*Math.min(c.width,c.height)}};}

  function draw(){
    const c=$('sourceSelectCanvas');if(!c||!source)return;const maxW=Math.min(1000,source.naturalWidth||source.width),ratio=(source.naturalHeight||source.height)/(source.naturalWidth||source.width);c.width=Math.round(maxW);c.height=Math.round(maxW*ratio);const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(source,0,0,c.width,c.height);
    g.fillStyle='rgba(0,0,0,.34)';g.fillRect(0,0,c.width,c.height);const p=pxShape();
    g.save();g.beginPath();g.rect(p.trainer.x,p.trainer.y,p.trainer.w,p.trainer.h);g.clip();g.drawImage(source,0,0,c.width,c.height);g.restore();
    g.save();g.beginPath();g.arc(p.buddy.cx,p.buddy.cy,p.buddy.r,0,Math.PI*2);g.clip();g.drawImage(source,0,0,c.width,c.height);g.restore();
    g.lineWidth=Math.max(3,c.width/260);g.strokeStyle=active==='trainer'?'#ffffff':'rgba(255,255,255,.62)';g.setLineDash(active==='trainer'?[]:[10,8]);g.strokeRect(p.trainer.x,p.trainer.y,p.trainer.w,p.trainer.h);
    g.strokeStyle=active==='buddy'?'#ffffff':'rgba(255,255,255,.62)';g.setLineDash(active==='buddy'?[]:[10,8]);g.beginPath();g.arc(p.buddy.cx,p.buddy.cy,p.buddy.r,0,Math.PI*2);g.stroke();g.setLineDash([]);
    const hs=Math.max(10,c.width/65);g.fillStyle='rgba(255,255,255,.95)';g.fillRect(p.trainer.x+p.trainer.w-hs/2,p.trainer.y+p.trainer.h-hs/2,hs,hs);g.beginPath();g.arc(p.buddy.cx+p.buddy.r,p.buddy.cy,hs*.58,0,Math.PI*2);g.fill();
    g.font=`900 ${Math.max(15,c.width/44)}px system-ui`;g.textBaseline='top';g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.85)';g.shadowBlur=5;g.fillText('TRAINER',p.trainer.x+8,p.trainer.y+7);g.fillText('BUDDY',p.buddy.cx-p.buddy.r+8,p.buddy.cy-p.buddy.r+7);g.shadowBlur=0;
  }

  function pointerDown(e){if(!source)return;const c=$('sourceSelectCanvas'),q=canvasPoint(e),p=pxShape(),min=Math.min(c.width,c.height),handle=Math.max(24,c.width/35);c.setPointerCapture?.(e.pointerId);
    if(active==='trainer'){
      const hx=p.trainer.x+p.trainer.w,hy=p.trainer.y+p.trainer.h,near=Math.hypot(q.x-hx,q.y-hy)<handle;if(near)drag={kind:'trainer',mode:'resize',sx:q.x,sy:q.y,start:{...shapes.trainer}};else if(q.x>=p.trainer.x&&q.x<=p.trainer.x+p.trainer.w&&q.y>=p.trainer.y&&q.y<=p.trainer.y+p.trainer.h)drag={kind:'trainer',mode:'move',sx:q.x,sy:q.y,start:{...shapes.trainer}};
    }else{
      const hx=p.buddy.cx+p.buddy.r,hy=p.buddy.cy,near=Math.hypot(q.x-hx,q.y-hy)<handle;if(near)drag={kind:'buddy',mode:'resize',sx:q.x,sy:q.y,start:{...shapes.buddy}};else if(Math.hypot(q.x-p.buddy.cx,q.y-p.buddy.cy)<=p.buddy.r)drag={kind:'buddy',mode:'move',sx:q.x,sy:q.y,start:{...shapes.buddy}};
    }
    if(drag)e.preventDefault();
  }
  function pointerMove(e){if(!drag)return;const c=$('sourceSelectCanvas'),q=canvasPoint(e),dx=(q.x-drag.sx)/c.width,dy=(q.y-drag.sy)/c.height;
    if(drag.kind==='trainer'){
      const s=drag.start;if(drag.mode==='move'){shapes.trainer.x=clamp(s.x+dx,0,1-s.w);shapes.trainer.y=clamp(s.y+dy,0,1-s.h);}else{shapes.trainer.w=clamp(s.w+dx,.12,1-s.x);shapes.trainer.h=clamp(s.h+dy,.16,1-s.y);}
    }else{
      const s=drag.start;if(drag.mode==='move'){const rr=s.r;shapes.buddy.cx=clamp(s.cx+dx,rr,1-rr);shapes.buddy.cy=clamp(s.cy+dy,rr,1-rr);}else{const min=Math.min(c.width,c.height),startR=s.r*min,newR=clamp((startR+(q.x-drag.sx))/min,.06,.36);shapes.buddy.r=newR;shapes.buddy.cx=clamp(shapes.buddy.cx,newR,1-newR);shapes.buddy.cy=clamp(shapes.buddy.cy,newR,1-newR);}
    }
    draw();e.preventDefault();
  }
  function pointerUp(e){if(!drag)return;const kind=drag.kind;drag=null;apply(kind);e.preventDefault();}

  async function apply(kind){
    if(!source)return;const iw=source.naturalWidth||source.width,ih=source.naturalHeight||source.height;let x,y,w,h;
    if(kind==='trainer'){const s=shapes.trainer;x=s.x*iw;y=s.y*ih;w=s.w*iw;h=s.h*ih;}else{const s=shapes.buddy,r=s.r;x=(s.cx-r)*iw;y=(s.cy-r)*ih;w=h=2*r*iw;if(ih!==iw){const cy=s.cy*ih,rr=s.r*Math.min(iw,ih);x=s.cx*iw-rr;y=cy-rr;w=h=rr*2;}}
    x=clamp(x,0,iw-1);y=clamp(y,0,ih-1);w=clamp(w,1,iw-x);h=clamp(h,1,ih-y);const max=1400,scale=Math.min(1,max/Math.max(w,h)),out=document.createElement('canvas');out.width=Math.max(1,Math.round(w*scale));out.height=Math.max(1,Math.round(h*scale));const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(source,x,y,w,h,0,0,out.width,out.height);
    const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)return;const file=new File([blob],`${kind}_selection.png`,{type:'image/png'}),input=$(kind==='trainer'?'trainerImageInput':'buddyImageInput');try{const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));toastLocal(`${kind==='trainer'?'Trainer':'Buddy'} selection applied from the profile screenshot.`);}catch(err){console.warn(err);toastLocal('This browser could not transfer the selected crop automatically.');}
  }
  function toastLocal(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(t._selectorTimer);t._selectorTimer=setTimeout(()=>t.classList.remove('show'),2400);}

  document.addEventListener('DOMContentLoaded',()=>{
    css();ensureUI();
    $('profileInput')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(sourceUrl)URL.revokeObjectURL(sourceUrl);const r=await load(file);source=r.img;sourceUrl=r.url;$('sourceSelector')?.classList.remove('hidden');shapes.trainer={x:.44,y:.08,w:.40,h:.46};shapes.buddy={cx:.28,cy:.24,r:.20};setMode('trainer');draw();}catch(err){console.error(err);}});
    $('resetBtn')?.addEventListener('click',()=>{source=null;if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl='';$('sourceSelector')?.classList.add('hidden');});
    window.addEventListener('resize',()=>{if(source)draw();});
  });
})();