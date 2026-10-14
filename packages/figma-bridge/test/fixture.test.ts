import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FigmaMcpSource, FixtureSource, screenId } from '../src/index.ts';

let dir = '';
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

describe('FixtureSource', () => {
  it('turns design-input images into screens and keeps other files as attachments', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fb-'));
    mkdirSync(join(dir, 'design-input/extra'), { recursive: true });
    for (const f of ['01 Home.png', '02 Checkout Step.png', 'brief.pdf', 'extra/Home.svg']) {
      writeFileSync(join(dir, 'design-input', f), 'x');
    }
    writeFileSync(
      join(dir, 'design-input/screens.json'),
      JSON.stringify([{ file: '02 Checkout Step.png', name: 'Оформление', width: 390, height: 844 }]),
    );
    const spec = await new FixtureSource(dir).readSpec();
    expect(spec.screens.map((s) => [s.id, s.route])).toEqual([
      ['home', '#/'],
      ['checkout-step', '#/checkout-step'],
      ['extra-home', '#/extra-home'],
    ]);
    expect(spec.screens[1]).toMatchObject({ name: 'Оформление', frame: { width: 390, height: 844 } });
    expect(spec.attachments).toEqual(['design-input/brief.pdf']);
  });

  it('returns an empty spec without design-input', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fb-'));
    expect((await new FixtureSource(dir).readSpec()).screens).toEqual([]);
  });
});

describe('FigmaMcpSource', () => {
  it('is a stub: Figma is read in the session, not from build code', async () => {
    await expect(new FigmaMcpSource('https://figma.com/design/x').readSpec()).rejects.toThrow(
      /connect-figma-rest/,
    );
  });
});

it('screenId normalizes file names', () => {
  expect(screenId('03_Payment Done!.JPG')).toBe('payment-done');
});
