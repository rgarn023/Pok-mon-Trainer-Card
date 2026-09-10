# OpenAI Vision setup for Trainer Card Studio v13

The public GitHub Pages site must **not** contain an OpenAI API key. v13 uses a small Cloudflare Worker as the secure proxy.

## What v13 does

- Sends the uploaded profile screenshot to the Worker only when OpenAI Vision is configured.
- Worker calls `gpt-5.6-luna` with image input and strict JSON output.
- Returns Trainer Name, Level, Buddy, Team, Pokemon Caught, PokeStops Visited, Total XP, Start Date, confidence values, and optional trainer/buddy boxes.
- The OpenAI response is requested with `store: false`.
- If the Worker is not configured or an AI call fails, the site falls back to the existing local OCR.

## Cost protection

The Worker is intentionally coded to refuse OpenAI calls unless a Cloudflare Workers KV binding named `USAGE` exists. It tracks estimated GPT-5.6 Luna token cost for the current UTC month and stops new scans once the configured threshold is reached.

`cloudflare/wrangler.toml` defaults `MAX_MONTHLY_USD` to **0.90**, leaving some margin below $1. This is an application-side safeguard, not a guarantee against every billing edge case. Keep OpenAI prepaid auto-reload turned off as an additional safeguard.

## One-time setup

1. In the OpenAI API Platform, create a dedicated project for this Trainer Card app.
2. Add prepaid API credit. OpenAI currently requires a $5 minimum initial purchase. Turn **auto-reload off**.
3. Create a project API key. Do not put it in GitHub or the website.
4. Create a free Cloudflare account if needed.
5. In Cloudflare Workers & Pages, create a Worker named `pokemon-trainer-card-openai` and use the source in `cloudflare/worker.js`.
6. Create a Workers KV namespace and bind it to the Worker with binding name `USAGE`.
7. Add encrypted Worker secrets:
   - `OPENAI_API_KEY` = the OpenAI project key
   - `ACCESS_CODE` = a private password/code you choose for using the AI scanner
8. Add Worker variables:
   - `ALLOWED_ORIGIN` = `https://rgarn023.github.io`
   - `MAX_MONTHLY_USD` = `0.90`
9. Deploy the Worker.
10. Open the Trainer Card site. In the OpenAI Vision connection section, paste the Worker's HTTPS URL and your `ACCESS_CODE`, then press Save.

The site stores only the Worker URL and access code in the browser's local storage. The OpenAI API key remains server-side in Cloudflare.

## Worker URL example

If Cloudflare gives the Worker a URL such as:

`https://pokemon-trainer-card-openai.example.workers.dev`

enter exactly that base URL in the v13 form. The frontend automatically calls `/analyze`.
