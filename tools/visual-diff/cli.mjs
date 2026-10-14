#!/usr/bin/env node
// pnpm qa:diff <reference.png> <actual.png> [--out diff.png] [--crop-ref 4] [--crop-actual 0]
//              [--offset-ref x,y] [--offset-actual x,y] [--threshold 0.1] [--max-ratio 0.05] [--json]
// Prints the share of differing pixels, the most different horizontal bands and writes a diff image.
// Exit code 1 when --max-ratio is given and exceeded.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { diffPng } from './lib/diff.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    'crop-ref': { type: 'string', default: '0' },
    'crop-actual': { type: 'string', default: '0' },
    'offset-ref': { type: 'string', default: '0,0' },
    'offset-actual': { type: 'string', default: '0,0' },
    threshold: { type: 'string', default: '0.1' },
    'max-ratio': { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});
const [refPath, actPath] = positionals;
if (!refPath || !actPath) {
  console.error('usage: pnpm qa:diff <reference.png> <actual.png> [--out diff.png] [--crop-ref N] …');
  process.exit(2);
}
/** @param {string} name @param {string} v */
const num = (name, v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`qa:diff: --${name} must be a non-negative number, got "${v}"`);
    process.exit(2);
  }
  return n;
};
/** @param {string} name @param {string} v */
const pair = (name, v) => {
  const [x = '0', y = '0'] = v.split(',');
  return { offsetX: num(name, x), offsetY: num(name, y) };
};

const options = {
  reference: { crop: num('crop-ref', values['crop-ref']), ...pair('offset-ref', values['offset-ref']) },
  actual: {
    crop: num('crop-actual', values['crop-actual']),
    ...pair('offset-actual', values['offset-actual']),
  },
  threshold: num('threshold', values.threshold),
};
const max = values['max-ratio'] === undefined ? undefined : num('max-ratio', values['max-ratio']);
const result = diffPng(readFileSync(refPath), readFileSync(actPath), options);
if (values.out) writeFileSync(values.out, result.png);

const pct = (/** @type {number} */ r) => `${(r * 100).toFixed(2)}%`;
const worst = [...result.bands]
  .filter((b) => b.ratio > 0)
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 5);
if (values.json) {
  const { png: _png, ...rest } = result;
  console.log(JSON.stringify({ ...rest, worst }, null, 2));
} else {
  const [rw, rh] = result.sizes.reference;
  const [aw, ah] = result.sizes.actual;
  console.log(`compared ${result.width}×${result.height} (reference ${rw}×${rh}, actual ${aw}×${ah})`);
  console.log(`different pixels: ${result.diffPixels} (${pct(result.ratio)})`);
  for (const b of worst) console.log(`  y ${b.y0}–${b.y1}: ${pct(b.ratio)}`);
  if (values.out) console.log(`diff image: ${values.out}`);
}
if (max !== undefined && result.ratio > max) process.exit(1);
