// Pixel diff of two PNG screenshots (pixelmatch). Used by the visual-qa agent to compare a rendered
// prototype screen with its design reference (Figma render) or with another version.
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 * @typedef {{ crop?: number, offsetX?: number, offsetY?: number }} Side
 * @typedef {{
 *   width: number, height: number, diffPixels: number, ratio: number,
 *   sizes: { reference: [number, number], actual: [number, number] },
 *   bands: { y0: number, y1: number, ratio: number }[], png: Buffer
 * }} DiffResult
 */

/**
 * Copy a rectangle out of an RGBA image.
 * @param {PNG} img @param {Rect} r
 */
function cut(img, r) {
  const out = new PNG({ width: r.width, height: r.height });
  PNG.bitblt(img, out, r.x, r.y, r.width, r.height, 0, 0);
  return out;
}

/**
 * Compare two PNG buffers. The reference may carry a frame (a device border in Figma renders): `reference.crop`
 * trims that many pixels on every side. Both images are then aligned top-left (plus optional offsets) and
 * compared over their common area; a size difference is reported, not hidden.
 * @param {Buffer} referencePng
 * @param {Buffer} actualPng
 * @param {{ reference?: Side, actual?: Side, threshold?: number, bandHeight?: number }} [opts]
 * @returns {DiffResult}
 */
export function diffPng(referencePng, actualPng, opts = {}) {
  const ref = PNG.sync.read(referencePng);
  const act = PNG.sync.read(actualPng);
  const rs = opts.reference ?? {};
  const as = opts.actual ?? {};
  const rx = (rs.crop ?? 0) + (rs.offsetX ?? 0);
  const ry = (rs.crop ?? 0) + (rs.offsetY ?? 0);
  const ax = (as.crop ?? 0) + (as.offsetX ?? 0);
  const ay = (as.crop ?? 0) + (as.offsetY ?? 0);
  const width = Math.min(ref.width - rx - (rs.crop ?? 0), act.width - ax - (as.crop ?? 0));
  const height = Math.min(ref.height - ry - (rs.crop ?? 0), act.height - ay - (as.crop ?? 0));
  if (width <= 0 || height <= 0) throw new Error('visual-diff: images do not overlap after cropping');

  const a = cut(ref, { x: rx, y: ry, width, height });
  const b = cut(act, { x: ax, y: ay, width, height });
  const out = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, out.data, width, height, {
    threshold: opts.threshold ?? 0.1,
    includeAA: false,
    alpha: 0.2,
  });

  // Rows of the diff mask grouped in bands, so a reader can find where the screens diverge.
  const bandHeight = opts.bandHeight ?? 32;
  const bands = [];
  for (let y0 = 0; y0 < height; y0 += bandHeight) {
    const y1 = Math.min(height, y0 + bandHeight);
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // pixelmatch paints differing pixels pure red (255, 0, 0) by default
        if (out.data[i] === 255 && out.data[i + 1] === 0 && out.data[i + 2] === 0) n++;
      }
    }
    bands.push({ y0, y1, ratio: n / ((y1 - y0) * width) });
  }

  return {
    width,
    height,
    diffPixels,
    ratio: diffPixels / (width * height),
    sizes: { reference: [ref.width, ref.height], actual: [act.width, act.height] },
    bands,
    png: PNG.sync.write(out),
  };
}
