#!/usr/bin/env node
// proto CLI: prototypes and versions (ADR-0009, ADR-0010). Run through the root package scripts:
//   pnpm proto:new <slug> [--template vanilla-ts|three-gsap|react-r3f] [--title "…"] [--owner "…"]
//   pnpm proto:version <slug> [--from vN] [--author "…"]
//   pnpm proto:freeze <slug> <vN>
//   pnpm proto:list
//   pnpm proto:spec <slug> <vN>
//   pnpm dev <slug> [vN]
//   pnpm registry:validate | registry:build
//   node tools/proto-cli/cli.mjs frozen-guard [--base origin/main]   (CI)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { FixtureSource } from '@proto/figma-bridge';
import { buildRegistry, RegistryError, serializeRegistry } from '@proto/registry';
import {
  assertSlug,
  assertVersion,
  createPrototype,
  createVersion,
  freezeVersion,
  listVersions,
  readJson,
  versionDir,
  writeJson,
} from './lib/scaffold.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** @param {string} cmd @param {string[]} args */
function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${res.status}`);
}

function gitUser() {
  const res = spawnSync('git', ['config', 'user.name'], { cwd: repoRoot, encoding: 'utf8' });
  return res.stdout?.trim() || process.env.USER || 'unknown';
}

function gitHead() {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  return res.stdout?.trim() || 'unknown';
}

/** @param {string} p */
const rel = (p) => relative(repoRoot, p);

const commands = {
  /** @param {string[]} argv */
  new(argv) {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        template: { type: 'string', short: 't', default: 'vanilla-ts' },
        title: { type: 'string' },
        owner: { type: 'string' },
        description: { type: 'string' },
        'no-install': { type: 'boolean', default: false },
      },
    });
    const [slug = ''] = positionals;
    const { dir } = createPrototype(repoRoot, {
      slug,
      template: values.template,
      title: values.title,
      owner: values.owner ?? gitUser(),
      description: values.description,
    });
    console.log(`Created ${rel(dir)} from template ${values.template}.`);
    if (!values['no-install']) run('pnpm', ['install']);
    console.log(`Next: pnpm dev ${slug}`);
  },

  /** @param {string[]} argv */
  version(argv) {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        from: { type: 'string' },
        author: { type: 'string' },
        'no-install': { type: 'boolean', default: false },
      },
    });
    const [slug = ''] = positionals;
    const res = createVersion(repoRoot, { slug, from: values.from, author: values.author ?? gitUser() });
    console.log(
      `Created ${rel(res.dir)} from ${res.from} (status: draft). Fill "changelog" in version.json.`,
    );
    if (!values['no-install']) run('pnpm', ['install']);
    console.log(`Next: pnpm dev ${slug} ${res.version}`);
  },

  /** @param {string[]} argv */
  freeze(argv) {
    const [slug = '', version = ''] = argv;
    assertSlug(slug);
    assertVersion(version);
    const meta = readJson(join(versionDir(repoRoot, slug, version), 'version.json'));
    if (meta.status === 'frozen') throw new Error(`${slug} ${version} is already frozen.`);
    if (!meta.changelog?.length)
      throw new Error(`Fill "changelog" in version.json of ${slug} ${version} before freezing.`);
    run('pnpm', ['turbo', 'run', 'build', `--filter=@proto/${slug}--${version}`]);
    const { frozen, fileCount } = freezeVersion(repoRoot, { slug, version, commit: gitHead() });
    console.log(
      `Frozen ${slug} ${version}: ${fileCount} files in ${rel(frozen)}. Commit .frozen/ together with version.json.`,
    );
  },

  list() {
    const registry = buildRegistry(repoRoot);
    if (registry.prototypes.length === 0)
      return console.log('No prototypes yet. Create one: pnpm proto:new <slug>');
    for (const p of registry.prototypes) {
      console.log(`${p.slug} — ${p.title} [${p.status}] default ${p.defaultVersion}`);
      for (const v of p.versions) console.log(`  ${v.version} ${v.status.padEnd(6)} ${v.date} ${v.title}`);
    }
  },

  /** @param {string[]} argv */
  async spec(argv) {
    const [slug = '', version = ''] = argv;
    assertSlug(slug);
    assertVersion(version);
    const dir = versionDir(repoRoot, slug, version);
    const spec = await new FixtureSource(dir).readSpec();
    mkdirSync(join(dir, 'spec'), { recursive: true });
    writeJson(join(dir, 'spec', 'spec.json'), spec);
    console.log(
      `${rel(join(dir, 'spec', 'spec.json'))}: ${spec.screens.length} screens, ${spec.attachments.length} attachments.`,
    );
  },

  /** @param {string[]} argv */
  dev(argv) {
    const [slug = '', requested] = argv;
    assertSlug(slug);
    const versions = listVersions(repoRoot, slug);
    if (versions.length === 0)
      throw new Error(`Prototype "${slug}" not found. Create it: pnpm proto:new ${slug}`);
    const version = requested ?? versions.at(-1);
    if (!version || !versions.includes(version))
      throw new Error(`Version ${requested} not found. Available: ${versions.join(', ')}`);
    run('pnpm', [
      'turbo',
      'run',
      'build',
      '--filter=@proto/proto-shell',
      `--filter=@proto/${slug}--${version}^...`,
    ]);
    run('pnpm', ['--filter', `@proto/${slug}--${version}`, 'exec', 'vite', '--host', '0.0.0.0']);
  },

  /**
   * Fail if a change touches a version that is frozen on the base ref (ADR-0010). Used by CI on PRs.
   * @param {string[]} argv
   */
  'frozen-guard'(argv) {
    const { values } = parseArgs({
      args: argv,
      options: { base: { type: 'string', default: 'origin/main' } },
    });
    const git = (/** @type {string[]} */ args) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
    const diff = git(['diff', '--name-only', `${values.base}...HEAD`]);
    if (diff.status !== 0) throw new Error(`git diff against ${values.base} failed: ${diff.stderr.trim()}`);
    const touched = new Set();
    for (const file of diff.stdout.split('\n')) {
      const m = /^prototypes\/([^/]+)\/versions\/([^/]+)\//.exec(file);
      if (m) touched.add(`${m[1]}/${m[2]}`);
    }
    const violations = [];
    for (const key of touched) {
      const [slug, version] = key.split('/');
      const base = git(['show', `${values.base}:prototypes/${slug}/versions/${version}/version.json`]);
      if (base.status !== 0) continue; // version is new in this change
      if (JSON.parse(base.stdout).status === 'frozen') violations.push(`${slug} ${version}`);
    }
    if (violations.length) {
      throw new Error(
        `Frozen versions are immutable, but this change modifies: ${violations.join(', ')}.\n` +
          `Revert those files and create a new version instead: pnpm proto:version <slug>`,
      );
    }
    console.log(
      `frozen-guard: OK (${touched.size} version folder(s) changed, none frozen on ${values.base}).`,
    );
  },

  /** @param {string[]} argv */
  registry(argv) {
    const { values } = parseArgs({
      args: argv,
      options: { check: { type: 'boolean' }, out: { type: 'string' } },
    });
    const registry = buildRegistry(repoRoot);
    if (values.out) {
      const out = join(repoRoot, values.out);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, serializeRegistry(registry));
      console.log(`Wrote ${values.out}`);
    }
    const versions = registry.prototypes.reduce((n, p) => n + p.versions.length, 0);
    console.log(`Registry OK: ${registry.prototypes.length} prototypes, ${versions} versions.`);
  },
};

const [name = '', ...rest] = process.argv.slice(2);
const command = /** @type {Record<string, (argv: string[]) => unknown>} */ (commands)[name];
if (!command) {
  console.error(`Unknown command "${name}". Commands: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}
try {
  await command(rest);
} catch (err) {
  console.error(err instanceof RegistryError ? err.message : `Error: ${/** @type {Error} */ (err).message}`);
  process.exit(1);
}
