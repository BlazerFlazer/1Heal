#!/usr/bin/env node
/**
 * Rasterises the brand SVGs in assets/brand into the PNGs referenced by app.json.
 *
 *   node scripts/generate-assets.mjs
 *
 * The SVGs are mark-only (no text), so no font is needed at raster time.
 * Every output is verified by reading the PNG IHDR header back from disk.
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = resolve(ROOT, 'assets/brand');
const IMAGES_DIR = resolve(ROOT, 'assets/images');

/** @type {{ source: string; output: string; size: number }[]} */
const TARGETS = [
  { source: 'icon-1024.svg', output: 'icon.png', size: 1024 },
  { source: 'adaptive-foreground.svg', output: 'android-icon-foreground.png', size: 1024 },
  { source: 'adaptive-background.svg', output: 'android-icon-background.png', size: 1024 },
  { source: 'adaptive-monochrome.svg', output: 'android-icon-monochrome.png', size: 1024 },
  { source: 'splash-icon.svg', output: 'splash-icon.png', size: 512 },
  { source: 'favicon.svg', output: 'favicon.png', size: 64 },
  { source: 'mark.svg', output: 'mark-256.png', size: 256 },
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads width/height from the IHDR chunk, which always follows the 8-byte signature. */
function readPngSize(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function render(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });
  let failed = false;

  for (const { source, output, size } of TARGETS) {
    const svg = readFileSync(resolve(BRAND_DIR, source), 'utf8');
    const outputPath = resolve(IMAGES_DIR, output);
    writeFileSync(outputPath, render(svg, size));

    const { width, height } = readPngSize(outputPath);
    const ok = width === size && height === size;
    failed ||= !ok;
    process.stdout.write(
      `${ok ? 'ok  ' : 'FAIL'} ${output.padEnd(28)} ${width}x${height} (expected ${size}x${size}) <- ${source}\n`,
    );
  }

  if (failed) {
    console.error('Some assets have unexpected dimensions.');
    process.exit(1);
  }
}

main();
