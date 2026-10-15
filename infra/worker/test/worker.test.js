import { describe, expect, it } from 'vitest';
import { createSession, passwordMatches, verifySession } from '../src/auth.js';
import worker, { handle } from '../src/index.js';

const SECRET = 'x'.repeat(40);
const registry = {
  prototypes: [
    {
      slug: 'demo',
      title: 'Демо',
      defaultVersion: 'v1',
      separatePassword: false,
      versions: [
        { version: 'v1', status: 'frozen', routing: 'hash' },
        { version: 'v2', status: 'review', routing: 'history' },
      ],
    },
    {
      slug: 'secret',
      title: 'Секрет',
      defaultVersion: 'v1',
      separatePassword: true,
      versions: [{ version: 'v1', status: 'draft', routing: 'hash' }],
    },
  ],
};
const files = {
  '/index.html': ['hub', 'text/html'],
  '/registry.json': [JSON.stringify(registry), 'application/json'],
  '/robots.txt': ['User-agent: *\nDisallow: /\n', 'text/plain'],
  '/_shell/viewer.html': ['viewer', 'text/html'],
  '/p/demo/v1/index.html': ['demo v1', 'text/html'],
  '/p/demo/v2/index.html': ['demo v2 spa', 'text/html'],
  '/p/demo/v1/assets/app-AbCdEf12.js': ['js', 'text/javascript'],
  '/p/secret/v1/index.html': ['secret v1', 'text/html'],
  '/_previews/secret.jpg': ['jpg', 'image/jpeg'],
};
/** Fake static assets binding: exact paths, like html_handling "none". */
const ASSETS = {
  /** @param {Request} req */
  async fetch(req) {
    const hit = /** @type {Record<string, string[]>} */ (files)[new URL(req.url).pathname];
    return hit
      ? new Response(hit[0], { headers: { 'Content-Type': hit[1] ?? '' } })
      : new Response('nope', { status: 404 });
  },
};
const env = {
  ASSETS,
  SITE_PASSWORD: 'site-pass',
  COOKIE_SECRET: SECRET,
  PROTOTYPE_PASSWORDS: JSON.stringify({ secret: 'proto-pass' }),
};
const ORIGIN = 'https://proto.example.workers.dev';
const html = { Accept: 'text/html' };

/** @param {string} path @param {RequestInit} [init] @param {any} [e] */
const get = (path, init = {}, e = env) => handle(new Request(ORIGIN + path, init), e);

