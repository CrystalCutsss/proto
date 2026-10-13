// Fixture adapter: reads prototypes/<slug>/versions/<vN>/design-input/ (filled by the drive-inbox workflow).
// Optional design-input/screens.json overrides names, routes and frame sizes:
//   [{ "file": "checkout.png", "name": "Оформление", "route": "#/checkout", "width": 390, "height": 844 }]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { DesignSource, SpecScreen, VersionSpec } from '../types.ts';

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

interface ScreenOverride {
  file: string;
  name?: string;
  route?: string;
  width?: number;
  height?: number;
}

/** "02 Checkout Step.png" → "checkout-step" */
export function screenId(file: string): string {
  return (
    file
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/^\d+[\s._-]*/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'screen'
  );
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]))
    .sort();
}

export class FixtureSource implements DesignSource {
  readonly kind = 'fixture' as const;
  readonly versionDir: string;

  constructor(versionDir: string) {
    this.versionDir = versionDir;
  }

  async readSpec(): Promise<VersionSpec> {
    const inputDir = join(this.versionDir, 'design-input');
    const files = existsSync(inputDir) ? walk(inputDir) : [];
    const overridesFile = join(inputDir, 'screens.json');
    const overrides: ScreenOverride[] = existsSync(overridesFile)
      ? (JSON.parse(readFileSync(overridesFile, 'utf8')) as ScreenOverride[])
      : [];
    const screens: SpecScreen[] = [];
    const attachments: string[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      const rel = relative(this.versionDir, file).split('\\').join('/');
      const name = rel.slice('design-input/'.length);
      if (name === 'screens.json') continue;
      if (!IMAGE.has(extname(file).toLowerCase())) {
        attachments.push(rel);
        continue;
      }
      const o = overrides.find((x) => x.file === name);
      let id = screenId(name.split('/').pop() ?? name);
      if (seen.has(id)) id = screenId(name);
      for (let n = 2; seen.has(id); n++) id = `${screenId(name)}-${n}`;
      seen.add(id);
      screens.push({
        id,
        name: o?.name ?? id,
        route: o?.route ?? (screens.length === 0 ? '#/' : `#/${id}`),
        reference: rel,
        ...(o?.width && o.height ? { frame: { width: o.width, height: o.height } } : {}),
      });
    }
    return { schemaVersion: 1, source: { kind: 'fixture', ref: 'design-input/' }, screens, attachments };
  }
}
