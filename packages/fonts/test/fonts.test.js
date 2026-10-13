import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readFontInfo } from '../src/sfnt.js';

/**
 * Minimal SFNT with an OS/2 table (weight 500, given width class) and an optional fvar table.
 * @param {{ width: number, axes?: [string, number, number, number][] }} o
 */
function sfnt({ width, axes = [] }) {
  const os2 = Buffer.alloc(64);
  os2.writeUInt16BE(500, 4);
  os2.writeUInt16BE(width, 6);
  const tables = [['OS/2', os2]];
  if (axes.length) {
    const fvar = Buffer.alloc(16 + axes.length * 20);
    fvar.writeUInt16BE(1, 0);
    fvar.writeUInt16BE(16, 4);
    fvar.writeUInt16BE(axes.length, 8);
    fvar.writeUInt16BE(20, 10);
    axes.forEach(([tag, min, def, max], i) => {
      const a = 16 + i * 20;
      fvar.write(tag, a, 'latin1');
      [min, def, max].forEach((n, j) => fvar.writeInt32BE(n * 65536, a + 4 + j * 4));
    });
    tables.push(['fvar', fvar]);
  }
  const header = Buffer.alloc(12 + tables.length * 16);
  header.writeUInt32BE(0x00010000, 0);
  header.writeUInt16BE(tables.length, 4);
  let offset = header.length;
  tables.forEach(([tag, data], i) => {
    header.write(tag, 12 + i * 16, 'latin1');
    header.writeUInt32BE(offset, 12 + i * 16 + 8);
    header.writeUInt32BE(data.length, 12 + i * 16 + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...tables.map(([, data]) => data)]);
}

const SYSTEM_OTF = '/usr/share/fonts/opentype/inter/Inter-Thin.otf';
const css = readFileSync(new URL('../dist/fonts.css', import.meta.url), 'utf8');

describe('readFontInfo', () => {
  it.skipIf(
    !(() => {
      try {
        readFileSync(SYSTEM_OTF);
        return true;
      } catch {
        return false;
      }
    })(),
  )('reads family, weight and style from a real OTF', () => {
    const info = readFontInfo(readFileSync(SYSTEM_OTF));
    expect(info.family).toBe('Inter');
    expect(info.weight).toBe(100);
    expect(info.italic).toBe(false);
  });

  it('reads width class and variation axes', () => {
    const condensed = readFontInfo(sfnt({ width: 3 }));
    expect(condensed).toMatchObject({ weight: 500, width: 75, variable: false, axes: {} });
    const variable = readFontInfo(
      sfnt({
        width: 5,
        axes: [
          ['wght', 100, 400, 900],
          ['wdth', 75, 100, 100],
        ],
      }),
    );
    expect(variable.variable).toBe(true);
    expect(variable.axes).toEqual({
      wght: { min: 100, default: 400, max: 900 },
      wdth: { min: 75, default: 100, max: 100 },
    });
  });

  it('rejects files that are not fonts', () => {
    expect(() => readFontInfo(Buffer.from('<html>not a font</html>'))).toThrow(/not an OpenType/);
  });
});

describe('fonts.css', () => {
  it('is generated (empty when no DS fonts are synced)', () => {
    expect(css).toMatch(/@font-face|No DS fonts synced/);
    expect(css).not.toMatch(/SF Pro/);
  });

  it('has one face per family, weight, width and style', () => {
    const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map((m) =>
      ['font-family', 'font-weight', 'font-stretch', 'font-style']
        .map((p) => new RegExp(`${p}: ([^;]+);`).exec(m[1])?.[1] ?? '')
        .join('|'),
    );
    expect(new Set(faces).size).toBe(faces.length);
  });
});
