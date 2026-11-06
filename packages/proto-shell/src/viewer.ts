// Viewer /p/<slug>/?v=<vN>&s=<scenario>#<screen> (ADR-0020). Shows one version in an iframe:
//   - desktop prototypes: the whole window, the prototype's own background, no frame;
//   - mobile prototypes on a wide screen: a black iPhone Air mockup on the main page's black stage (no glow),
//     with the system bars drawn by the design;
//   - mobile prototypes on a phone screen (PHONE_MEDIA): the whole screen, the design's system bars hidden
//     (?bars=0), and no menu.
// Elsewhere the menu (a floating button in the bottom-right corner, ADR-0026) switches scenario and version (or the version's menu axes, passed to the iframe as
// query parameters); the viewer URL follows the iframe's screen. A prototype with several platforms also gets an
// «Экран» control on a wide screen (ПК: whole window / Телефон: mockup), kept in the URL as ?screen=
// (ADR-0025).
import '@proto/ui/ui.css';
import './menu.css';
import './viewer.css';
import type { Platform, RegistryPrototype, RegistryVersion } from '@proto/registry';
import bezelUrl from '../assets/iphone-air-space-black/frame.png?url';
import maskUrl from '../assets/iphone-air-space-black/mask.png?url';
import {
  createMenu,
  followCornerLift,
  followPrototypeTheme,
  isShadcnMenu,
  loadRegistryPrototype,
  menuAxes,
  menuToggle,
  PHONE_MEDIA,
  pickScenario,
} from './menu.ts';
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
/** Platform the viewer shows now: proto.platform, or another of proto.platforms chosen in the menu (ADR-0025). */
let screen: Platform;
let scenarioId: string;
/** Chosen menu axis items of the version (empty without axes). */
let axes: Record<string, string> = {};
/** Last axis choice, kept while a version without axes shows them greyed out and restored on return. */
let keptAxes: Record<string, string> = {};
let frame: HTMLIFrameElement;

const handlers = {
  scenario(id: string) {
    const s = pickScenario(version, id);
    scenarioId = s.id;
    navigate(s.route);
  },
  version: onVersion,
  axis: onAxis,
  screen(p: Platform) {
    if (!proto.platforms.includes(p) || p === screen) return;
    // Moving the iframe into or out of the mockup reloads it from its src attribute: keep the current screen.
    const key = currentScreen();
    screen = p;
    layout();
    navigate(key);
  },
};
const menu = createMenu(handlers);
// Wide screens: the menu opens from a floating button in the bottom-right corner, collapsed at first (ADR-0026).
const toggle = menuToggle(menu.element);
// Phones have no menu: they get the floating variants button with the same controls instead (ADR-0023).
const variants = createVariants(handlers);

function onVersion(v: string) {
  const target = proto.versions.find((x) => x.version === v);
  if (!target) return;
  const kept = keptScreen(currentScreen(), version, target);
  version = target;
  const s = pickScenario(version, scenarioId);
  scenarioId = s.id;
  axes = axisValues(version.axes, new URLSearchParams(keptAxes));
  navigate(kept ?? s.route);
}

/** Another axis choice is another set-up of the prototype: restart it at the start screen. */
function onAxis(id: string, value: string) {
  axes = { ...axes, [id]: value };
  keptAxes = { ...keptAxes, ...axes };
  navigate(startScreen(version.routing));
}

const isPhone = () => matchMedia(PHONE_MEDIA).matches;
const mode = () => (screen === 'mobile' && !isPhone() ? 'device' : 'full');

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
  return axisSearch(axes, screen === 'mobile' && mode() === 'full' ? { bars: '0' } : {});
}

function syncUrl(key = currentScreen()) {
  const kept = menuAxes(proto, version).disabled ? keptAxes : {};
  history.replaceState(null, '', withScreen(viewerUrl(slug, version.version, scenarioId, key, axes, kept)));
  document.title = `${proto.title} · ${version.version}`;
  const state = { proto, version, scenario: pickScenario(version, scenarioId), axes, keptAxes, screen };
  menu.update(state);
  variants.update(state);
}

/** The chosen screen in the viewer URL, only when it is not the prototype's default. */
function withScreen(url: string) {
  if (screen === proto.platform) return url;
  const u = new URL(url, location.origin);
  u.searchParams.set('screen', screen);
  return `${u.pathname}${u.search}${u.hash}`;
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
  syncPageBackground();
  syncSafeArea();
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
    syncLift();
    // Bars are shown in the mockup and hidden on a phone screen: reload with the right flag.
    if (frame.src && screen === 'mobile') navigate(currentScreen());
  }
  if (m === 'device') {
    const styles = getComputedStyle(body);
    const deviceHeight = parseFloat(styles.getPropertyValue('--device-height')) || 871;
    const deviceWidth = parseFloat(styles.getPropertyValue('--device-width')) || 433;
    const scale = Math.min(1, (innerHeight - 32) / deviceHeight, (innerWidth - 32) / deviceWidth);
    body.style.setProperty('--device-scale', String(Math.max(0.3, scale)));
  }
}

