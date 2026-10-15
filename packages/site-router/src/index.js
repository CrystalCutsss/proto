// Site URL scheme (ADR-0012). Pure functions: no file system, no fetch.
// Used by tools/site/preview.mjs now and by the Cloudflare Worker in Phase 5.
//
//   /                          hub
//   /p/<slug>/                 viewer (/_shell/viewer.html, ADR-0020): ?v=<vN>&s=<scenario>, #screen
//   /p/<slug>/latest/<rest>    302 → highest non-draft version, same <rest>
//   /p/<slug>/<vN>/<rest>      version files; history routing falls back to the version's index.html
//   /registry.json, /_shell/*  always revalidated
//   /_previews/<slug>.jpg      hub card screenshots

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const VERSION_PATH = new RegExp(`^/p/(${SLUG})(?:/(.*))?$`);
const HASHED_ASSET = /\/assets\/[^/]+[-.][A-Za-z0-9_-]{8,}\.[a-z0-9]+$/;
const VIEWER = '/_shell/viewer.html';
const HAS_EXTENSION = /\/[^/]+\.[A-Za-z0-9]+$/;

/** @typedef {import('./index.d.ts').RouteRegistry} RouteRegistry */
/** @typedef {import('./index.d.ts').RouteDecision} RouteDecision */

/** @param {string} path @returns {import('./index.d.ts').CacheClass} */
export function cacheClass(path) {
  if (HASHED_ASSET.test(path)) return 'immutable';
  return 'revalidate';
}

/** @param {string} path @param {string} [fallback] @param {import('./index.d.ts').CacheClass} [cache] @returns {RouteDecision} */
const asset = (path, fallback, cache = cacheClass(path)) => ({
  type: 'asset',
  path: path.endsWith('/') ? `${path}index.html` : path,
  ...(fallback ? { fallback } : {}),
  cache,
});

/** @param {string} location @returns {RouteDecision} */
const redirect = (location) => ({ type: 'redirect', location, status: 302 });

/** @type {RouteDecision} */
const notFound = { type: 'not-found' };

/** @param {import('./index.d.ts').RoutePrototype} p */
export function latestVersion(p) {
  const num = (/** @type {string} */ v) => Number(v.slice(1));
  const sorted = [...p.versions].sort((a, b) => num(a.version) - num(b.version));
  const ready = sorted.filter((v) => v.status !== 'draft');
  return (ready.at(-1) ?? sorted.at(-1))?.version ?? p.defaultVersion;
}

/**
 * Decide what to serve for a request path.
 * @param {string} pathname URL pathname, already percent-decoded is NOT required
 * @param {string} search  URL search including "?", or ""
 * @param {RouteRegistry} registry
 * @returns {RouteDecision}
 */
export function route(pathname, search, registry) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return notFound;
  }
  // No dot-segments, dotfiles, backslashes or NUL: the asset store must never see them.
  if (/(^|\/)\.|\\|\0/.test(path) || !path.startsWith('/')) return notFound;
  path = path.replace(/\/{2,}/g, '/');

  if (path === '/' || path === '/index.html') return asset('/index.html');
  if (path === '/registry.json' || path.startsWith('/_shell/')) return asset(path, undefined, 'no-cache');
  if (path === '/p' || path === '/p/') return redirect('/');

  const m = VERSION_PATH.exec(path);
  if (!m) return asset(path);
  const [, slug, rest = undefined] = m;
  const proto = registry.prototypes.find((p) => p.slug === slug);
  if (!proto) return notFound;
  if (rest === undefined) return redirect(`/p/${slug}/${search}`);
  if (rest === '') return asset(VIEWER, undefined, 'no-cache');

  const slash = rest.indexOf('/');
  const head = slash === -1 ? rest : rest.slice(0, slash);
  const tail = slash === -1 ? null : rest.slice(slash + 1);

  if (head === 'latest') return redirect(`/p/${slug}/${latestVersion(proto)}/${tail ?? ''}${search}`);

  const version = proto.versions.find((v) => v.version === head);
  if (!version) return notFound;
  if (tail === null) return redirect(`/p/${slug}/${head}/${search}`);

  const base = `/p/${slug}/${head}/`;
  const full = `${base}${tail}`;
  const isNavigation = !HAS_EXTENSION.test(full) && !full.endsWith('/');
  if (version.routing === 'history' && isNavigation) return asset(full, `${base}index.html`);
  return asset(full);
}

/**
 * Response headers for a served asset. All content is private (password-protected site).
 * @param {import('./index.d.ts').CacheClass} cache
 * @returns {Record<string, string>}
 */
export function securityHeaders(cache) {
  const cacheControl = {
    immutable: 'private, max-age=31536000, immutable',
    revalidate: 'private, no-cache',
    'no-cache': 'private, no-cache, must-revalidate',
  }[cache];
  return {
    'Cache-Control': cacheControl,
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  };
}
