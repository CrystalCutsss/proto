// Self-contained auth pages: served before login, so they load nothing from the protected site.
// Inline styles use system fonts and neutral colours on purpose (no tokens are reachable here).

/** @param {string} s */
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

const STYLE = `
:root{color-scheme:light dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:Canvas;color:CanvasText}
main{width:min(360px,calc(100vw - 32px));display:grid;gap:16px}
h1{font-size:24px;margin:0}
p{margin:0;opacity:.75;line-height:1.4}
form{display:grid;gap:12px}
input{font:inherit;padding:12px;border-radius:12px;border:1px solid GrayText}
button{font:inherit;font-weight:600;padding:12px;border:0;border-radius:12px;background:#ffdd2d;color:#333;cursor:pointer}
.error{color:#d92b2b;opacity:1}`;

/**
 * @param {{ title: string, body: string }} o
 * @returns {string}
 */
const layout = ({ title, body }) =>
  `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${STYLE}</style></head>` +
  `<body><main>${body}</main></body></html>`;

/**
 * @param {{ next: string, scope: string, scopeTitle?: string, error?: boolean }} o
 */
export function loginPage({ next, scope, scopeTitle, error = false }) {
  const what = scope === 'site' ? 'прототипам' : `прототипу «${esc(scopeTitle ?? scope)}»`;
  return layout({
    title: 'Вход',
    body:
      `<h1>Вход</h1><p>Доступ к ${what} по паролю.</p>` +
      (error ? '<p class="error" role="alert">Неверный пароль.</p>' : '') +
      `<form method="post" action="/_auth/login">` +
      `<input type="hidden" name="next" value="${esc(next)}"><input type="hidden" name="scope" value="${esc(scope)}">` +
      `<label for="password">Пароль</label>` +
      `<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>` +
      `<button type="submit">Войти</button></form>`,
  });
}

/** @param {string} message */
export const messagePage = (message) =>
  layout({ title: 'proto', body: `<h1>proto</h1><p>${esc(message)}</p>` });

/** Headers for auth pages: never cached, never indexed, nothing but inline styles. */
export const pageHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
};