const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const STAGE_THEME = themeColor?.content ?? '';
/** Page background of the prototype in the frame (its body, else its root), or null when it has none. */
function framePageBackground(): string | null {
  try {
    const doc = frame.contentDocument;
    if (!doc?.body) return null;
    const transparent = (c: string) => c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c);
    for (const el of [doc.body, doc.documentElement]) {
      const color = getComputedStyle(el).backgroundColor;
      if (!transparent(color)) return color;
    }
  } catch {
    // cross-origin (should not happen)
  }
  return null;
}

/**
 * On a phone screen the browser's status bar and the home indicator strip below the frame show the viewer's own
 * background: make it (and theme-color) the prototype's page background instead of the black stage.
 */
function syncPageBackground() {
  const color = isPhone() ? framePageBackground() : null;
  body.style.background = color ?? '';
  if (themeColor)
    themeColor.content = isPhone() ? (color ?? getComputedStyle(body).backgroundColor) : STAGE_THEME;
}

const safeArea = document.createElement('div');
safeArea.className = 'viewer-safe-area';
safeArea.setAttribute('aria-hidden', 'true');

/** Hand the device's safe-area insets to the prototype in the frame (env() is 0 inside an iframe). */
function syncSafeArea() {
  try {
    const root = frame.contentDocument?.documentElement;
    if (!root) return;
    if (!isPhone()) {
      root.style.removeProperty('--proto-safe-area-inset-top');
      root.style.removeProperty('--proto-safe-area-inset-bottom');
      return;
    }
    const s = getComputedStyle(safeArea);
    root.style.setProperty('--proto-safe-area-inset-top', s.paddingTop);
    root.style.setProperty('--proto-safe-area-inset-bottom', s.paddingBottom);
  } catch {
    // cross-origin (should not happen)
  }
}

let stopLift: (() => void) | null = null;

/**
 * On the whole window the prototype's own floating button may sit in the menu button's corner: raise the menu button above it (ADR-0026). In the mockup the prototype is inside the phone: no lift.
 */
function syncLift() {
  stopLift?.();
  stopLift = null;
  try {
    const doc = frame.contentDocument;
    if (doc?.documentElement && mode() === 'full') stopLift = followCornerLift(doc, body);
  } catch {
    // cross-origin (should not happen)
  }
}

let stopTheme: (() => void) | null = null;

/** The shadcn menu takes the prototype's light or dark theme (ADR-0027); the classic menu keeps its own. */
function syncTheme() {
  stopTheme?.();
  stopTheme = null;
  if (!isShadcnMenu(proto)) return;
  try {
    const doc = frame.contentDocument;
    if (doc?.documentElement) stopTheme = followPrototypeTheme(doc, [menu.element, toggle.button]);
  } catch {
    // cross-origin (should not happen)
  }
}

function watchFrame() {
  frame.addEventListener('load', () => {
    syncPageBackground();
    syncSafeArea();
    const win = frame.contentWindow;
    if (!win) return;
    try {
      const update = () => syncUrl();
      win.addEventListener('hashchange', update);
      win.addEventListener('popstate', update);
      toggle.listen(win);
      update();
      syncLift();
      syncTheme();
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
  const asked = params.get('screen') as Platform | null;
  screen = asked && (proto.platforms ?? []).includes(asked) ? asked : proto.platform;
  version =
    proto.versions.find((v) => v.version === params.get('v')) ??
    proto.versions.find((v) => v.version === proto.defaultVersion) ??
    proto.versions.at(-1)!;
  const s = pickScenario(version, params.get('s'));
  scenarioId = s.id;
  axes = axisValues(version.axes, params);
  keptAxes = axisValues(menuAxes(proto, version).axes, params);
  const key = screenFromViewerHash(location.hash, version.routing) ?? s.route;

  frame = document.createElement('iframe');
  frame.className = 'viewer-frame';
  frame.title = proto.title;
  frame.allow = 'clipboard-write; fullscreen';
  watchFrame();
  document.body.append(menu.element, toggle.button, ...variants.elements, safeArea);
  toggle.listen(window);
  stage.replaceChildren(frame);
  layout();
  navigate(key);
  addEventListener('resize', layout);
}

start().catch((err: Error) => fail(`Не удалось открыть прототип: ${err.message}`));
