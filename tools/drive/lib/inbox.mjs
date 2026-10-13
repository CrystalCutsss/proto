// drive-inbox inputs: validate slug and version, refuse frozen versions.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VERSION_RE = /^v[1-9][0-9]{0,3}$/;

export function validateSlug(slug) {
  if (typeof slug !== 'string' || slug.length > 64 || !SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug ${JSON.stringify(slug)}: use lowercase latin letters, digits and single hyphens, up to 64 chars.`);
  }
  return slug;
}

export function validateVersion(version) {
  if (typeof version !== 'string' || !VERSION_RE.test(version)) {
    throw new Error(`Invalid version ${JSON.stringify(version)}: expected v1, v2, … v9999.`);
  }
  return version;
}

export function inboxTarget(repoRoot, slug, version) {
  validateSlug(slug);
  validateVersion(version);
  const versionDir = join('prototypes', slug, 'versions', version);
  const versionJson = join(repoRoot, versionDir, 'version.json');
  if (existsSync(versionJson)) {
    const meta = JSON.parse(readFileSync(versionJson, 'utf8'));
    if (meta.status === 'frozen') {
      throw new Error(`${slug} ${version} is frozen; create a new version instead of changing its design input.`);
    }
  }
  return { source: `${slug}/${version}`, target: join(versionDir, 'design-input') };
}
