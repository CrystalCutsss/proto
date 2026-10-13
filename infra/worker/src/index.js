// Cloudflare Worker for the prototype site (ADR-0006, ADR-0015). Runs before every asset (run_worker_first):
//   1. fail closed: without SITE_PASSWORD and a long COOKIE_SECRET nothing is served;
//   2. login form → HMAC-signed session cookie; prototypes with separatePassword need their own session;
//   3. URL scheme from @proto/site-router (ADR-0012): redirects, version fallback, cache and security headers;
//   4. files come from the static assets binding (env.ASSETS), served by exact path.
// tools/site/lib/server.mjs runs the same handler in Node for site:preview and Playwright.
import { route, securityHeaders } from '@proto/site-router';
import {
  MIN_SECRET_LENGTH,
  cookieName,
  createSession,
  parseCookies,
  passwordMatches,
  sessionCookie,
  verifySession,
} from './auth.js';
import { loginPage, messagePage, pageHeaders } from './pages.js';

/**
 * @typedef {{ fetch(request: Request): Promise<Response> }} AssetsBinding
 * @typedef {{
 *   ASSETS: AssetsBinding,
 *   SITE_PASSWORD?: string,
 *   COOKIE_SECRET?: string,
 *   PROTOTYPE_PASSWORDS?: string,
 * }} Env
 * @typedef {{ slug: string, title?: string, separatePassword?: boolean, defaultVersion: string,
 *   versions: { version: string, status: string, routing: 'hash' | 'history' }[] }} SitePrototype
 * @typedef {{ prototypes: SitePrototype[] }} SiteRegistry
 * @typedef {{ auth?: boolean, cacheRegistry?: boolean }} Options
 */

const PUBLIC_PATHS = new Set(['/robots.txt']);
/** @type {WeakMap<AssetsBinding, SiteRegistry>} */
const registryCache = new WeakMap();

/** @param {string} body @param {number} status @param {Record<string, string>} [headers] */
const html = (body, status, headers = {}) =>
  new Response(body, { status, headers: { ...pageHeaders, ...headers } });

/** @param {string} location @param {Record<string, string>} [headers] */
const redirect = (location, headers = {}) =>
  new Response(null, {
    status: 303,
    headers: { Location: location, 'Cache-Control': 'no-store', ...headers },
  });

/** Same-origin path only: "/x" yes, "//evil" and "https://…" no. @param {string | null} next */
const safeNext = (next) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';

/** @param {Env} env @param {string} url @param {boolean} cache */
async function loadRegistry(env, url, cache) {
  const cached = cache ? registryCache.get(env.ASSETS) : undefined;
  if (cached) return cached;
  const res = await env.ASSETS.fetch(new Request(new URL('/registry.json', url)));
  if (!res.ok) throw new Error(`registry.json: HTTP ${res.status}`);
  const registry = /** @type {SiteRegistry} */ (await res.json());
  if (cache) registryCache.set(env.ASSETS, registry);
  return registry;
}

