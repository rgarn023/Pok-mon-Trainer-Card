(() => {
  const S=window.TC,$=S.$;

  S.initPaddleOCR = async () => {
    if (S.paddleOCR) return S.paddleOCR;
    $('scanDetail').textContent='Loading local PaddleOCR…';
    const mod = await import('https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm');
    const PaddleOCR = mod.PaddleOCR || mod.default?.PaddleOCR || mod.default;
    if (!PaddleOCR?.create) throw new Error('PaddleOCR browser module did not load');
    S.paddleOCR = await PaddleOCR.create({
      textDetectionModelName:'PP-OCRv5_mobile_det',
      textRecognitionModelName:'PP-OCRv5_mobile_rec',
      ortOptions:{
        backend:'wasm',
        wasmPaths:'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
        numThreads:1,
        simd:true
      }
    });
    return S.paddleOCR;
  };

  S.paddleReadMany = async (images) => {
    const ocr=await S.initPaddleOCR();
    const results=await ocr.predict(images,{textRecScoreThresh:0.18,textDetBoxThresh:0.25,textDetThresh:0.20});
    return results.map(r=>({
      text:(r.items||[]).map(i=>i.text||'').join('\n'),
      confidence:(r.items||[]).length ? Math.max(...r.items.map(i=>Number(i.score)||0))*100 : 0,
      items:r.items||[]
    }));
  };

  async function initSAM(){
    if(S.samModel && S.samProcessor && S.RawImage) return;
    $('samStatus').textContent='Loading AI…';
    const hf=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
    const {SamModel,AutoProcessor,RawImage}=hf;
    if(!SamModel||!AutoProcessor||!RawImage) throw new Error('Segmentation library did not load');
    const modelId='Xenova/sam-vit-base';
    S.samProcessor=await AutoProcessor.from_pretrained(modelId);
    try{
      S.samModel=await SamModel.from_pretrained(modelId,{dtype:'q8',device:navigator.gpu?'webgpu':'wasm'});
    }catch(err){
      console.warn('WebGPU SAM failed; retrying WASM',err);
      S.samModel=await SamModel.from_pretrained(modelId,{dtype:'q8'});
    }
    S.RawImage=RawImage;
    $('samStatus').textContent='AI ready';
    $('samStatus').className='chip accent';
  }

  function trimAlpha(canvas){
    const g=canvas.getContext('2d',{willReadFrequently:true}), im=g.getImageData(0,0,canvas.width,canvas.height),d=im.data,w=canvas.width,h=canvas.height;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let p=0;p<w*h;p++) if(d[p*4+3]>16){ const x=p%w,y=(p/w)|0; if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y; }
    if(x1<0) return null;
    const pad=Math.max(4,Math.round(Math.max(w,h)*.012)); x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
    const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(canvas,x0,y0,o.width,o.height,0,0,o.width,o.height);return o;
  }

  S.segmentAtPoint = async (img,x,y,kind='subject') => {
    await initSAM();
    $('samStatus').textContent=`Finding ${kind}…`;
    const c=document.createElement('canvas');
    const max=900, iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, scale=Math.min(1,max/Math.max(iw,ih));
    c.width=Math.max(1,Math.round(iw*scale));c.height=Math.max(1,Math.round(ih*scale));
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const sx=x*scale, sy=y*scale;
    const raw=S.RawImage.fromCanvas(c);
    const inputs=await S.samProcessor(raw,{input_points:[[[sx,sy]]],input_labels:[[[1]]]});
    const outputs=await S.samModel(inputs);
    const masks=await S.samProcessor.post_process_masks(outputs.pred_masks,inputs.original_sizes,inputs.reshaped_input_sizes);
    const tensor=masks[0];
    const scores=Array.from(outputs.iou_scores.data||[]);
    let best=0; for(let i=1;i<scores.length;i++) if(scores[i]>scores[best]) best=i;
    const dims=tensor.dims||[]; const H=dims[dims.length-2], W=dims[dims.length-1], channels=dims.length>=3?dims[dims.length-3]:1;
    const data=tensor.data; const plane=H*W; const offset=Math.min(best,Math.max(0,channels-1))*plane;
    const out=document.createElement('canvas');out.width=W;out.height=H;const g=out.getContext('2d',{willReadFrequently:true});g.drawImage(c,0,0,W,H);
    const im=g.getImageData(0,0,W,H),d=im.data;
    for(let p=0;p<plane;p++){ const keep=!!data[offset+p]; d[p*4+3]=keep?255:0; }
    g.putImageData(im,0,0);
    const trimmed=trimAlpha(out);
    if(!trimmed) throw new Error('No subject mask found');
    $('samStatus').textContent='AI ready';
    return trimmed;
  };
})();
