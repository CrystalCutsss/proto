import assert from 'node:assert/strict';
import { test } from 'node:test';
import stylelint from 'stylelint';
import { isAllowed } from './ds-tokens.mjs';

const config = { plugins: ['./tools/stylelint/ds-tokens.mjs'], rules: { 'proto/ds-tokens': true } };

/** @param {string} code */
async function warnings(code) {
  const { results } = await stylelint.lint({ code, config, configBasedir: process.cwd() });
  return results[0]?.warnings.map((w) => w.text) ?? [];
}

test('rejects hard-coded colors, fonts, spacing and timings', async () => {
  const out = await warnings(
    'a { color: #fff; padding: 12px; font-family: Arial; margin: 0 8px; transition: color 200ms ease-in; }',
  );
  assert.equal(out.length, 5);
  assert.match(out[0] ?? '', /use a design token/);
});

test('allows tokens, neutral keywords, zero, percentages and custom property definitions', async () => {
  const out = await warnings(
    ':root { --local: 13px; } a { color: var(--ds-color-fg-default); padding: 0 var(--ds-space-2); ' +
      'margin: auto; border: 1px solid transparent; gap: calc(var(--ds-space-2) * 2); ' +
      'transition: background-color var(--ds-motion-duration-fast) var(--ds-motion-easing-standard); ' +
      'width: 100%; display: grid; }',
  );
  assert.deepEqual(out, []);
});

test('isAllowed edge cases', () => {
  assert.equal(isAllowed('var(--ds-a) var(--local)'), true);
  assert.equal(isAllowed('2px solid red'), false);
  assert.equal(isAllowed('opacity cubic-bezier(0, 0, 1, 1)', 'transition'), false);
  assert.equal(isAllowed('max(env(safe-area-inset-bottom, 0), var(--ds-space-4))'), true);
  assert.equal(isAllowed('env(safe-area-inset-top, 12px)'), false);
});
