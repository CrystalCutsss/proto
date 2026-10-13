// Shared helpers for the project hooks (ADR-0014): hook I/O and repository path rules.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

/** Read the hook event JSON from stdin. */
export async function readEvent() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw);
}

/** @param {any} event */
export function projectDir(event) {
  return process.env.CLAUDE_PROJECT_DIR ?? event?.cwd ?? process.cwd();
}

/**
 * Repository-relative POSIX path, or null when the path is outside the project.
 * @param {string} root @param {string | undefined} file
 */
export function repoPath(root, file) {
  if (!file) return null;
  const rel = relative(root, isAbsolute(file) ? file : join(root, file));
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/** Files that only GitHub Actions may write (ADR-0008, ADR-0013): DS data comes from Drive via ds-sync. */
export const ACTIONS_ONLY = [
  /^design-system\/source(\/|$)/,
  /^design-system\/source\.lock\.json$/,
  /^design-system\/inventory\.(json|md)$/,
];

/** Generated files that must change only through their tool. */
export const GENERATED = [{ re: /(^|\/)pnpm-lock\.yaml$/, how: 'pnpm install / pnpm add' }];

const VERSION_DIR = /^prototypes\/([^/]+)\/versions\/(v[1-9][0-9]*)(\/|$)/;

/**
 * The frozen version (ADR-0010) that contains a repository path, or null.
 * @param {string} root @param {string} rel
 * @returns {{ slug: string, version: string } | null}
 */
export function frozenVersionOf(root, rel) {
  const m = VERSION_DIR.exec(rel);
  if (!m) return null;
  const file = join(root, 'prototypes', m[1], 'versions', m[2], 'version.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')).status === 'frozen' ? { slug: m[1], version: m[2] } : null;
  } catch {
    return null;
  }
}

/** @param {{ slug: string, version: string }} f */
export const frozenReason = (f) =>
  `${f.slug} ${f.version} is frozen (ADR-0010): its files are immutable. ` +
  `Create a new version instead: pnpm proto:version ${f.slug}`;

/**
 * Block a PreToolUse call: exit 2, stderr becomes the reason shown to Claude.
 * @param {string} hook @param {string} reason
 */
export function block(hook, reason) {
  process.stderr.write(`${hook}: ${reason}\n`);
  process.exit(2);
}

/**
 * Run a hook's main(): any internal error blocks (fail closed) with a readable reason.
 * @param {string} hook @param {() => Promise<void>} main
 */
export function runGuard(hook, main) {
  main().catch((err) => block(hook, `internal error, blocking for safety: ${err.message}`));
}
