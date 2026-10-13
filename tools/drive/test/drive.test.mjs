import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDriveClient, assertDriveId, FOLDER, SHORTCUT } from '../lib/drive-api.mjs';
import { preflight } from '../lib/preflight.mjs';
import { buildInventory, walkTree } from '../lib/inventory.mjs';
import { diffLock, globToRegExp, normalizeLsjson } from '../lib/lock.mjs';
import { inboxTarget } from '../lib/inbox.mjs';

const PROTO = 'protoFolder000001';
const DS = 'dsFolder000000001';
const INBOX = 'inboxFolder000001';
const cfg = { protoFolderId: PROTO, dsFolderId: DS, inboxFolderName: 'Inbox' };
const readOnly = { canEdit: false, canAddChildren: false, canDelete: false, canTrash: false, canShare: false, canListChildren: true };

// Fake Drive: files keyed by id, children by parent id. Records every request.
function fakeDrive(files) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), method: init.method });
    const u = new URL(url);
    let body;
    const m = u.pathname.match(/\/drive\/v3\/files\/(.+)$/);
    if (m) body = files[m[1]];
    else {
      const parent = u.searchParams.get('q').match(/'([^']+)' in parents/)[1];
      body = { files: Object.values(files).filter((f) => (f.parents ?? []).includes(parent)) };
    }
    if (!body) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return { client: createDriveClient({ token: 't', fetchImpl }), calls };
}

const layout = () => ({
  [PROTO]: { id: PROTO, name: 'Proto', mimeType: FOLDER, capabilities: readOnly },
  [DS]: { id: DS, name: 'DS', mimeType: FOLDER, parents: [PROTO], capabilities: readOnly },
  [INBOX]: { id: INBOX, name: 'Inbox', mimeType: FOLDER, parents: [PROTO] },
});

test('client issues only GET requests and validates IDs', async () => {
  const { client, calls } = fakeDrive(layout());
  await client.getFile(DS, 'id');
  await client.listChildren(PROTO, 'id');
  assert.ok(calls.every((c) => c.method === 'GET'));
  assert.throws(() => assertDriveId("x' or 1=1"), /not a valid Drive ID/);
  await assert.rejects(client.listChildren("abcdefghij' or name contains '"), /not a valid Drive ID/);
  assert.throws(() => createDriveClient({ token: '' }), /token is empty/);
});

test('preflight passes on a correct read-only layout', async () => {
  const { client } = fakeDrive(layout());
  const r = await preflight(client, cfg);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.inbox.id, INBOX);
});

test('preflight warns when the service account can write', async () => {
  const files = layout();
  files[DS].capabilities = { ...readOnly, canEdit: true, canDelete: true };
  const r = await preflight(fakeDrive(files).client, cfg);
  assert.deepEqual(r.errors, []);
  assert.match(r.warnings[0], /write capabilities on DS: canEdit, canDelete/);
});

test('preflight fails when DS is a shortcut or outside Proto', async () => {
  const files = layout();
  files[DS] = { ...files[DS], mimeType: SHORTCUT, shortcutDetails: { targetId: 'elsewhere' }, parents: ['otherFolder00001'] };
  const r = await preflight(fakeDrive(files).client, cfg);
  assert.ok(r.errors.some((e) => /shortcut to elsewhere/.test(e)));
  assert.ok(r.errors.some((e) => /not directly inside Proto/.test(e)));
});

test('preflight reports a folder that is not shared with the service account', async () => {
  const files = layout();
  delete files[DS];
  const r = await preflight(fakeDrive(files).client, cfg);
  assert.match(r.errors[0], /not shared with the service account/);
});

