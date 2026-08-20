# Budgard brand mark

Budgard uses a monochrome **ledger wallet**: the wallet silhouette signals
personal finance, while the two cut-out transaction rows make expense tracking
visible without adding a chart, coin, or currency symbol.

## Palette

- Ledger ink: `#1B1613`
- Paper: `#FFFFFF`

These are deliberately the only two colours in the identity. App accent themes
remain product UI, not logo artwork.

## Source artwork

| Asset | Purpose |
| --- | --- |
| `public/brand/budgard-mark.svg` | Canonical dark mark for light surfaces. |
| `public/brand/budgard-mark-reversed.svg` | White mark for dark surfaces and exports. |
| `public/brand/app-icon.svg` | Full-bleed web/PWA app icon source. Do not add rounded corners. |
| `public/brand/app-icon-maskable.svg` | Android maskable source with a larger safe zone. |
| `public/brand/icon-layers/*.svg` | Background and foreground layers for future Icon Composer/Xcode import. |
| `public/favicon.svg` | Browser favicon with its own small-size mask. |
| `public/og-image.svg` | Editable social-preview source. |
| `design/brand/render-svg.swift` | Deterministic SVG-to-PNG renderer with transparent and opaque modes. |

The icon artwork is flat on purpose. iOS 27 applies its own corner mask and
Liquid Glass appearance, so the source contains no baked-in mask, highlight,
shadow, blur, translucency, or gradient. The symbol geometry stays identical
across the default, dark, clear, and tinted appearances. WebKit currently uses
the opaque `apple-touch-icon.png` for an installed PWA; the separated SVG
layers are included as future-ready native artwork, not linked web variants.

`design/brand/budgard-icon-source.png` is the superseded raster experiment and
does not ship.

## Generated assets

| Asset | Size | Notes |
| --- | --- | --- |
| `public/apple-touch-icon.png` | 180×180 | Canonical iOS Home Screen icon. |
| `public/icon-192x192.png`, `icon-512x512.png` | 192, 512 | Standard PWA icons. |
| `public/icon-192x192-maskable.png`, `icon-512x512-maskable.png` | 192, 512 | Dedicated maskable PWA icons. |
| `public/notification-badge.png` | 96×96 | Transparent monochrome push-notification badge. |
| `public/favicon.ico` | 64×64 | Legacy browser fallback. |
| `public/og-image.png` | 1200×630 | Raster social card. |
| `public/splash/*.jpg` | 40 files | Black iOS launch screens with the white mark centred. |

`manifest.json`'s `background_color` is generated from the light theme's
foreground token, which is the same `#1B1613` field used by the icon and launch
screens.

Compile the renderer once, then use `opaque` for assets that must never expose
an alpha channel (especially `apple-touch-icon.png`):

```sh
swiftc design/brand/render-svg.swift -o /tmp/budgard-render-svg
/tmp/budgard-render-svg public/brand/app-icon.svg public/apple-touch-icon.png 180 180 opaque
/tmp/budgard-render-svg public/brand/budgard-mark.svg public/notification-badge.png 96 96
```

## Regenerating iOS launch screens

The launch screens place the installed icon on its matching full-bleed field.
The field disappears into the icon, leaving only the white wallet visible. Use
an icon at 46% of the short side and JPEG quality 90:

```sh
for f in public/splash/*.jpg; do
  W=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  SHORT=$(( W < H ? W : H )); ICON=$(( SHORT * 46 / 100 ))
  sips -z $ICON $ICON public/icon-512x512.png --out /tmp/budgard-mark.png
  sips -p $H $W --padColor 1B1613 /tmp/budgard-mark.png --out /tmp/budgard-padded.png
  sips -s format jpeg -s formatOptions 90 /tmp/budgard-padded.png --out "$f"
done
```

Order matters: `-s format jpeg` is ignored if combined with `-p` in one call.
