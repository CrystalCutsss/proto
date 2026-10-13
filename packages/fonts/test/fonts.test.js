import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readFontInfo } from '../src/sfnt.js';

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

  it('rejects files that are not fonts', () => {
    expect(() => readFontInfo(Buffer.from('<html>not a font</html>'))).toThrow(/not an OpenType/);
  });
});

describe('fonts.css', () => {
  it('is generated (empty when no DS fonts are synced)', () => {
    expect(css).toMatch(/@font-face|No DS fonts synced/);
    expect(css).not.toMatch(/SF Pro/);
  });
});
