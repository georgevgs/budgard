# Budgard brand mark

## What actually ships

The icons in `public/` are the **orange receipt mark**: a cream receipt with a
near-black tick on a full-bleed `#FB591E` field. The mint concept documented
below was an earlier direction and is **not** what ships — read the pixels, not
the prompt.

| Asset | Size | Notes |
| --- | --- | --- |
| `public/apple-touch-icon.png` | 180×180 | iOS Home Screen. Opaque RGB, no alpha, square to the edge, no pre-rounded corners — iOS applies its own mask and Liquid Glass over it. |
| `public/icon-192x192.png`, `icon-512x512.png` | 192, 512 | manifest `any` + `maskable`; content sits inside the central ~65%. |
| `public/splash/*.jpg` | 40 files | iOS launch screens, all referenced from `index.html`. |

Web apps cannot ship layered Icon Composer artwork or Dark/Clear/Tinted icon
variants — WebKit has no way to consume them, so a single flat opaque raster is
both the floor and the ceiling here. Nothing about iOS 26/27 Liquid Glass
changes what this repo can provide.

`manifest.json` `background_color` must match the icon field (`#FB591E`), or the
Android launch screen frames the icon in a contrasting square.

## Regenerating the launch screens

The splashes are the icon centred on a flat brand field — no glow, no seam.
Built with `sips` (no ImageMagick or Pillow needed), icon at 46% of the short
side, quality 88:

```sh
for f in public/splash/*.jpg; do
  W=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  SHORT=$(( W < H ? W : H )); ICON=$(( SHORT * 46 / 100 ))
  sips -z $ICON $ICON public/icon-512x512.png --out /tmp/mark.png
  sips -p $H $W --padColor FB591E /tmp/mark.png --out /tmp/padded.png
  sips -s format jpeg -s formatOptions 88 /tmp/padded.png --out "$f"
done
```

Order matters: `-s format jpeg` is ignored if combined with `-p` in one call,
and you get a PNG wearing a `.jpg` extension.

---

## Earlier mint concept (not shipped)

The source image in this folder was generated with Codex's built-in image generation tool, then resized for the PWA icons, social preview, and Apple launch screens.

## Production prompt

> Use case: logo-brand. Create a distinctive, minimal app icon for Budgard, a calm personal-finance companion. Build it around a single continuous protected-path symbol: a dark ink path curves upward and gently wraps around one small coral-orange circular marker representing today, suggesting both a financial trajectory and a protective guardrail. Use a full-bleed soft mint-green square background and keep essential details inside the central 70 percent for any and maskable PWA purposes. Render a crisp, flat, vector-like polished raster icon with precise geometry, generous negative space, and strokes thick enough to remain recognizable at 32 px. Palette: soft mint #BDE8CC, near-black #111411, and coral #FF6B48. No text, letters, numbers, wallet, coins, currency symbols, piggy bank, plant, mascot, chart bars, watermark, thin details, outer rounded-square outline, photographic treatment, or skeuomorphism.

## Background-extraction prompt

> Preserve the existing near-black protected-path symbol and coral marker exactly in shape, proportions, placement, stroke thickness, and color. Replace only the mint background with a perfectly flat #00FF00 chroma-key field with no gradient, texture, shadow, vignette, lighting variation, or color noise. Do not redraw, restyle, resize, rotate, move, crop, soften, or add to the mark. Keep crisp antialiased edges and generous padding. No text or watermark.

The extraction experiment was not used in production. The full-bleed source produced cleaner small icons, and its subtle center glow was retained on the launch and social assets.
