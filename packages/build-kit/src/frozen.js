// Frozen versions (ADR-0010): the built site is kept in <version>/.frozen/site with a sha256 manifest.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** @param {string} dir @returns {string[]} */
function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walkFiles(join(dir, d.name)) : [join(dir, d.name)]))
    .sort();
}

/** sha256 of every file in a directory, keyed by relative POSIX path. @param {string} dir */
export function hashTree(dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const file of walkFiles(dir)) {
    files[relative(dir, file).split('\\').join('/')] = createHash('sha256')
      .update(readFileSync(file))
      .digest('hex');
  }
  return files;
}

/**
 * Verify .frozen/site against .frozen/manifest.json. Returns problems; empty means intact.
 * @param {string} versionDir
 */
export function verifyFrozen(versionDir) {
  const manifestFile = join(versionDir, '.frozen', 'manifest.json');
  if (!existsSync(manifestFile)) return ['.frozen/manifest.json is missing'];
  /** @type {{ files?: Record<string, string> }} */
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const expected = manifest.files ?? {};
  const site = join(versionDir, '.frozen', 'site');
  const actual = existsSync(site) ? hashTree(site) : {};
  const problems = [];
  for (const [file, hash] of Object.entries(expected)) {
    if (!actual[file]) problems.push(`missing ${file}`);
    else if (actual[file] !== hash) problems.push(`changed ${file}`);
  }
  for (const file of Object.keys(actual)) if (!(file in expected)) problems.push(`unexpected ${file}`);
  return problems;
}
