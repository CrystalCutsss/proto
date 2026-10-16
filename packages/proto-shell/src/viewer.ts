// Viewer /p/<slug>/?v=<vN>&s=<scenario>#<screen> (ADR-0020). Shows one version in an iframe:
//   - desktop prototypes: the whole window, the prototype's own background, no frame;
//   - mobile prototypes on a wide screen: a black iPhone Air mockup on the main page's black stage (no glow),
//     with the system bars drawn by the design;
//   - mobile prototypes on a phone screen (PHONE_MEDIA): the whole screen, the design's system bars hidden
//     (?bars=0), and no menu.
// Elsewhere the bottom menu switches scenario and version (or the version's menu axes, passed to the iframe as
// query parameters); the viewer URL follows the iframe's screen.
import '@proto/ui/ui.css';
import './menu.css';
import './viewer.css';
import type { RegistryPrototype, RegistryVersion } from '@proto/registry';
import bezelUrl from '../assets/iphone-air-space-black/frame.png?url';
import maskUrl from '../assets/iphone-air-space-black/mask.png?url';
import { createMenu, hideShortcut, loadRegistryPrototype, PHONE_MEDIA, pickScenario } from './menu.ts';
import { createVariants } from './variants.ts';
import {
  axisSearch,
  axisValues,
  keptScreen,
  screenFromViewerHash,
  screenKey,
  screenUrl,
  startScreen,
  versionBase,
  viewerUrl,
} from './switch.ts';

const body = document.body;
const stage = document.querySelector<HTMLElement>('.viewer-stage')!;
const slug = /^\/p\/([a-z0-9-]+)\/?/.exec(location.pathname)?.[1] ?? '';

let proto: RegistryPrototype;
let version: RegistryVersion;
let scenarioId: string;
/** Chosen menu axis items of the version (empty without axes). */
let axes: Record<string, string> = {};
let frame: HTMLIFrameElement;

const menu = createMenu({
  scenario(id) {
    const s = pickScenario(version, id);
    scenarioId = s.id;
    navigate(s.route);
  },
  version(v) {
    const target = proto.versions.find((x) => x.version === v);
    if (!target) return;
    const kept = keptScreen(currentScreen(), version, target);
    version = target;
    const s = pickScenario(version, scenarioId);
    scenarioId = s.id;
    axes = axisValues(version.axes, new URLSearchParams(axes));
    navigate(kept ?? s.route);
  },
  axis: onAxis,
});
// Phones have no menu: versions with axes get the floating variants button there (ADR-0023).
const variants = createVariants(onAxis);

/** Another axis choice is another set-up of the prototype: restart it at the start screen. */
function onAxis(id: string, value: string) {
  axes = { ...axes, [id]: value };
  navigate(startScreen(version.routing));
}

const isPhone = () => matchMedia(PHONE_MEDIA).matches;
const mode = () => (proto.platform === 'mobile' && !isPhone() ? 'device' : 'full');

/** Screen shown in the iframe, as a routes key ("#/cart" or "/cart"). */
function currentScreen(): string {
  try {
    const loc = frame.contentWindow!.location;
    if (loc.pathname.startsWith(versionBase(slug, version.version)))
      return screenKey(loc, versionBase(slug, version.version), version.routing);
  } catch {
    // not loaded yet
  }
  return screenFromViewerHash(location.hash, version.routing) ?? pickScenario(version, scenarioId).route;
}

function frameSearch() {
  return axisSearch(axes, proto.platform === 'mobile' && mode() === 'full' ? { bars: '0' } : {});
}

function syncUrl(key = currentScreen()) {
  history.replaceState(null, '', viewerUrl(slug, version.version, scenarioId, key, axes));
  document.title = `${proto.title} · ${version.version}`;
  const state = { proto, version, scenario: pickScenario(version, scenarioId), axes };
  menu.update(state);
  variants.update(state);
}

