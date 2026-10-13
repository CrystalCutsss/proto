import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createSiteServer, listen } from '../lib/server.mjs';

let root = '';
let base = '';
/** @type {import('node:http').Server} */
let server;

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'site-'));
  const put = (/** @type {string} */ p, /** @type {string} */ c) => {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), c);
  };
  put('index.html', 'hub');
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
  server = createSiteServer(root, { password: 'pw' });
  base = await listen(server);
});
after(() => {
  server.close();
  rmSync(root, { recursive: true, force: true });
});

const auth = { Authorization: `Basic ${Buffer.from('any:pw').toString('base64')}` };

test('requires the password when configured', async () => {
  assert.equal((await fetch(`${base}/`)).status, 401);
  const wrong = { Authorization: `Basic ${Buffer.from('any:nope').toString('base64')}` };
  assert.equal((await fetch(`${base}/`, { headers: wrong })).status, 401);
  assert.equal(await (await fetch(`${base}/`, { headers: auth })).text(), 'hub');
});

test('redirects, serves versions and falls back for history routing', async () => {
  const r = await fetch(`${base}/p/a/?x=1`, { headers: auth, redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/p/a/v1/?x=1');
  assert.equal(await (await fetch(`${base}/p/a/v2/deep/screen`, { headers: auth })).text(), 'a v2 spa');
  assert.equal((await fetch(`${base}/p/a/v1/deep/screen`, { headers: auth })).status, 404);
});

test('blocks traversal and non-GET methods', async () => {
  assert.equal((await fetch(`${base}/p/a/v1/%2e%2e/%2e%2e/secret.txt`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST', headers: auth })).status, 405);
});
