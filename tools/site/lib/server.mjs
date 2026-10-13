// Node adapter for the hosting Worker (infra/worker, ADR-0015): serves dist/site through exactly the same
// request handler as Cloudflare — login, session cookies, URL scheme (@proto/site-router) and headers.
// Used by site:preview, hub screenshots, Playwright smoke tests and the visual-qa agent.
//   - with { password }: auth on, like production (a random COOKIE_SECRET per process unless given);
//   - without: open local preview (auth off) — never used for hosting.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { handle } from '@proto/worker';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ktx2': 'image/ktx2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Static assets binding over a directory, like Workers Static Assets with html_handling "none" and
 * not_found_handling "none": exact paths only, 404 otherwise.
 * @param {string} root
 */
export function directoryAssets(root) {
  const base = normalize(root + sep);
  return {
    /** @param {Request} request */
    async fetch(request) {
      const file = normalize(join(root, decodeURIComponent(new URL(request.url).pathname)));
      if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
        return new Response('Not found', { status: 404 });
      }
      const type = /** @type {Record<string, string>} */ (TYPES)[extname(file).toLowerCase()];
      return new Response(readFileSync(file), {
        headers: { 'Content-Type': type ?? 'application/octet-stream' },
      });
    },
  };
}

/**
 * @param {string} root dist/site
 * @param {{ password?: string, cookieSecret?: string, prototypePasswords?: Record<string, string> }} [opts]
 */
export function createSiteServer(root, opts = {}) {
  const auth = Boolean(opts.password);
  const env = {
    ASSETS: directoryAssets(root),
    SITE_PASSWORD: opts.password,
    COOKIE_SECRET: opts.cookieSecret ?? randomBytes(32).toString('hex'),
    PROTOTYPE_PASSWORDS: JSON.stringify(opts.prototypePasswords ?? {}),
  };
  return createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(name, value);
        else if (Array.isArray(value)) headers.set(name, value.join(', '));
      }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
        method: req.method,
        headers,
        ...(hasBody ? { body: /** @type {any} */ (Readable.toWeb(req)), duplex: 'half' } : {}),
      });
      // Registry is re-read on every request: the local site may be rebuilt while the server runs.
      const response = await handle(request, env, { auth, cacheRegistry: false });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`site server error: ${/** @type {Error} */ (err).message}`);
    }
  });
}

/**
 * Start on a free port (0) or a given one; resolves with the base URL.
 * @param {import('node:http').Server} server
 * @param {number} [port]
 * @param {string} [host]
 * @returns {Promise<string>}
 */
export function listen(server, port = 0, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolve(`http://${host}:${typeof addr === 'object' && addr ? addr.port : port}`);
    });
  });
}
