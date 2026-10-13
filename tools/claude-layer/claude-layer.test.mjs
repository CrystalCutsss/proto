import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { checkLayer, descriptionProblems, frontmatter, globToRegExp } from './check.mjs';

const root = join(import.meta.dirname, '..', '..');

test('frontmatter: scalars, quoted values and lists', () => {
  const fm = frontmatter(
    '---\nname: a\ndescription: "Use when x"\npaths:\n  - "src/**/*.ts"\n  - b\n---\nbody',
  );
  assert.deepEqual(fm?.data, { name: 'a', description: 'Use when x', paths: ['src/**/*.ts', 'b'] });
  assert.equal(fm?.body, 'body');
  assert.equal(frontmatter('no frontmatter'), null);
});

test('descriptions: "Use when…" and at most 200 characters', () => {
  assert.deepEqual(descriptionProblems('Use when testing.'), []);
  assert.match(descriptionProblems('Official skill for X.').join(), /Use when/);
  assert.match(descriptionProblems(`Use when ${'x'.repeat(200)}`).join(), /max 200/);
  assert.deepEqual(descriptionProblems(undefined), ['missing description']);
});

test('globs: **, *, braces', () => {
  assert.ok(globToRegExp('prototypes/**/*.css').test('prototypes/a/versions/v1/src/style.css'));
  assert.ok(globToRegExp('prototypes/**').test('prototypes/a/prototype.json'));
  assert.ok(globToRegExp('**/*.{ts,tsx}').test('x.tsx'));
  assert.ok(!globToRegExp('templates/*.css').test('templates/a/b.css'));
});

test('the repository .claude/ layer passes every check', () => {
  const { problems, budget } = checkLayer(root);
  assert.deepEqual(problems, []);
  // Model-invocable skill and agent descriptions stay well inside the listing budget.
  assert.ok(budget < 4000, `description budget ${budget} characters`);
});
