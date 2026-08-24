# Budgard brand mark

Budgard uses a frontal **open wallet with a budget card**. The card rising from
the opening makes the money object explicit; the low, wide clasp reads as a
wallet pocket rather than a camera lens. Its orange dash echoes the app's
safe-to-spend accent without turning the whole identity into ambient colour.

## Palette

- Ledger ink: `#171717`
- Paper: `#FFFFFF`
- Safe-to-spend orange: `#FF8300`

The full-colour app icon uses all three. The in-product mark and notification
badge stay monochrome so they can sit cleanly on either app surface and work as
a pinned-tab or system badge.

## Source artwork

| Asset | Purpose |
| --- | --- |
| `public/brand/budgard-mark.svg` | Canonical dark mark for light surfaces. |
| `public/brand/budgard-mark-reversed.svg` | White mark for dark surfaces and exports. |
| `public/brand/app-icon.svg` | Full-bleed web/PWA app icon source. Do not add rounded corners. |
| `public/brand/app-icon-maskable.svg` | Android maskable source with a protected safe zone. |
| `public/brand/icon-layers/*.svg` | Background, card, wallet, and accent layers for future Icon Composer/Xcode import. |
| `public/favicon.svg` | Small-size redraw with sturdier gaps and radii. |
| `public/og-image.svg` | Editable social-preview source. |
| `design/brand/launch-light.svg` | Plain light first-frame source. |
| `design/brand/launch-dark.svg` | Plain dark first-frame source. |
| `design/brand/render-svg.swift` | Deterministic SVG-to-PNG renderer. |
| `design/brand/generate-assets.zsh` | Regenerates every raster export and launch image. |

The icon is flat, frontal, and deliberately simple. It has no baked-in outer
mask, shadow, highlight, blur, translucency, gradient, or fake glass. Apple
recommends this kind of opaque vector input for its current icon system, then
applies system materials and masks itself. A PWA cannot ship Icon Composer's
native appearance variants, so Budgard supplies one robust opaque
`apple-touch-icon.png`; WebKit gives that file precedence for an installed web
app. The separated SVG layers remain ready for a future native wrapper.

## Generated assets

| Asset | Size | Notes |
| --- | --- | --- |
| `public/apple-touch-icon.png` | 180×180 | Canonical iOS Home Screen icon. |
| `public/icon-192x192.png`, `icon-512x512.png` | 192, 512 | Standard PWA icons. |
| `public/icon-192x192-maskable.png`, `icon-512x512-maskable.png` | 192, 512 | Dedicated maskable PWA icons. |
| `public/notification-badge.png` | 96×96 | Transparent monochrome push-notification badge. |
| `public/favicon.ico` | 64×64 | Legacy browser fallback. |
| `public/og-image.png` | 1200×630 | Raster social card. |
| `public/splash/*.jpg` | 80 files | 40 device/orientation sizes in light and dark appearances. |

The iOS launch images are intentionally unbranded. Apple's current launch
guidance says a launch screen should downplay itself and approximate the app's
first frame, not behave like a branding screen. Budgard therefore uses a plain
white field in light appearance and the app's `#0F0F0F` surface in dark
appearance. `plugins/brandAssets.ts` generates all 80 media-qualified links,
including `prefers-color-scheme`, from one device table. The manifest
`background_color` likewise comes from the light background token rather than
the logo's ink field.

`plugins/brandAssets.ts` hashes the vector sources, layer sources, and generated
files, then adds the derived revision to every public brand URL. This is
load-bearing: iOS and the CDN can otherwise retain an older icon or launch
image at an unchanged path. Do not hand-write a revision.

## Regenerating exports

Run the single deterministic command after changing any source artwork:

```sh
npm run brand:generate
```

The script compiles the renderer into the temporary directory, writes all icon
and social exports, replaces the 40 light launch images, and creates their 40
dark counterparts. Run `npm run build` afterward so the manifest colours and
asset revisions are regenerated too.

`design/brand/budgard-icon-source.png` is the superseded raster experiment and
does not ship.
