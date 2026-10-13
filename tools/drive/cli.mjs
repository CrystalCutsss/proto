#!/usr/bin/env node
// Drive tools for the GitHub Actions workflows (ADR-0008). Zero dependencies, Node 22.
//
//   node tools/drive/cli.mjs preflight
//   node tools/drive/cli.mjs inventory --out <file.json>
//   node tools/drive/cli.mjs lock --lsjson <file> --out <lock.json> [--report <md>] [--previous <lock.json>]
//   node tools/drive/cli.mjs diff-lock --lsjson <file> --lock <lock.json> --report <md>
//   node tools/drive/cli.mjs inbox-target --slug <slug> --version <vN>
//
// Commands that call the Drive API read the token from GOOGLE_OAUTH_ACCESS_TOKEN.
// Markdown summaries go to $GITHUB_STEP_SUMMARY, step outputs to $GITHUB_OUTPUT when set.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createDriveClient } from './lib/drive-api.mjs';
import { preflight, renderPreflightMarkdown } from './lib/preflight.mjs';
import { buildInventory, renderInventoryMarkdown, walkTree } from './lib/inventory.mjs';
import { buildLock, diffLock, normalizeLsjson, renderDiffMarkdown } from './lib/lock.mjs';
import { inboxTarget } from './lib/inbox.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadDriveConfig(root = repoRoot) {
  const cfg = JSON.parse(readFileSync(join(root, 'config', 'drive.json'), 'utf8'));
  for (const key of ['protoFolderId', 'dsFolderId', 'inboxFolderName']) {
    if (!cfg[key]) throw new Error(`config/drive.json: ${key} is empty.`);
  }
  if (!Number.isInteger(cfg.sync?.maxFileSizeBytes)) throw new Error('config/drive.json: sync.maxFileSizeBytes must be an integer.');
  if (cfg.sync.copyExclude !== undefined && !(Array.isArray(cfg.sync.copyExclude) && cfg.sync.copyExclude.every((g) => typeof g === 'string' && /^[^\s'"]+$/.test(g)))) {
    throw new Error('config/drive.json: sync.copyExclude must be an array of glob strings without spaces or quotes.');
  }
  return cfg;
}

function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  else process.stdout.write(md + '\n');
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  else process.stdout.write(`${name}=${value}\n`);
}

// Workflow-command data must not contain raw newlines or '%' (GitHub's escaping rules).
function cmdData(s) {
  return String(s).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function client() {
  return createDriveClient({ token: process.env.GOOGLE_OAUTH_ACCESS_TOKEN });
}

const commands = {
  async preflight() {
    const r = await preflight(client(), loadDriveConfig());
    summary(renderPreflightMarkdown(r));
    for (const w of r.warnings) console.log(`::warning title=Drive preflight::${cmdData(w)}`);
    for (const e of r.errors) console.log(`::error title=Drive preflight::${cmdData(e)}`);
    return r.errors.length ? 1 : 0;
  },

  async inventory({ out }) {
    if (!out) throw new Error('inventory: --out is required.');
    const cfg = loadDriveConfig();
    const c = client();
    const root = await c.getFile(cfg.dsFolderId, 'id,name');
    const inv = buildInventory(root, await walkTree(c, cfg.dsFolderId), { maxFileSizeBytes: cfg.sync.maxFileSizeBytes });
    writeJson(out, inv);
    summary(renderInventoryMarkdown(inv));
    return 0;
  },

  async lock({ lsjson, out, report, previous }) {
    if (!lsjson || !out) throw new Error('lock: --lsjson and --out are required.');
    const cfg = loadDriveConfig();
    const { files, skipped } = normalizeLsjson(JSON.parse(readFileSync(lsjson, 'utf8')), cfg.sync);
    writeJson(out, buildLock(cfg.dsFolderId, files));
    const prev = previous && existsSync(previous) ? JSON.parse(readFileSync(previous, 'utf8')).files : [];
    let md = renderDiffMarkdown(diffLock(prev, files), { title: 'Changes since the previous sync' });
    if (skipped.length) {
      const why = { excluded: 'stays in Drive (sync.copyExclude)', 'too-large': `larger than ${cfg.sync.maxFileSizeBytes} bytes` };
      md += `\n### Not copied into the repository (${skipped.length})\n\nTracked in the lock, so ds-check still reports their changes.\n\n`;
      md += skipped.map((f) => `- \`${f.path}\` (${f.size} bytes): ${why[f.reason]}`).join('\n') + '\n';
    }
    if (report) writeFileSync(report, md);
    summary(md);
    return 0;
  },

  async ['diff-lock']({ lsjson, lock, report }) {
    if (!lsjson || !lock || !report) throw new Error('diff-lock: --lsjson, --lock and --report are required.');
    const cfg = loadDriveConfig();
    if (!existsSync(lock)) {
      const md = '## DS drift\n\nNo design-system/source.lock.json yet: run the ds-sync workflow first.\n';
      writeFileSync(report, md);
      summary(md);
      output('drift', 'false');
      return 0;
    }
    const { files } = normalizeLsjson(JSON.parse(readFileSync(lsjson, 'utf8')), cfg.sync);
    const diff = diffLock(JSON.parse(readFileSync(lock, 'utf8')).files, files);
    const md = renderDiffMarkdown(diff);
    writeFileSync(report, md);
    summary(md);
    output('drift', String(!diff.clean));
    return 0;
  },

  async ['inbox-target']({ slug, version }) {
    const t = inboxTarget(repoRoot, slug, version);
    output('source', t.source);
    output('target', t.target);
    output('branch', `drive/inbox-${slug}-${version}`);
    return 0;
  },
};

export async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!commands[cmd]) {
    console.error(`Unknown command ${JSON.stringify(cmd)}. Commands: ${Object.keys(commands).join(', ')}`);
    return 2;
  }
  const { values } = parseArgs({
    args: rest,
    options: Object.fromEntries(
      ['out', 'lsjson', 'lock', 'report', 'previous', 'slug', 'version'].map((k) => [k, { type: 'string' }]),
    ),
  });
  try {
    return await commands[cmd](values);
  } catch (e) {
    console.log(`::error title=drive ${cmd}::${cmdData(e.message)}`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
