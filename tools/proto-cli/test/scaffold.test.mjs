import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { verifyFrozen } from '@proto/build-kit/frozen';
import { buildRegistry } from '@proto/registry';
import { createPrototype, createVersion, escapeValue, freezeVersion, readJson } from '../lib/scaffold.mjs';

const repo = join(import.meta.dirname, '../../..');
let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'proto-cli-'));
  cpSync(join(repo, 'templates'), join(root, 'templates'), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** Fake a build of a version. @param {string} dir */
const fakeBuild = (dir) => {
  mkdirSync(join(dir, 'dist/assets'), { recursive: true });
  writeFileSync(join(dir, 'dist/index.html'), '<html></html>');
  writeFileSync(join(dir, 'dist/assets/index-abcdef12.js'), 'console.log(1)');
};

test('proto:new creates a valid prototype from each template', () => {
  for (const template of ['vanilla-ts', 'three-gsap', 'react-r3f']) {
    const { dir } = createPrototype(root, {
      slug: `p-${template}`,
      template,
      title: 'Тест "1"',
      owner: 'Owner',
    });
    assert.equal(readJson(join(dir, 'package.json')).name, `@proto/p-${template}--v1`);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /<title>Тест &#34;1&#34;<\/title>/);
    assert.ok(
      existsSync(join(dir, 'design-input')) && existsSync(join(dir, 'qa')) && existsSync(join(dir, 'spec')),
    );
  }
  createPrototype(root, { slug: 'phone', owner: 'Owner', platform: 'mobile' });
  const reg = buildRegistry(root);
  assert.equal(reg.prototypes.length, 4);
  assert.equal(reg.prototypes.find((p) => p.slug === 'phone')?.platform, 'mobile');
  assert.equal(reg.prototypes.find((p) => p.slug === 'p-vanilla-ts')?.platform, 'desktop');
  assert.throws(
    () => createPrototype(root, { slug: 'tab', owner: 'o', platform: 'tablet' }),
    /Unknown platform/,
  );
});

test('proto:new rejects bad, reserved and existing slugs and unknown templates', () => {
  createPrototype(root, { slug: 'a', owner: 'o' });
  assert.throws(() => createPrototype(root, { slug: 'a', owner: 'o' }), /already exists/);
  assert.throws(() => createPrototype(root, { slug: 'Bad Slug', owner: 'o' }), /Invalid slug/);
  assert.throws(() => createPrototype(root, { slug: 'latest', owner: 'o' }), /reserved/);
  assert.throws(() => createPrototype(root, { slug: 'b', template: 'nope', owner: 'o' }), /Unknown template/);
});

test('proto:version copies the latest version as a draft and skips build output', () => {
  const { dir } = createPrototype(root, { slug: 'a', owner: 'o' });
  fakeBuild(dir);
  const v2 = createVersion(root, { slug: 'a', author: 'me' });
  assert.equal(v2.version, 'v2');
  assert.equal(existsSync(join(v2.dir, 'dist')), false);
  const meta = readJson(join(v2.dir, 'version.json'));
  assert.deepEqual([meta.status, meta.baseVersion, meta.author, meta.changelog], ['draft', 'v1', 'me', []]);
  const v3 = createVersion(root, { slug: 'a', from: 'v1', author: 'me' });
  assert.equal(v3.version, 'v3');
  assert.throws(() => createVersion(root, { slug: 'a', from: 'v9', author: 'me' }), /does not exist/);
  assert.equal(buildRegistry(root).prototypes[0]?.versions.length, 3);
});

test('proto:freeze snapshots dist, switches the build to the snapshot and detects tampering', () => {
  const { dir } = createPrototype(root, { slug: 'a', owner: 'o' });
  assert.throws(() => freezeVersion(root, { slug: 'a', version: 'v1', commit: 'abc' }), /not built/);
  fakeBuild(dir);
  const { fileCount } = freezeVersion(root, { slug: 'a', version: 'v1', commit: 'abc' });
  assert.equal(fileCount, 2);
  assert.equal(readJson(join(dir, 'version.json')).status, 'frozen');
  const pkg = readJson(join(dir, 'package.json'));
  assert.equal(pkg.scripts.build, 'proto-frozen-build');
  assert.equal(pkg.scripts['build:source'], 'vite build');
  assert.deepEqual(verifyFrozen(dir), []);
  assert.throws(() => freezeVersion(root, { slug: 'a', version: 'v1', commit: 'abc' }), /already frozen/);

  writeFileSync(join(dir, '.frozen/site/index.html'), '<html>changed</html>');
  writeFileSync(join(dir, '.frozen/site/extra.txt'), 'x');
  assert.deepEqual(verifyFrozen(dir), ['changed index.html', 'unexpected extra.txt']);

  // A new version from a frozen one gets a normal build back.
  const v2 = createVersion(root, { slug: 'a', author: 'me' });
  const pkg2 = readJson(join(v2.dir, 'package.json'));
  assert.equal(pkg2.scripts.build, 'vite build');
  assert.equal(pkg2.scripts['build:source'], undefined);
  assert.equal(existsSync(join(v2.dir, '.frozen')), false);
});

test('escapeValue neutralizes HTML and template-string syntax', () => {
  assert.equal(
    escapeValue('<a href="x">`${1}`</a>'),
    '&#60;a href=&#34;x&#34;&#62;&#96;&#36;{1}&#96;&#60;/a&#62;',
  );
});

test('proto:new and proto:version keep design input that drive-inbox delivered first', () => {
  const inbox = (/** @type {string} */ v) => {
    const d = join(root, 'prototypes/early/versions', v, 'design-input');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, `01-${v}.png`), v);
  };
  inbox('v1');
  const { dir } = createPrototype(root, { slug: 'early', owner: 'Owner' });
  assert.equal(readFileSync(join(dir, 'design-input/01-v1.png'), 'utf8'), 'v1');
  assert.ok(existsSync(join(root, 'prototypes/early/prototype.json')));
  assert.throws(() => createPrototype(root, { slug: 'early', owner: 'Owner' }), /already exists/);

  inbox('v2');
  const v2 = createVersion(root, { slug: 'early', author: 'Owner' });
  assert.equal(v2.version, 'v2');
  assert.equal(v2.from, 'v1');
  assert.ok(existsSync(join(v2.dir, 'design-input/01-v2.png')));
  assert.ok(!existsSync(join(v2.dir, 'design-input/01-v1.png')));
  assert.ok(existsSync(join(v2.dir, 'version.json')));
});