/** Log in and return the cookie header value. @param {string} password @param {string} [scope] */
async function login(password, scope = 'site') {
  const body = new URLSearchParams({ password, scope, next: '/p/demo/' });
  const res = await get('/_auth/login', { method: 'POST', body });
  return { res, cookie: (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '' };
}

describe('sessions', () => {
  it('sign and verify, bound to scope, password and expiry', async () => {
    const o = { scope: 'site', cookieSecret: SECRET, password: 'p' };
    const token = await createSession(o);
    expect(await verifySession(token, o)).toBe(true);
    expect(await verifySession(token, { ...o, scope: 'demo' })).toBe(false);
    expect(await verifySession(token, { ...o, password: 'changed' })).toBe(false);
    expect(await verifySession(token, { ...o, cookieSecret: 'y'.repeat(40) })).toBe(false);
    expect(await verifySession(token, { ...o, now: Date.now() + 15 * 24 * 3600 * 1000 })).toBe(false);
    const [v, s, exp, sig] = token.split('.');
    expect(await verifySession(`${v}.${s}.${Number(exp) + 999}.${sig}`, o)).toBe(false);
    expect(await verifySession('garbage', o)).toBe(false);
  });

  it('compares passwords', async () => {
    expect(await passwordMatches('abc', 'abc', SECRET)).toBe(true);
    expect(await passwordMatches('abd', 'abc', SECRET)).toBe(false);
    expect(await passwordMatches('', '', SECRET)).toBe(false);
  });
});

describe('worker', () => {
  it('fails closed without secrets or with a short cookie secret', async () => {
    for (const bad of [
      { ...env, SITE_PASSWORD: undefined },
      { ...env, COOKIE_SECRET: undefined },
      { ...env, COOKIE_SECRET: 'short' },
    ]) {
      const res = await get('/', { headers: html }, bad);
      expect(res.status).toBe(503);
      expect(await res.text()).not.toContain('hub');
    }
    // the default export is the authenticated pipeline
    const res = await worker.fetch(new Request(`${ORIGIN}/`), { ...env, SITE_PASSWORD: undefined });
    expect(res.status).toBe(503);
  });

  it('asks for login: form for pages, 401 for other requests, robots.txt is public', async () => {
    const page = await get('/p/demo/v1/', { headers: html });
    expect(page.status).toBe(401);
    expect(page.headers.get('Cache-Control')).toBe('no-store');
    const body = await page.text();
    expect(body).toContain('name="password"');
    expect(body).toContain('value="/p/demo/v1/"');
    expect((await get('/registry.json')).status).toBe(401);
    expect((await get('/p/demo/v1/assets/app-AbCdEf12.js')).status).toBe(401);
    expect(await (await get('/robots.txt')).text()).toContain('Disallow');
  });

  it('logs in with the right password only and sets a secure HttpOnly cookie', async () => {
    const bad = await login('wrong');
    expect(bad.res.status).toBe(401);
    expect(bad.res.headers.get('Set-Cookie')).toBeNull();
    expect(await bad.res.text()).toContain('Неверный пароль');

    const ok = await login('site-pass');
    expect(ok.res.status).toBe(303);
    expect(ok.res.headers.get('Location')).toBe('/p/demo/');
    const set = ok.res.headers.get('Set-Cookie') ?? '';
    expect(set).toMatch(
      /^proto_session=v1\.site\.\d+\.[\w-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/,
    );

    const hub = await get('/', { headers: { Cookie: ok.cookie } });
    expect(hub.status).toBe(200);
    expect(await hub.text()).toBe('hub');
    expect(hub.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('never redirects off-site after login', async () => {
    for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      const res = await get('/_auth/login', {
        method: 'POST',
        body: new URLSearchParams({ password: 'site-pass', next }),
      });
      expect(res.headers.get('Location')).toBe('/');
    }
  });

  it('routes like site-router: viewer, redirects, immutable assets, history fallback, 404', async () => {
    const { cookie } = await login('site-pass');
    const h = { Cookie: cookie };
    expect(await (await get('/p/demo/?v=v1', { headers: h })).text()).toBe('viewer');
    const r = await get('/p/demo', { headers: h });
    expect(r.status).toBe(302);
    expect(r.headers.get('Location')).toBe('/p/demo/');
    const js = await get('/p/demo/v1/assets/app-AbCdEf12.js', { headers: h });
    expect(js.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable');
    expect(js.headers.get('Content-Type')).toBe('text/javascript');
    expect(await (await get('/p/demo/v2/deep/screen', { headers: h })).text()).toBe('demo v2 spa');
    expect((await get('/p/demo/v1/deep/screen', { headers: h })).status).toBe(404);
    expect((await get('/p/nope/v1/', { headers: h })).status).toBe(404);
    expect((await get('/', { method: 'DELETE', headers: h })).status).toBe(405);
    const head = await get('/', { method: 'HEAD', headers: h });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('separate passwords protect the prototype and its hub preview', async () => {
    const { cookie } = await login('site-pass');
    const page = await get('/p/secret/v1/', { headers: { Cookie: cookie, ...html } });
    expect(page.status).toBe(401);
    expect(await page.text()).toContain('value="secret"');
    expect((await get('/_previews/secret.jpg', { headers: { Cookie: cookie } })).status).toBe(401);

    const proto = await login('proto-pass', 'secret');
    expect(proto.res.status).toBe(303);
    const both = `${cookie}; ${proto.cookie}`;
    expect(await (await get('/p/secret/v1/', { headers: { Cookie: both } })).text()).toBe('secret v1');
    // the prototype session alone is not enough, and the site password does not open it
    expect((await get('/p/secret/v1/', { headers: { Cookie: proto.cookie } })).status).toBe(401);
    expect((await login('site-pass', 'secret')).res.status).toBe(401);
  });

  it('a separate-password prototype without its password configured is closed', async () => {
    const { cookie } = await login('site-pass');
    const res = await get(
      '/p/secret/v1/',
      { headers: { Cookie: cookie } },
      { ...env, PROTOTYPE_PASSWORDS: '{}' },
    );
    expect(res.status).toBe(403);
  });

  it('logout clears the session cookie', async () => {
    const res = await get('/_auth/logout');
    expect(res.status).toBe(303);
    expect(res.headers.get('Set-Cookie')).toMatch(/^proto_session=; .*Max-Age=0/);
  });
});
