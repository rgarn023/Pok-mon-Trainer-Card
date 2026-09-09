# Pokémon Trainer Card Studio

Mobile-first web app for creating a collectible trainer card from a player profile screenshot.

## Current features

- Valor, Mystic, and Instinct card themes
- Automatic team detection with manual override
- Profile OCR for trainer details and activity statistics
- Trainer + buddy portrait capture and optional browser-side background removal
- Manual review/editing of every detected field
- Position/zoom controls for the imported trainer and buddy
- High-resolution PNG export
- Installable PWA shell when hosted over HTTPS
- Screenshot processing remains in the browser session

## Run locally

The app uses browser modules and OCR resources that behave best over HTTP/HTTPS rather than opening `index.html` through Android `content://`.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

This repository is structured to publish directly from the root of the `main` branch. In GitHub: **Settings → Pages → Deploy from a branch → main / (root)**.

Once Pages is enabled, the public site will be available at:

`https://rgarn023.github.io/Pok-mon-Trainer-Card/`

## Notes

OCR and foreground-removal models are loaded from public CDNs on first use, so those enhanced features require an internet connection. The profile screenshot itself is not uploaded by this app.
