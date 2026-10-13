// Static server for dist/site using the shared URL scheme (@proto/site-router), for site:preview,
// hub screenshots and Playwright smoke tests. Auth hook: HTTP Basic when PROTO_PREVIEW_PASSWORD is set;
// the real login (HMAC cookie) arrives with the Worker in Phase 5 and will plug in here.
import { timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { route, securityHeaders } from '@proto/site-router';

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

/** @param {string} a @param {string} b */
const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {string | undefined} password
 */
export function authorized(req, password) {
  if (!password) return true;
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  return safeEqual(decoded.slice(decoded.indexOf(':') + 1), password);
}

/**
 * @param {string} root dist/site
 * @param {{ password?: string }} [opts]
 */
export function createSiteServer(root, opts = {}) {
  const base = normalize(root + sep);
  /** @param {string} urlPath */
  const fileFor = (urlPath) => {
    const file = normalize(join(root, urlPath));
    if (!file.startsWith(base)) return null;
    return existsSync(file) && statSync(file).isFile() ? file : null;
  };
  const registry = () => JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8'));
  let cached = registry();

  return createServer((req, res) => {
    if (!authorized(req, opts.password)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="proto", charset="UTF-8"',
        'Cache-Control': 'no-store',
      });
      res.end('Authentication required');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/registry.json') cached = registry();
    const decision = route(url.pathname, url.search, cached);
    if (decision.type === 'redirect') {
      res.writeHead(decision.status, { Location: decision.location, 'Cache-Control': 'private, no-cache' });
      res.end();
      return;
    }
    const file =
      decision.type === 'asset'
        ? (fileFor(decision.path) ?? (decision.fallback ? fileFor(decision.fallback) : null))
        : null;
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders('no-cache') });
      res.end('Not found');
      return;
    }
    const cache = decision.type === 'asset' ? decision.cache : 'no-cache';
    res.writeHead(200, {
      'Content-Type':
        /** @type {Record<string, string>} */ (TYPES)[extname(file).toLowerCase()] ??
        'application/octet-stream',
      ...securityHeaders(cache),
    });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
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
