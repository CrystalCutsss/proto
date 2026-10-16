// @ts-check
// /_shell/loader.js — injected into every version by @proto/build-kit and copied to dist verbatim (no bundler
// helpers). Unhashed, so frozen versions get its updates too (ADR-0011). ADR-0020:
//   - marks <html> with data-proto-display = browser | standalone | embed and, where the device has its own
//     bars (an installed web app, or the viewer's full-screen phone mode, ?bars=0), data-proto-bars="hidden":
//     prototypes hide their drawn status bar / home indicator ([data-proto-system-bar]) and pad with
//     env(safe-area-inset-*) instead;
//   - a version opened directly in a browser tab moves to the viewer (/p/<slug>/), which adds the device
//     mockup and the scenario/version menu; ?shell=0 keeps the bare page (screenshots, debugging);
//   - an installed web app (display-mode: standalone) loads the menu into the page when the browser is idle.
const params = new URLSearchParams(location.search);
const html = document.documentElement;
const embedded = window.top !== window.self;
const standalone =
  params.get('proto-display') === 'standalone' ||
  matchMedia('(display-mode: standalone)').matches ||
  /** @type {{ standalone?: boolean }} */ (navigator).standalone === true;

html.dataset.protoDisplay = embedded ? 'embed' : standalone ? 'standalone' : 'browser';
if (embedded ? params.get('bars') === '0' : standalone) {
  html.dataset.protoBars = 'hidden';
  const style = document.createElement('style');
  style.dataset.protoShell = '';
  style.textContent = '[data-proto-bars="hidden"] [data-proto-system-bar]{display:none!important}';
  document.head.append(style);
}

if (!embedded && params.get('shell') !== '0') {
  if (standalone) {
    const shellUrl = '/_shell/shell.js';
    const load = () => void import(shellUrl);
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 500);
  } else {
    const meta = (/** @type {string} */ name) =>
      document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? '';
    const m = /^\/p\/([a-z0-9-]+)\/(v\d+)\/(.*)$/.exec(location.pathname);
    const slug = meta('proto:prototype') || m?.[1];
    const version = meta('proto:version') || m?.[2];
    if (slug && version) {
      // Screen: the hash (hash routing) or the path after the version (history routing).
      const rest = m?.[3]?.replace(/index\.html$/, '') ?? '';
      const screen = location.hash.startsWith('#/') ? location.hash : rest ? `#/${rest}` : '';
      // Keep the scenario and menu axis values (?s=, ?<axis>=); drop what only this page uses.
      const q = new URLSearchParams({ v: version });
      for (const [k, val] of params)
        if (!['v', 'shell', 'bars', 'proto-display'].includes(k)) q.append(k, val);
      location.replace(`/p/${slug}/?${q}${screen}`);
    }
  }
}