test('inventory walks the tree, does not follow shortcuts and flags problems', async () => {
  const sub = 'subFolder00000001';
  const files = {
    ...layout(),
    [sub]: { id: sub, name: 'icons', mimeType: FOLDER, parents: [DS] },
    a: { id: 'a', name: 'tokens.json', mimeType: 'application/json', size: '120', md5Checksum: 'm1', parents: [DS] },
    b: { id: 'b', name: 'arrow.svg', mimeType: 'image/svg+xml', size: '10', md5Checksum: 'm2', parents: [sub] },
    c: { id: 'c', name: 'Guide', mimeType: 'application/vnd.google-apps.document', parents: [DS], copyRequiresWriterPermission: true },
    d: { id: 'd', name: 'link', mimeType: SHORTCUT, shortcutDetails: { targetId: PROTO }, parents: [DS] },
    e: { id: 'e', name: 'big.fig', mimeType: 'application/octet-stream', size: '999', parents: [DS] },
  };
  const { client } = fakeDrive(files);
  const inv = buildInventory({ id: DS, name: 'DS' }, await walkTree(client, DS), { maxFileSizeBytes: 500 });
  assert.deepEqual(
    inv.items.map((i) => i.path),
    ['Guide', 'big.fig', 'icons', 'icons/arrow.svg', 'link', 'tokens.json'],
  );
  assert.deepEqual(inv.summary.byMimeType['image/svg+xml'], 1);
  assert.equal(inv.summary.shortcuts, 1);
  assert.equal(inv.items.find((i) => i.path === 'Guide').downloadRestricted, true);
  assert.equal(inv.items.find((i) => i.path === 'big.fig').overSizeLimit, true);
  assert.equal(inv.items.find((i) => i.path === 'link').shortcutTarget, PROTO);
});

test('lock: normalize lsjson, keep excluded and oversized files in the lock, detect drift', () => {
  const ls = [
    { Path: 'icons', IsDir: true },
    { Path: 'a.json', ID: 'a', Size: 5, ModTime: 't1', Hashes: { md5: 'x' } },
    { Path: 'Guide.md', ID: 'g', Size: -1, ModTime: 't1' },
    { Path: 'big.bin', ID: 'b', Size: 1000, ModTime: 't1' },
    { Path: 'TUI Foundations.fig', ID: 'f', Size: 10, ModTime: 't1', Hashes: { md5: 'z' } },
  ];
  const all = normalizeLsjson(ls, { maxFileSizeBytes: 100, copyExclude: ['*.fig'] });
  assert.deepEqual(all.files.map((f) => [f.path, f.copied, f.reason]), [
    ['Guide.md', true, undefined],
    ['TUI Foundations.fig', false, 'excluded'],
    ['a.json', true, undefined],
    ['big.bin', false, 'too-large'],
  ]);
  assert.deepEqual(all.skipped.map((f) => f.path), ['TUI Foundations.fig', 'big.bin']);
  assert.ok(globToRegExp('*.fig').test('sub/x.fig') && !globToRegExp('*.fig').test('x.fig.json'));
  const files = all.files.filter((f) => f.copied);

  assert.ok(diffLock(files, files).clean);
  const now = [
    { path: 'Guide.md', id: 'g', size: -1, modTime: 't2' },
    { path: 'icons/a.json', id: 'a', size: 5, modTime: 't1', md5: 'x' },
    { path: 'new.svg', id: 'n', size: 1, modTime: 't1', md5: 'y' },
  ];
  const d = diffLock(files, now);
  assert.deepEqual(d.changed, ['Guide.md']);
  assert.deepEqual(d.moved, [{ from: 'a.json', to: 'icons/a.json' }]);
  assert.deepEqual(d.added, ['new.svg']);
  assert.deepEqual(d.removed, []);
  assert.equal(d.clean, false);
});

test('inbox: validates slug and version, refuses frozen versions', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-'));
  assert.deepEqual(inboxTarget(root, 'checkout-flow', 'v2'), {
    source: 'checkout-flow/v2',
    target: join('prototypes', 'checkout-flow', 'versions', 'v2', 'design-input'),
  });
  for (const bad of ['../etc', 'A', 'a--b', 'a b', '-a', 'a/b', '']) assert.throws(() => inboxTarget(root, bad, 'v1'), /Invalid slug/);
  for (const bad of ['1', 'v0', 'v01', 'v1/..', 'V1']) assert.throws(() => inboxTarget(root, 'a', bad), /Invalid version/);

  const dir = join(root, 'prototypes', 'a', 'versions', 'v1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'version.json'), JSON.stringify({ status: 'frozen' }));
  assert.throws(() => inboxTarget(root, 'a', 'v1'), /frozen/);
});

test('workflows never set RCLONE_* variables (rclone reads them as flags)', () => {
  const root = join(import.meta.dirname, '..', '..', '..', '.github');
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (/\.ya?ml$/.test(e.name)) files.push(join(dir, e.name));
    }
  };
  walk(root);
  const offenders = files.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => /^\s+RCLONE_[A-Z0-9_]+\s*:/.test(l))
      .map((l) => `${f}: ${l.trim()}`),
  );
  assert.deepEqual(offenders, []);
});
