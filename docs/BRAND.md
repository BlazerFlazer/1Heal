# 1Heal brand

## The mark

A rounded leaf whose central vein forms a plus. Leaf = health, calm, nature; plus = care and
"one more": one subscription, many venues. It is an original shape built from arcs only (no font,
no copyrighted or borrowed form) and is drawn as a single even-odd path in a 256 x 256 box, so the
plus is a hole: the mark works in any single colour on any background and in monochrome.

Source of truth: `assets/brand/mark.svg`. The same path lives in `src/shared/brand/markPath.ts`
(a test fails if the two drift). Wordmark: the text `1Heal` set in Inter Bold, rendered by React
(`<Logo variant="lockup" />`), never baked into raster assets.

## Files

| File (assets/brand)       | Canvas | Use                                                            |
| ------------------------- | ------ | -------------------------------------------------------------- |
| `mark.svg`                | 256    | Mark only, transparent. In-app, docs, partners                 |
| `mark-on-white.svg`       | 256    | Mark on white, for previews and print                          |
| `icon-1024.svg`           | 1024   | iOS/App Store icon: mark centred on white, 18 % padding        |
| `adaptive-foreground.svg` | 1024   | Android foreground; mark inside the 66/108 dp safe-zone circle |
| `adaptive-background.svg` | 1024   | Android background, solid `#FFFFFF`                            |
| `adaptive-monochrome.svg` | 1024   | Android themed icon, mark in `#000000`                         |
| `splash-icon.svg`         | 512    | Splash image, transparent                                      |
| `favicon.svg`             | 64     | Web favicon, mark cropped tight                                |

## Clear space and minimum sizes

- Clear space around the mark: at least 0.25 x mark height on every side (the stem counts).
- Lockup: wordmark height 0.78 x mark height, gap 0.28 x mark height, tracking -2 %.
- Minimum mark size: 16 pt on screen (the plus stays visible down to 24 pt; below that only the
  leaf silhouette must read). Minimum lockup height: 24 pt. Never scale the mark non-uniformly.

## Colour

- Light theme: green-700 `#15803D` on white. Dark theme: green-400 `#4ADE80` on the dark surface.
- One colour at a time. Reverse (white mark) is allowed on green-700 and on photos with a scrim.
- In code the colour always comes from the theme (`useTheme().colors.primary`) or is passed to
  `<LogoMark color>` explicitly. Hex values live only in `src/shared/theme/tokens.ts`.

## Do / don't

- Do use `<Logo />` / `<LogoMark />` from `@/shared/brand`; do keep the plus as negative space.
- Don't rotate, outline, add gradients, shadows or a second colour, or put text inside the leaf.
- Don't redraw the plus as a filled cross and don't pair the mark with a red cross or any medical
  emblem (the plus is a vein, not a medical symbol).

## Regenerating raster assets

```bash
node scripts/generate-assets.mjs
```

Reads `assets/brand/*.svg`, renders with `@resvg/resvg-js` (no system fonts needed) and writes
`assets/images/{icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png`
(1024), `splash-icon.png` (512), `favicon.png` (64) and `mark-256.png`, then verifies every PNG
header and prints a size table. File names are referenced by `app.json`; do not rename them.
Edit the SVGs (or `markPath.ts` and re-emit), run the script, commit SVGs and PNGs together.