function navigate(key: string) {
  const url = screenUrl(slug, version, key, frameSearch());
  // Once a document is loaded, replace it: setting src would add a history entry, and browser Back would bring
  // back the previous version or menu axes while the menu shows the new ones.
  try {
    if (frame.src && frame.contentWindow) frame.contentWindow.location.replace(url);
    else frame.src = url;
  } catch {
    frame.src = url;
  }
  syncUrl(key);
}

function layout() {
  const m = mode();
  body.toggleAttribute('data-phone', isPhone());
  // No space for a menu that is hidden (Alt+Shift+H) or not shown at all (mobile browsers, menu.css).
  const menuSpace = menu.element.getClientRects().length ? menu.element.offsetHeight + 32 : 0;
  body.style.setProperty('--viewer-menu-space', `${menuSpace}px`);
  if (body.dataset.mode !== m) {
    body.dataset.mode = m;
    body.classList.toggle('ds-stage', m === 'device');
    const device = stage.querySelector('.viewer-device');
    if (m === 'device' && !device) {
      const wrap = document.createElement('div');
      wrap.className = 'viewer-device';
      const screen = document.createElement('div');
      screen.className = 'viewer-screen';
      screen.style.setProperty('--device-mask', `url("${maskUrl}")`);
      const bezel = document.createElement('img');
      bezel.className = 'viewer-bezel';
      bezel.src = bezelUrl;
      bezel.alt = '';
      screen.append(frame);
      wrap.append(screen, bezel);
      stage.replaceChildren(wrap);
    } else if (m === 'full' && device) {
      stage.replaceChildren(frame);
    }
    // Bars are shown in the mockup and hidden on a phone screen: reload with the right flag.
    if (frame.src && proto.platform === 'mobile') navigate(currentScreen());
  }
  if (m === 'device') {
    const styles = getComputedStyle(body);
    const deviceHeight = parseFloat(styles.getPropertyValue('--device-height')) || 871;
    const deviceWidth = parseFloat(styles.getPropertyValue('--device-width')) || 433;
    const scale = Math.min(1, (innerHeight - menuSpace - 32) / deviceHeight, (innerWidth - 32) / deviceWidth);
    body.style.setProperty('--device-scale', String(Math.max(0.3, scale)));
  }
}

function watchFrame() {
  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) return;
    try {
      const update = () => syncUrl();
      win.addEventListener('hashchange', update);
      win.addEventListener('popstate', update);
      hideShortcut(menu.element, [win]);
      update();
    } catch {
      // cross-origin (should not happen): the URL then follows menu choices only
    }
  });
}

function fail(text: string) {
  stage.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'viewer-message';
  p.textContent = text;
  stage.append(p);
}

async function start() {
  const found = slug ? await loadRegistryPrototype(slug) : null;
  if (!found) return fail('Прототип не найден.');
  proto = found;
  const params = new URLSearchParams(location.search);
  version =
    proto.versions.find((v) => v.version === params.get('v')) ??
    proto.versions.find((v) => v.version === proto.defaultVersion) ??
    proto.versions.at(-1)!;
  const s = pickScenario(version, params.get('s'));
  scenarioId = s.id;
  axes = axisValues(version.axes, params);
  const key = screenFromViewerHash(location.hash, version.routing) ?? s.route;

  frame = document.createElement('iframe');
  frame.className = 'viewer-frame';
  frame.title = proto.title;
  frame.allow = 'clipboard-write; fullscreen';
  watchFrame();
  document.body.append(menu.element, ...variants.elements);
  hideShortcut(menu.element, [window]);
  stage.replaceChildren(frame);
  layout();
  navigate(key);
  addEventListener('resize', layout);
  new MutationObserver(layout).observe(menu.element, { attributes: true, attributeFilter: ['hidden'] });
  // The menu's height changes when its controls are rebuilt (menu axes) or wrap.
  new ResizeObserver(() => layout()).observe(menu.element);
}

start().catch((err: Error) => fail(`Не удалось открыть прототип: ${err.message}`));