/** @param {Env} env @returns {Record<string, string>} */
function prototypePasswords(env) {
  try {
    const parsed = JSON.parse(env.PROTOTYPE_PASSWORDS ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Which prototype a path belongs to, for separate passwords (pages and hub previews). @param {string} path */
function prototypeOf(path) {
  return /^\/p\/([a-z0-9-]+)(\/|$)/.exec(path)?.[1] ?? /^\/_previews\/([a-z0-9-]+)\.[a-z]+$/.exec(path)?.[1];
}

/**
 * @param {Request} request @param {Env} env @param {string} scope @param {string} password
 */
async function hasSession(request, env, scope, password) {
  const token = parseCookies(request.headers.get('Cookie'))[cookieName(scope)];
  return verifySession(token, { scope, cookieSecret: /** @type {string} */ (env.COOKIE_SECRET), password });
}

/**
 * Login form submission. @param {Request} request @param {Env} env @param {SiteRegistry} registry
 */
async function login(request, env, registry) {
  const form = await request.formData().catch(() => null);
  const input = String(form?.get('password') ?? '');
  const scope = String(form?.get('scope') ?? 'site');
  const next = safeNext(String(form?.get('next') ?? '/'));
  const proto = registry.prototypes.find((p) => p.slug === scope);
  if (scope !== 'site' && !proto?.separatePassword) return redirect('/');
  const password = scope === 'site' ? env.SITE_PASSWORD : prototypePasswords(env)[scope];
  const secret = /** @type {string} */ (env.COOKIE_SECRET);
  if (!password || !(await passwordMatches(input, password, secret))) {
    return html(loginPage({ next, scope, scopeTitle: proto?.title, error: true }), 401);
  }
  const token = await createSession({ scope, cookieSecret: secret, password });
  return redirect(next, {
    'Set-Cookie': sessionCookie(scope, token, new URL(request.url).protocol === 'https:'),
  });
}

/** @param {Request} request @param {string} scope @param {string} [scopeTitle] */
function askLogin(request, scope, scopeTitle) {
  const url = new URL(request.url);
  const next = `${url.pathname}${url.search}`;
  const navigation = request.method === 'GET' && (request.headers.get('Accept') ?? '').includes('text/html');
  if (!navigation) return new Response('Authentication required', { status: 401, headers: pageHeaders });
  return html(loginPage({ next, scope, scopeTitle }), 401);
}

/**
 * Serve a routed asset: exact path, then the version fallback, with the router's headers.
 * @param {Env} env @param {string} origin @param {string} path @param {string | undefined} fallback
 * @param {import('@proto/site-router').CacheClass} cache @param {string} method
 */
async function serveAsset(env, origin, path, fallback, cache, method) {
  let res = await env.ASSETS.fetch(new Request(new URL(path, origin), { method }));
  if (res.status === 404 && fallback)
    res = await env.ASSETS.fetch(new Request(new URL(fallback, origin), { method }));
  if (!res.ok)
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders('no-cache') },
    });
  const headers = new Headers(securityHeaders(cache));
  for (const name of ['Content-Type', 'Content-Length', 'ETag', 'Last-Modified']) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(method === 'HEAD' ? null : res.body, { status: 200, headers });
}

/**
 * The whole request pipeline. `auth: false` exists only for the local open preview (no password set).
 * @param {Request} request @param {Env} env @param {Options} [opts]
 * @returns {Promise<Response>}
 */
export async function handle(request, env, { auth = true, cacheRegistry = true } = {}) {
  const url = new URL(request.url);
  if (auth && (!env.SITE_PASSWORD || (env.COOKIE_SECRET ?? '').length < MIN_SECRET_LENGTH)) {
    return html(messagePage('Сайт не настроен: не заданы секреты SITE_PASSWORD и COOKIE_SECRET.'), 503);
  }
  const registry = await loadRegistry(env, request.url, cacheRegistry);

  if (url.pathname === '/_auth/login') {
    if (request.method === 'POST') return auth ? login(request, env, registry) : redirect('/');
    const scope = url.searchParams.get('scope') ?? 'site';
    return html(loginPage({ next: safeNext(url.searchParams.get('next')), scope }), 200);
  }
  if (url.pathname === '/_auth/logout') {
    const secure = url.protocol === 'https:';
    return redirect('/_auth/login', { 'Set-Cookie': sessionCookie('site', '', secure, 0) });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  if (auth && !PUBLIC_PATHS.has(url.pathname)) {
    if (!(await hasSession(request, env, 'site', /** @type {string} */ (env.SITE_PASSWORD)))) {
      return askLogin(request, 'site');
    }
    const slug = prototypeOf(url.pathname);
    const proto = slug ? registry.prototypes.find((p) => p.slug === slug) : undefined;
    if (proto?.separatePassword) {
      const password = prototypePasswords(env)[proto.slug];
      if (!password) {
        return html(
          messagePage(`Для прототипа «${proto.title ?? proto.slug}» не задан отдельный пароль.`),
          403,
        );
      }
      if (!(await hasSession(request, env, proto.slug, password)))
        return askLogin(request, proto.slug, proto.title);
    }
  }

  const decision = route(url.pathname, url.search, registry);
  if (decision.type === 'redirect') {
    return new Response(null, {
      status: decision.status,
      headers: { Location: decision.location, 'Cache-Control': 'private, no-cache' },
    });
  }
  if (decision.type === 'not-found') {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders('no-cache') },
    });
  }
  return serveAsset(env, url.origin, decision.path, decision.fallback, decision.cache, request.method);
}

export default {
  /** @param {Request} request @param {Env} env */
  fetch: (request, env) => handle(request, env),
};
