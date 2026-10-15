import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createSiteServer, listen } from '../lib/server.mjs';

let root = '';
let base = '';
let open = '';
/** @type {import('node:http').Server[]} */
const servers = [];

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'site-'));
  const put = (/** @type {string} */ p, /** @type {string} */ c) => {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), c);
  };
  put('index.html', 'hub');
  put('_shell/viewer.html', 'viewer');
  put('p/a/v1/index.html', 'a v1');
  put('p/a/v2/index.html', 'a v2 spa');
  put('secret.txt', 'outside?');
  put(
    'registry.json',
    JSON.stringify({
      prototypes: [
        {
          slug: 'a',
          defaultVersion: 'v1',
          versions: [
            { version: 'v1', status: 'frozen', routing: 'hash' },
            { version: 'v2', status: 'review', routing: 'history' },
          ],
        },
      ],
    }),
  );
  const locked = createSiteServer(root, { password: 'pw' });
  const unlocked = createSiteServer(root);
  servers.push(locked, unlocked);
  base = await listen(locked);
  open = await listen(unlocked);
});
after(() => {
  servers.forEach((s) => s.close());
  rmSync(root, { recursive: true, force: true });
});

/** Log in through the form, like a browser. */
async function session() {
  const res = await fetch(`${base}/_auth/login`, {
    method: 'POST',
    body: new URLSearchParams({ password: 'pw', next: '/' }),
    redirect: 'manual',
  });
  assert.equal(res.status, 303);
  return { Cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '' };
}

test('the Worker login guards the local server when a password is set', async () => {
  assert.equal((await fetch(`${base}/`)).status, 401);
  const wrong = await fetch(`${base}/_auth/login`, {
    method: 'POST',
    body: new URLSearchParams({ password: 'nope' }),
    redirect: 'manual',
  });
  assert.equal(wrong.status, 401);
  const cookie = await session();
  assert.match(cookie.Cookie, /^proto_session=v1\.site\./);
  assert.equal(await (await fetch(`${base}/`, { headers: cookie })).text(), 'hub');
});

test('serves the viewer, redirects, serves versions and falls back for history routing', async () => {
  const auth = await session();
  assert.equal(await (await fetch(`${base}/p/a/?v=v1`, { headers: auth })).text(), 'viewer');
  const r = await fetch(`${base}/p/a?x=1`, { headers: auth, redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/p/a/?x=1');
  assert.equal(await (await fetch(`${base}/p/a/v2/deep/screen`, { headers: auth })).text(), 'a v2 spa');
  assert.equal((await fetch(`${base}/p/a/v1/deep/screen`, { headers: auth })).status, 404);
});

test('blocks traversal and non-GET methods', async () => {
  const auth = await session();
  assert.equal((await fetch(`${base}/p/a/v1/%2e%2e/%2e%2e/secret.txt`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/p/a/v1/..%2f..%2fsecret.txt`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'PUT', headers: auth })).status, 405);
});

test('without a password the local preview is open (never used for hosting)', async () => {
  assert.equal(await (await fetch(`${open}/`)).text(), 'hub');
});
