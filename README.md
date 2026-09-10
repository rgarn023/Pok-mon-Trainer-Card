# Trainer Card Studio

Mobile-first trainer card creator for Pokémon GO profile screenshots.

## v7

- Upload a full **ME / Trainer Profile** screenshot.
- Automatically detect Valor, Mystic, or Instinct and theme the app/card.
- Profile-layout-specific OCR for trainer name, buddy, level, Pokémon caught, PokéStops visited, Total XP, and start date.
- Wider trainer + buddy capture and corrected browser background-removal loading.
- Manual zoom and positioning for the trainer/buddy layer.
- Upload a **Trainer Code** screenshot to detect the 12-digit trainer code and QR code.
- Click/tap the card to flip between a front profile card and a back QR/trainer-code card.
- Export the currently visible side as a high-resolution PNG.
- Data stays in the browser session.

## GitHub Pages

This repository is designed to be served directly from the `main` branch root with GitHub Pages.

The v7 service worker uses a new cache version and network-first loading so deployments do not remain stuck on an older cached app version.

## Notes

OCR and automated image extraction are best-effort and every detected field remains editable. QR detection uses the browser's BarcodeDetector when available, with jsQR fallback. The trainer/buddy transparent cutout uses `@imgly/background-removal` when the browser can load and run the model.
