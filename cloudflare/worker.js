const MODEL = 'gpt-5.6-terra';
const IMAGE_MODEL = 'gpt-image-2.5-sunburst-2026-09-08';
const INPUT_USD_PER_MILLION = 2.00;
const OUTPUT_USD_PER_MILLION = 12.00;

function cors(origin, allowed) {
  const ok = origin === allowed;
  return {
    'access-control-allow-origin': ok ? origin : allowed,
    'access-control-allow-methods': 'POST, OPTIONS, GET',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin',
    'content-type': 'application/json; charset=utf-8'
  };
}
function json(body,status,headers){return new Response(JSON.stringify(body),{status,headers});}
function outputText(data){
  if(typeof data.output_text==='string'&&data.output_text)return data.output_text;
  for(const item of data.output||[]){if(item.type!=='message')continue;for(const c of item.content||[]){if(c.type==='output_text'&&typeof c.text==='string')return c.text;}}
  return '';
}
function imageResult(data){
  for(const item of data.output||[]) if(item.type==='image_generation_call'&&typeof item.result==='string'&&item.result) return item.result;
  return '';
}
function monthKey(){return new Date().toISOString().slice(0,7);}
function dayKey(){return new Date().toISOString().slice(0,10);}
async function digest(text){
  const bytes=new TextEncoder().encode(text||'unknown'),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].slice(0,10).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function parseAndAuthorize(request,env,headers,allowedOrigin,maxImageChars=12_000_000){
  const origin=request.headers.get('origin')||'';
  if(origin!==allowedOrigin)return {error:json({error:'Origin not allowed'},403,headers)};
  if(!env.OPENAI_API_KEY)return {error:json({error:'OPENAI_API_KEY is not configured on the Worker.'},503,headers)};
  if(!env.USAGE)return {error:json({error:'USAGE KV binding is required so usage limits cannot be bypassed.'},503,headers)};
  let body;try{body=await request.json();}catch{return {error:json({error:'Invalid JSON body.'},400,headers)};}
  if(env.REQUIRE_ACCESS_CODE==='true'){
    if(!env.ACCESS_CODE)return {error:json({error:'ACCESS_CODE is required but not configured.'},503,headers)};
    if(body.accessCode!==env.ACCESS_CODE)return {error:json({error:'Incorrect AI access code.'},401,headers)};
  }
  if(typeof body.image!=='string'||!body.image.startsWith('data:image/'))return {error:json({error:'A profile image is required.'},400,headers)};
  if(body.image.length>maxImageChars)return {error:json({error:'Image is too large.'},413,headers)};
  return {body};
}

