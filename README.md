# Trainer Card Studio

Mobile-first, non-generative trainer card maker for Pokémon GO players.

## v24

The production page is a deterministic template editor. It does **not** generate card artwork with AI.

- Upload a full **ME / Trainer Profile** screenshot.
- Local browser OCR attempts to fill trainer name, buddy name, level, Pokémon caught, PokéStops visited, Total XP, and start date.
- Team is estimated locally from screenshot colors and can always be overridden manually.
- OCR is only a typing convenience. Every field remains editable, and uncertain text is marked for review rather than being replaced with a guessed identity.
- Upload your own trainer image and optional buddy image. The editor only crops, zooms, and repositions those files.
- No automatic foreground-removal model is used by the production page.
- Card backgrounds are **not image assets**. They are an original geometric design drawn with Canvas gradients, lines, rings, and shapes.
- Hue, color intensity, and brightness sliders let the user customize the card palette. Valor, Mystic, and Instinct provide default hues.
- Upload a Trainer Code screenshot to detect the 12-digit code and QR locally, or enter the code manually.
- Tap the card to flip between front and back.
- Export the current side as a high-resolution PNG.

## No generative AI

The active v24 page loads only:

- `tesseract.js` for local OCR
- `jsQR` / browser `BarcodeDetector` for QR reading
- `studio-v24.js` for deterministic editing and Canvas rendering

It does not load the old OpenAI client, subject-generation code, AI-generated background files, or automatic background-removal model.

## Design

The editor uses a familiar trainer-profile-card workflow—editable information, image slots, a strong team color, and a front/back card—but the visual design and Canvas background are original to this project rather than copies of another trainer card template.

## Privacy / processing

Profile OCR, team-color detection, QR detection, image cropping, and card rendering happen in the browser. User images are used as selected; they are not redrawn or replaced.

## GitHub Pages

The app is served directly from this repository through GitHub Pages.

## Disclaimer

Unofficial fan-made tool. Not affiliated with Niantic, The Pokémon Company, or Nintendo.
