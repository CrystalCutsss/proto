// Static checks of the Claude Code layer (ADR-0007, ADR-0014): skills, agents, rules, vendored files and hook
// registration. Pure functions; tests in claude-layer.test.mjs run them against the real .claude/ directory.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

export const MAX_DESCRIPTION = 200;

/**
 * Minimal frontmatter parser: `key: value` scalars and `key:` followed by `  - item` lists.
 * @param {string} text
 * @returns {{ data: Record<string, string | string[]>, body: string } | null}
 */
export function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  /** @type {Record<string, string | string[]>} */
  const data = {};
  let list = /** @type {string[] | null} */ (null);
  for (const line of (m[1] ?? '').split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(unquote(item[1] ?? ''));
      continue;
    }
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key = '', value = ''] = kv;
    if (value === '') data[key] = list = [];
    else {
      data[key] = unquote(value);
      list = null;
    }
  }
  return { data, body: m[2] ?? '' };
}

/** @param {string} s */
const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, '$2');

/**
 * Problems with a skill or agent description.
 * @param {unknown} description
 */
export function descriptionProblems(description) {
  if (typeof description !== 'string' || !description) return ['missing description'];
  const problems = [];
  if (!description.startsWith('Use when')) problems.push('description must start with "Use when"');
  if (description.length > MAX_DESCRIPTION) {
    problems.push(`description is ${description.length} characters (max ${MAX_DESCRIPTION})`);
  }
  return problems;
}

/**
 * Glob → RegExp for rule `paths:` (supports **, *, ?, {a,b}).
 * @param {string} glob
 */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      re += `(?:${glob
        .slice(i + 1, end)
        .split(',')
        .map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&'))
        .join('|')})`;
      i = end;
    } else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Repository files (git-tracked layout, without node_modules, dist and .git). @param {string} root */
export function listFiles(root) {
  const skip = new Set(['node_modules', '.git', 'dist', '.turbo', 'test-results', 'playwright-report']);
  /** @type {string[]} */
  const out = [];
  /** @param {string} dir */
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(root, p).split('\\').join('/'));
    }
  };
  walk(root);
  return out;
}

/** @param {string} dir @returns {string[]} */
const subdirs = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory()) : [];

/**
 * Run every check. Returns a list of "path: problem" strings (empty = OK) and a description budget.
 * @param {string} root
 */
export function checkLayer(root) {
  const claude = join(root, '.claude');
  const problems = /** @type {string[]} */ ([]);
  let budget = 0;
  const add = (/** @type {string} */ path, /** @type {string[]} */ list) =>
    list.forEach((p) => problems.push(`${path}: ${p}`));

  // Skills
  const vendoredIndex = existsSync(join(claude, 'skills/VENDORED.md'))
    ? readFileSync(join(claude, 'skills/VENDORED.md'), 'utf8')
    : '';
  for (const name of subdirs(join(claude, 'skills'))) {
    const rel = `.claude/skills/${name}/SKILL.md`;
    const file = join(root, rel);
    if (!existsSync(file)) {
      add(`.claude/skills/${name}`, ['no SKILL.md']);
      continue;
    }
    const fm = frontmatter(readFileSync(file, 'utf8'));
    if (!fm) {
      add(rel, ['no frontmatter']);
      continue;
    }
    if (fm.data.name !== name) add(rel, [`name "${fm.data.name}" must equal the directory "${name}"`]);
    add(rel, descriptionProblems(fm.data.description));
    if (fm.data['disable-model-invocation'] !== 'true') budget += String(fm.data.description ?? '').length;
    if (existsSync(join(claude, 'skills', name, 'VENDOR.md'))) {
      const vendor = readFileSync(join(claude, 'skills', name, 'VENDOR.md'), 'utf8');
      if (!existsSync(join(claude, 'skills', name, 'LICENSE')) && !/Licence \| .*README/.test(vendor)) {
        add(rel, ['vendored skill without LICENSE or a quoted licence in VENDOR.md']);
      }
      if (!/\| Commit \| `[0-9a-f]{40}` \|/.test(vendor))
        add(rel, ['VENDOR.md must record the full commit SHA']);
      if (!vendoredIndex.includes(`skills/${name}/`)) add(rel, ['missing from .claude/skills/VENDORED.md']);
    }
  }

  // Agents
  const agentsDir = join(claude, 'agents');
  for (const f of existsSync(agentsDir) ? readdirSync(agentsDir).filter((n) => n.endsWith('.md')) : []) {
    const rel = `.claude/agents/${f}`;
    const fm = frontmatter(readFileSync(join(agentsDir, f), 'utf8'));
    if (!fm) {
      add(rel, ['no frontmatter']);
      continue;
    }
    if (fm.data.name !== basename(f, '.md')) add(rel, [`name "${fm.data.name}" must equal the file name`]);
    add(rel, descriptionProblems(fm.data.description));
    budget += String(fm.data.description ?? '').length;
    if (!fm.data.tools) add(rel, ['set an explicit tools list (least privilege)']);
  }

  // Rules: every paths glob must match at least one file, so stale rules are noticed.
  const files = listFiles(root);
  const rulesDir = join(claude, 'rules');
  for (const f of existsSync(rulesDir) ? readdirSync(rulesDir).filter((n) => n.endsWith('.md')) : []) {
    const rel = `.claude/rules/${f}`;
    const fm = frontmatter(readFileSync(join(rulesDir, f), 'utf8'));
    if (!fm || !Array.isArray(fm.data.paths) || fm.data.paths.length === 0) {
      add(rel, ['needs a paths: list (unscoped conventions belong in CLAUDE.md)']);
      continue;
    }
    for (const glob of fm.data.paths) {
      const re = globToRegExp(glob);
      if (!files.some((file) => re.test(file))) add(rel, [`paths glob "${glob}" matches no file`]);
    }
  }

  // Hooks: every hook script is registered, every registered script exists, guards fail closed.
  const settings = JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8'));
  /** @type {{ script: string, event: string, onFailure?: string }[]} */
  const registered = [];
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of /** @type {any[]} */ (groups)) {
      for (const h of group.hooks ?? []) {
        const arg = [h.command, ...(h.args ?? [])].find((a) => /\.claude\/hooks\/[^/]+\.mjs$/.test(a ?? ''));
        if (arg) registered.push({ script: basename(arg), event, onFailure: h.onFailure });
      }
    }
  }
  const scripts = readdirSync(join(claude, 'hooks')).filter(
    (n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs'),
  );
  for (const s of scripts) {
    if (!registered.some((r) => r.script === s))
      add(`.claude/hooks/${s}`, ['not registered in .claude/settings.json']);
  }
  for (const r of registered) {
    if (!scripts.includes(r.script)) add('.claude/settings.json', [`hook script ${r.script} does not exist`]);
    if (r.event === 'PreToolUse' && r.onFailure !== 'block') {
      add('.claude/settings.json', [`PreToolUse hook ${r.script} must set onFailure: "block"`]);
    }
  }
  return { problems, budget };
}
