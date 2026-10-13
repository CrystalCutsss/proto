// @ts-check
// /_shell/loader.js — injected into every version by @proto/build-kit and copied to dist verbatim
// (no bundler helpers). Keeps first paint and the main thread untouched: the panel is fetched only
// when the browser is idle. Disabled by ?shell=0 and inside iframes (compare page). ADR-0011.
const params = new URLSearchParams(location.search);
if (params.get('shell') !== '0' && window.top === window.self) {
  const shellUrl = '/_shell/shell.js';
  const load = () => void import(shellUrl);
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}
