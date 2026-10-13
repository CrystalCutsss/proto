// Run: node --test .claude/hooks/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from './drive-guard.mjs';

const PROTO = 'proto-id';
const DS = 'ds-id';
const DOCS = 'docs-id';
const ADR = 'adr-folder-id';
const STATUS = 'status-doc-id';
const FOLDER = 'application/vnd.google-apps.folder';

const fresh = { protoFolderId: PROTO, dsFolderId: DS, docs: { folderName: 'Docs', folderId: '', folders: {}, files: {} } };
const ready = {
  protoFolderId: PROTO,
  dsFolderId: DS,
  docs: { folderName: 'Docs', folderId: DOCS, folders: { adr: ADR }, files: { status: STATUS } },
};
const t = (name) => `mcp__Google_Drive__${name}`;

test('non-Google tools are ignored', () => {
  assert.equal(evaluate('Bash', { command: 'ls' }, ready), null);
  assert.equal(evaluate('mcp__github__create_pull_request', {}, ready), null);
});

test('read tools are allowed, even on DS', () => {
  for (const tool of ['get_file_metadata', 'get_file_permissions', 'search_files', 'read_file_content']) {
    assert.equal(evaluate(t(tool), { fileId: DS }, ready), null, tool);
  }
});

test('bootstrap: Docs folder may be created under Proto only while unregistered', () => {
  const input = { parentId: PROTO, contentMimeType: FOLDER, title: 'Docs' };
  assert.equal(evaluate(t('create_file'), { parentId: PROTO, mimeType: FOLDER, title: 'Docs' }, fresh), null);
  assert.equal(evaluate(t('create_file'), input, fresh), null);
  assert.match(evaluate(t('create_file'), input, ready), /only inside Proto\/Docs/);
  assert.match(evaluate(t('create_file'), { ...input, title: 'Other' }, fresh), /only inside Proto\/Docs/);
  assert.match(evaluate(t('create_file'), { ...input, contentMimeType: 'text/html' }, fresh), /only inside Proto\/Docs/);
});

test('create_file inside registered Docs folders is allowed', () => {
  assert.equal(evaluate(t('create_file'), { parentId: DOCS, title: 'STATUS', textContent: '<p>x</p>' }, ready), null);
  assert.equal(evaluate(t('create_file'), { parentId: ADR, title: 'ADR-0001' }, ready), null);
});

test('content mentioning the DS ID does not block a Docs write', () => {
  assert.equal(evaluate(t('create_file'), { parentId: DOCS, textContent: `DS folder ${DS}` }, ready), null);
});

test('create_file elsewhere is blocked', () => {
  assert.match(evaluate(t('create_file'), { parentId: DS, title: 'x' }, ready), /read-only/);
  assert.match(evaluate(t('create_file'), { parentId: PROTO, title: 'x' }, ready), /only inside Proto\/Docs/);
  assert.match(evaluate(t('create_file'), { title: 'no parent' }, ready), /explicit parent/);
  assert.match(evaluate(t('create_file'), { parents: [DOCS, 'other'] }, ready), /only inside Proto\/Docs/);
});

test('update is allowed only for registered Docs files and never moves', () => {
  assert.equal(evaluate(t('update_file'), { fileId: STATUS, title: 'STATUS' }, ready), null);
  assert.equal(evaluate('mcp__Google_Docs__update_doc', { documentId: STATUS, requests: [] }, ready), null);
  assert.match(evaluate(t('update_file'), { fileId: 'random' }, ready), /registered/);
  assert.match(evaluate(t('update_file'), { fileId: DS }, ready), /read-only/);
  assert.match(evaluate(t('update_file'), { fileId: STATUS, addParents: DOCS }, ready), /must not move/);
  assert.match(evaluate(t('update_file'), { fileId: STATUS, parentId: DOCS }, ready), /must not move/);
});

test('dangerous tools are always blocked', () => {
  for (const tool of ['copy_file', 'share_file', 'trash_file', 'some_new_tool']) {
    assert.ok(evaluate(t(tool), { fileId: STATUS }, ready), tool);
  }
});

test('CLI: exit 2 with reason on block, exit 0 on allow', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drive-guard-'));
  mkdirSync(join(dir, 'config'));
  writeFileSync(join(dir, 'config', 'drive.json'), JSON.stringify(ready));
  const script = join(dirname(fileURLToPath(import.meta.url)), 'drive-guard.mjs');
  const run = (event) =>
    spawnSync(process.execPath, [script], { input: JSON.stringify(event), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  const blocked = run({ tool_name: t('trash_file'), tool_input: { fileId: DS } });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr.toString(), /drive-guard/);
  const allowed = run({ tool_name: t('get_file_metadata'), tool_input: { fileId: DS } });
  assert.equal(allowed.status, 0);
  const broken = spawnSync(process.execPath, [script], { input: 'not json', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(broken.status, 2);
});