export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'';
    const allowedOrigin=env.ALLOWED_ORIGIN||'https://rgarn023.github.io';
    const headers=cors(origin,allowedOrigin);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/health'){
      return json({ok:true,model:MODEL,imageModel:IMAGE_MODEL,budgetGuard:!!env.USAGE,apiKeyConfigured:!!env.OPENAI_API_KEY,accessCodeConfigured:!!env.ACCESS_CODE,publicMode:env.REQUIRE_ACCESS_CODE!=='true',subjectGeneration:true},200,headers);
    }
    if(request.method!=='POST'||!['/analyze','/subject'].includes(url.pathname))return json({error:'Not found'},404,headers);

    const auth=await parseAndAuthorize(request,env,headers,allowedOrigin,url.pathname==='/subject'?8_500_000:12_000_000);
    if(auth.error)return auth.error;
    const body=auth.body;
    const ipHash=await digest(request.headers.get('CF-Connecting-IP')||'unknown');

    if(url.pathname==='/subject'){
      const monthlyKey=`subject-count:${monthKey()}`,monthlyLimit=Math.max(1,Number(env.MAX_MONTHLY_SUBJECT_GENERATIONS||'8'));
      const monthlyUsed=Number(await env.USAGE.get(monthlyKey)||'0');
      if(monthlyUsed>=monthlyLimit)return json({error:`Monthly AI character-generation limit reached (${monthlyLimit}).`},429,headers);
      const dailyKey=`subject-rate:${dayKey()}:${ipHash}`,dailyLimit=Math.max(1,Number(env.MAX_DAILY_SUBJECT_GENERATIONS_PER_IP||'2'));
      const dailyUsed=Number(await env.USAGE.get(dailyKey)||'0');
      if(dailyUsed>=dailyLimit)return json({error:'Daily AI character-generation limit reached for this device/network.'},429,headers);

      const buddy=typeof body.buddyName==='string'&&body.buddyName.trim()?body.buddyName.trim():'the visible buddy';
      const prompt=`Recreate ONLY the trainer avatar and buddy from this Pokemon GO profile reference as one clean transparent-background subject layer. This is for a custom trainer card, not a screenshot recreation. Preserve the trainer's visible face/hair, skin tone, clothing design and ORIGINAL clothing colors, footwear and accessories as closely as possible. Preserve the buddy's visible species/design, colors and distinctive details as closely as possible (${buddy}). DO NOT recolor either subject to match Valor, Mystic, Instinct, red, blue or yellow. LOCKED COMPOSITION: buddy is large behind-left; trainer is foreground right-center in a confident upright stance; preserve the same relative overlap and scale every time. Show the complete visible bodies with comfortable transparent padding. No text, no card frame, no team emblem, no scenery, no UI, no extra characters, and no opaque background.`;

      const openai=await fetch('https://api.openai.com/v1/responses',{
        method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},
        body:JSON.stringify({
          model:MODEL,store:false,reasoning:{effort:'low'},tool_choice:'required',max_tool_calls:1,
          tools:[{type:'image_generation',model:IMAGE_MODEL,action:'edit',background:'transparent',input_fidelity:'high',quality:'medium',size:'1024x1536',output_format:'png'}],
          input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:body.image,detail:'high'}]}]
        })
      });
      const data=await openai.json().catch(()=>({}));
      if(!openai.ok)return json({error:data?.error?.message||'OpenAI character generation failed.'},openai.status||502,headers);
      const b64=imageResult(data);
      if(!b64)return json({error:'OpenAI did not return a generated character image.'},502,headers);
      await env.USAGE.put(monthlyKey,String(monthlyUsed+1),{expirationTtl:60*60*24*45});
      await env.USAGE.put(dailyKey,String(dailyUsed+1),{expirationTtl:60*60*48});
      return json({imageBase64:b64,model:IMAGE_MODEL,monthlyRemaining:Math.max(0,monthlyLimit-monthlyUsed-1)},200,headers);
    }

    const budget=Math.max(.05,Number(env.MAX_MONTHLY_USD||'.90'));
    const spendKey=`openai-spend:${monthKey()}`,priorSpend=Number(await env.USAGE.get(spendKey)||'0');
    if(priorSpend>=budget)return json({error:`Monthly AI budget reached ($${budget.toFixed(2)}).`,remainingBudget:0},402,headers);
    const rateKey=`openai-rate:${dayKey()}:${ipHash}`,dailyLimit=Math.max(1,Number(env.MAX_DAILY_REQUESTS_PER_IP||'16'));
    const usedToday=Number(await env.USAGE.get(rateKey)||'0');
    if(usedToday>=dailyLimit)return json({error:'Daily AI scan limit reached for this device/network. Try again tomorrow.'},429,headers);
    await env.USAGE.put(rateKey,String(usedToday+1),{expirationTtl:60*60*48});

    const schema={
      type:'object',additionalProperties:false,
      properties:{
        trainerName:{type:['string','null']},level:{type:['integer','null']},buddyName:{type:['string','null']},pokemonCaught:{type:['integer','null']},pokeStopsVisited:{type:['integer','null']},totalXP:{type:['integer','null']},startDate:{type:['string','null']},
        team:{type:'string',enum:['valor','mystic','instinct','unknown']},
        confidence:{type:'object',additionalProperties:false,properties:{trainerName:{type:'number',minimum:0,maximum:1},level:{type:'number',minimum:0,maximum:1},buddyName:{type:'number',minimum:0,maximum:1},pokemonCaught:{type:'number',minimum:0,maximum:1},pokeStopsVisited:{type:'number',minimum:0,maximum:1},totalXP:{type:'number',minimum:0,maximum:1},startDate:{type:'number',minimum:0,maximum:1},team:{type:'number',minimum:0,maximum:1}},required:['trainerName','level','buddyName','pokemonCaught','pokeStopsVisited','totalXP','startDate','team']},
        trainerBox:{type:['object','null'],additionalProperties:false,properties:{x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'}},required:['x','y','width','height']},
        buddyBox:{type:['object','null'],additionalProperties:false,properties:{x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'}},required:['x','y','width','height']}
      },required:['trainerName','level','buddyName','pokemonCaught','pokeStopsVisited','totalXP','startDate','team','confidence','trainerBox','buddyBox']
    };
    const prompt=`You are reading a Pokemon GO ME/profile screenshot for a trainer-card maker. Copy visible text exactly; never infer missing values. The image may be either the untouched full screenshot or a verification sheet containing the same screenshot plus labeled enlarged crops. Use enlarged crops to verify exact characters and digits when present. Extract: trainer username with exact capitalization/digits, displayed buddy Pokemon name/species, trainer level, Pokemon Caught, PokeStops Visited, Total XP, Start Date, and team (Valor/Mystic/Instinct/unknown). Activity values must come from the Total Activity section, not unrelated numbers. For a normal full screenshot, return tight normalized 0-1 bounding boxes relative to the ENTIRE image for the visible trainer avatar and visible buddy Pokemon. Include the complete visible subject, not text/UI. If the image is a verification sheet or a subject box is uncertain, return null for that box. If any text field is uncertain, return null rather than guessing and lower confidence.`;

    const openai=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},
      body:JSON.stringify({model:MODEL,store:false,reasoning:{effort:'low'},max_output_tokens:500,text:{verbosity:'low',format:{type:'json_schema',name:'pokemon_go_profile',strict:true,schema}},input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:body.image,detail:'high'}]}]})
    });
    const data=await openai.json().catch(()=>({}));
    if(!openai.ok)return json({error:data?.error?.message||'OpenAI request failed.'},openai.status||502,headers);
    let profile;try{profile=JSON.parse(outputText(data));}catch{return json({error:'OpenAI returned an unreadable response.'},502,headers);}
    const inputTokens=Number(data?.usage?.input_tokens||0),outputTokens=Number(data?.usage?.output_tokens||0);
    const requestCost=(inputTokens/1_000_000)*INPUT_USD_PER_MILLION+(outputTokens/1_000_000)*OUTPUT_USD_PER_MILLION;
    const newSpend=priorSpend+requestCost;await env.USAGE.put(spendKey,String(newSpend),{expirationTtl:60*60*24*45});
    return json({profile,usage:{inputTokens,outputTokens,estimatedRequestCost:requestCost},estimatedMonthlySpend:newSpend,remainingBudget:Math.max(0,budget-newSpend),model:MODEL},200,headers);
  }
};
