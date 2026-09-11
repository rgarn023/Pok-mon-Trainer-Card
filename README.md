# Trainer Card Studio

Mobile-first, non-generative trainer card editor for Pokémon GO profile screenshots.

## v23

- Upload a full **ME / Trainer Profile** screenshot.
- Local browser OCR attempts to fill trainer name, buddy name, level, Pokémon caught, PokéStops visited, Total XP, and start date.
- OCR is only a convenience: every field remains editable, and uncertain reads are marked **Review** rather than being replaced with a guessed identity.
- No OpenAI or generative image service is used by the production page.
- Team selection is guessed locally from screenshot colors and can always be overridden manually.
- Trainer + buddy foreground removal uses the actual screenshot pixels. It does not redraw, recolor, invent, or replace the characters.
- Locked Valor, Mystic, and Instinct backgrounds remain the card artwork.
- Background position, background zoom, ground/contact line, and subject position can be adjusted so the screenshot foreground fits the scene.
- Upload a **Trainer Code** screenshot to detect the 12-digit code and QR code locally.
- Tap the card to flip between front and back.
- Export the current side as a high-resolution PNG or the optional animated team-effect version.

## Privacy / processing

Profile OCR, team detection, QR detection, card rendering, and editing run in the browser. The production page does not send the profile screenshot to OpenAI. The foreground-removal library is loaded in the browser and returns a cutout made from the original uploaded pixels.

## GitHub Pages

The app is served directly from the repository through GitHub Pages.

## Notes

OCR and automatic foreground removal are best-effort. Users should review the extracted text and can manually reposition the foreground/background before exporting. QR detection uses the browser `BarcodeDetector` when available, with `jsQR` fallback.
