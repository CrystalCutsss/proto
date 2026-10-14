import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import { diffPng } from '../lib/diff.mjs';

/**
 * Solid image with an optional filled square.
 * @param {number} w @param {number} h @param {number[]} rgb
 * @param {{ x: number, y: number, size: number, rgb: number[] }} [square]
 */
function image(w, h, rgb, square) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside =
        square && x >= square.x && x < square.x + square.size && y >= square.y && y < square.y + square.size;
      const [r = 0, g = 0, b = 0] = inside ? square.rgb : rgb;
      png.data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return PNG.sync.write(png);
}

const white = [255, 255, 255];
const black = [0, 0, 0];

test('identical images do not differ', () => {
  const r = diffPng(image(40, 40, white), image(40, 40, white));
  assert.equal(r.diffPixels, 0);
  assert.equal(r.ratio, 0);
});

test('counts differing pixels and locates them in bands', () => {
  const r = diffPng(image(40, 64, white), image(40, 64, white, { x: 0, y: 40, size: 10, rgb: black }), {
    bandHeight: 32,
  });
  assert.equal(r.diffPixels, 100);
  assert.equal(r.bands[0]?.ratio, 0);
  assert.ok((r.bands[1]?.ratio ?? 0) > 0);
  assert.ok(PNG.sync.read(r.png).width === 40);
});

test('crops a device frame from the reference and reports size differences', () => {
  // reference: 48×48 with a 4 px black frame around a white 40×40 screen
  const framed = image(48, 48, black, { x: 4, y: 4, size: 40, rgb: white });
  const r = diffPng(framed, image(40, 50, white), { reference: { crop: 4 } });
  assert.equal(r.width, 40);
  assert.equal(r.height, 40);
  assert.equal(r.diffPixels, 0);
  assert.deepEqual(r.sizes, { reference: [48, 48], actual: [40, 50] });
});

test('rejects images that do not overlap', () => {
  assert.throws(() => diffPng(image(8, 8, white), image(8, 8, white), { reference: { crop: 4 } }));
});
