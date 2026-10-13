import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');

describe('@proto/tokens build', () => {
  it('emits --ds-* custom properties', () => {
    expect(css).toMatch(/--ds-color-bg-default:/);
    expect(css).toMatch(/--ds-space-4: 16px;/);
    expect(css).toMatch(/--ds-motion-duration-base: 240ms;/);
  });

  it('keeps semantic tokens as references to the palette', () => {
    expect(css).toMatch(/--ds-color-fg-default: var\(--ds-color-palette-neutral-900\);/);
  });

  it('emits JS values', async () => {
    const tokens = await import('../dist/tokens.js');
    expect(Object.keys(tokens).length).toBeGreaterThan(20);
  });
});
