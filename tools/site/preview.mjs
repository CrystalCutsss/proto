#!/usr/bin/env node
// pnpm site:preview [--port 4173] — serve dist/site with the production URL scheme.
// Set PROTO_PREVIEW_PASSWORD to turn on the production login (same Worker code, ADR-0015).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createSiteServer, listen } from './lib/server.mjs';

const repoRoot = join(import.meta.dirname, '../..');
const { values } = parseArgs({
  options: { port: { type: 'string', default: '4173' }, dir: { type: 'string', default: 'dist/site' } },
});
const root = join(repoRoot, values.dir);
if (!existsSync(join(root, 'registry.json'))) {
  console.error(`${values.dir} is not built. Run: pnpm site:build`);
  process.exit(1);
}
const url = await listen(
  createSiteServer(root, { password: process.env.PROTO_PREVIEW_PASSWORD }),
  Number(values.port),
  '0.0.0.0',
);
console.log(
  `site:preview → ${url.replace('0.0.0.0', 'localhost')}${process.env.PROTO_PREVIEW_PASSWORD ? ' (login on)' : ''}`,
);
