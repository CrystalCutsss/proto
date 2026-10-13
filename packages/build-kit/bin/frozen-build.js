#!/usr/bin/env node
// `build` script of a frozen version: verify the snapshot and copy .frozen/site → dist/ (ADR-0010).
// With --check (the frozen `typecheck` script) only verifies the snapshot.
// The source is not rebuilt, so dependency or token updates cannot change a frozen version.
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { verifyFrozen } from '../src/frozen.js';

const dir = process.cwd();
const problems = verifyFrozen(dir);
if (problems.length > 0) {
  console.error(`Frozen snapshot of ${dir} is damaged:\n  - ${problems.slice(0, 20).join('\n  - ')}`);
  console.error('Frozen versions are immutable. Restore .frozen/ from git or create a new version.');
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log('frozen: snapshot intact (source is not type-checked)');
  process.exit(0);
}
rmSync(join(dir, 'dist'), { recursive: true, force: true });
cpSync(join(dir, '.frozen', 'site'), join(dir, 'dist'), { recursive: true });
console.log('frozen: copied .frozen/site → dist (source not rebuilt)');
