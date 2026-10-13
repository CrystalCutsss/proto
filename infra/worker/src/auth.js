// Password check and signed session cookies (ADR-0006, ADR-0015). Web Crypto only, so the same code runs in
// the Cloudflare Worker and in Node (site:preview, tests).
//
// Session token: v1.<scope>.<expires>.<signature>
//   scope     "site" for the whole site, or a prototype slug for a prototype with its own password;
//   expires   Unix seconds;
//   signature HMAC-SHA256 over "v1.<scope>.<expires>" with a key derived from COOKIE_SECRET and the scope's
//             password, so changing either secret signs everybody out.

export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();

/** @param {Uint8Array} bytes */
const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** @param {string} text @returns {Uint8Array<ArrayBuffer> | null} */
const fromB64url = (text) => {
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

/** @param {string} secret */
const hmacKey = (secret) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

/**
 * Constant-time password comparison: both sides go through HMAC, the result is checked with subtle.verify.
 * @param {string} input @param {string} password @param {string} cookieSecret
 */
export async function passwordMatches(input, password, cookieSecret) {
  if (!password) return false;
  const key = await hmacKey(`password\n${cookieSecret}`);
  const expected = await crypto.subtle.sign('HMAC', key, enc.encode(password));
  return crypto.subtle.verify('HMAC', key, expected, enc.encode(input));
}

/** @param {string} cookieSecret @param {string} password */
const sessionKey = (cookieSecret, password) => hmacKey(`session\n${cookieSecret}\n${password}`);

/**
 * @param {{ scope: string, cookieSecret: string, password: string, now?: number }} o
 * @returns {Promise<string>}
 */
export async function createSession({ scope, cookieSecret, password, now = Date.now() }) {
  const expires = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const message = `v1.${scope}.${expires}`;
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(cookieSecret, password), enc.encode(message));
  return `${message}.${b64url(new Uint8Array(sig))}`;
}

/**
 * @param {string | undefined} token
 * @param {{ scope: string, cookieSecret: string, password: string, now?: number }} o
 */
export async function verifySession(token, { scope, cookieSecret, password, now = Date.now() }) {
  if (!token || !password) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || parts[1] !== scope) return false;
  const expires = Number(parts[2]);
  if (!Number.isInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  const sig = fromB64url(parts[3] ?? '');
  if (!sig) return false;
  return crypto.subtle.verify(
    'HMAC',
    await sessionKey(cookieSecret, password),
    sig,
    enc.encode(`v1.${parts[1]}.${parts[2]}`),
  );
}

/** Cookie name for a scope. @param {string} scope */
export const cookieName = (scope) => (scope === 'site' ? 'proto_session' : `proto_session_${scope}`);

/** @param {string | null} header @returns {Record<string, string>} */
export function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/**
 * Set-Cookie value. Secure on https only, so the local http preview keeps working.
 * @param {string} scope @param {string} token @param {boolean} secure @param {number} [maxAge]
 */
export function sessionCookie(scope, token, secure, maxAge = SESSION_TTL_SECONDS) {
  return [
    `${cookieName(scope)}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
