const MODEL = 'gpt-5.6-luna';
const INPUT_USD_PER_MILLION = 0.20;
const OUTPUT_USD_PER_MILLION = 1.20;

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

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

function outputText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  for (const item of data.output || []) {
    if (item.type !== 'message') continue;
    for (const c of item.content || []) {
      if (c.type === 'output_text' && typeof c.text === 'string') return c.text;
    }
  }
  return '';
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://rgarn023.github.io';
    const headers = cors(origin, allowedOrigin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        model: MODEL,
        budgetGuard: !!env.USAGE,
        apiKeyConfigured: !!env.OPENAI_API_KEY,
        accessCodeConfigured: !!env.ACCESS_CODE
      }, 200, headers);
    }

    if (request.method !== 'POST' || url.pathname !== '/analyze') {
      return json({ error: 'Not found' }, 404, headers);
    }
    if (origin !== allowedOrigin) return json({ error: 'Origin not allowed' }, 403, headers);
    if (!env.OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY is not configured on the Worker.' }, 503, headers);
    if (!env.ACCESS_CODE) return json({ error: 'ACCESS_CODE is not configured on the Worker.' }, 503, headers);
    if (!env.USAGE) return json({ error: 'USAGE KV binding is required so the monthly budget guard cannot be bypassed.' }, 503, headers);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON body.' }, 400, headers); }

    if (body.accessCode !== env.ACCESS_CODE) return json({ error: 'Incorrect AI access code.' }, 401, headers);
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/')) {
      return json({ error: 'A profile screenshot is required.' }, 400, headers);
    }
    if (body.image.length > 10_000_000) return json({ error: 'Screenshot is too large.' }, 413, headers);

    const budget = Math.max(0.05, Number(env.MAX_MONTHLY_USD || '0.90'));
    const key = `openai-spend:${monthKey()}`;
    const priorSpend = Number(await env.USAGE.get(key) || '0');
    if (priorSpend >= budget) {
      return json({ error: `Monthly AI budget reached ($${budget.toFixed(2)}).`, remainingBudget: 0 }, 402, headers);
    }

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        trainerName: { type: ['string','null'] },
        level: { type: ['integer','null'] },
        buddyName: { type: ['string','null'] },
        pokemonCaught: { type: ['integer','null'] },
        pokeStopsVisited: { type: ['integer','null'] },
        totalXP: { type: ['integer','null'] },
        startDate: { type: ['string','null'] },
        team: { type: 'string', enum: ['valor','mystic','instinct','unknown'] },
        confidence: {
          type: 'object', additionalProperties: false,
          properties: {
            trainerName: {type:'number',minimum:0,maximum:1}, level:{type:'number',minimum:0,maximum:1},
            buddyName:{type:'number',minimum:0,maximum:1}, pokemonCaught:{type:'number',minimum:0,maximum:1},
            pokeStopsVisited:{type:'number',minimum:0,maximum:1}, totalXP:{type:'number',minimum:0,maximum:1},
            startDate:{type:'number',minimum:0,maximum:1}, team:{type:'number',minimum:0,maximum:1}
          },
          required:['trainerName','level','buddyName','pokemonCaught','pokeStopsVisited','totalXP','startDate','team']
        },
        trainerBox: {
          type:['object','null'], additionalProperties:false,
          properties:{x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'}},
          required:['x','y','width','height']
        },
        buddyBox: {
          type:['object','null'], additionalProperties:false,
          properties:{x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'}},
          required:['x','y','width','height']
        }
      },
      required:['trainerName','level','buddyName','pokemonCaught','pokeStopsVisited','totalXP','startDate','team','confidence','trainerBox','buddyBox']
    };

    const prompt = `Read this Pokemon GO ME/profile screenshot exactly. Extract only values visibly present in the screenshot. Do not guess or infer missing values. Preserve the exact trainer username capitalization and digits. Buddy name must be the displayed buddy Pokemon species/name, not CP or a nearby UI label. Pokemon Caught, PokeStops Visited, Total XP, and Start Date must come from the Total Activity area. Team must be Valor, Mystic, Instinct, or unknown based on the visible profile UI. If any field cannot be read confidently, return null for that field and lower its confidence. Also estimate normalized 0-1 bounding boxes for the visible trainer avatar and buddy Pokemon; use null if uncertain.`;

    const openai = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        reasoning: { effort: 'none' },
        max_output_tokens: 450,
        text: {
          verbosity: 'low',
          format: { type:'json_schema', name:'pokemon_go_profile', strict:true, schema }
        },
        input: [{
          role: 'user',
          content: [
            { type:'input_text', text: prompt },
            { type:'input_image', image_url: body.image, detail:'high' }
          ]
        }]
      })
    });

    const data = await openai.json().catch(() => ({}));
    if (!openai.ok) {
      const message = data?.error?.message || 'OpenAI request failed.';
      return json({ error: message }, openai.status || 502, headers);
    }

    let profile;
    try { profile = JSON.parse(outputText(data)); }
    catch { return json({ error: 'OpenAI returned an unreadable response.' }, 502, headers); }

    const inputTokens = Number(data?.usage?.input_tokens || 0);
    const outputTokens = Number(data?.usage?.output_tokens || 0);
    const requestCost = (inputTokens / 1_000_000) * INPUT_USD_PER_MILLION + (outputTokens / 1_000_000) * OUTPUT_USD_PER_MILLION;
    const newSpend = priorSpend + requestCost;
    await env.USAGE.put(key, String(newSpend), { expirationTtl: 60 * 60 * 24 * 45 });

    return json({
      profile,
      usage: { inputTokens, outputTokens, estimatedRequestCost: requestCost },
      estimatedMonthlySpend: newSpend,
      remainingBudget: Math.max(0, budget - newSpend),
      model: MODEL
    }, 200, headers);
  }
};