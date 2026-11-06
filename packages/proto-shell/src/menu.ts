// Scenario/version menu shared by the viewer and the installed-app shell: two <ds-segmented> controls. A version
// with menu axes (version.json → axes) gets one captioned control per axis instead, plus the captioned version
// control when the prototype has several versions. A version without axes that follows a version with them shows
// that version's axes greyed out (disabled): they work only there (ADR-0024). A prototype with several platforms
// gets an «Экран» control (ПК / Телефон) at the end, when the caller handles it (ADR-0025). On wide screens the
// menu is one row next to a floating button in the bottom-right corner and starts collapsed (ADR-0026).
import type { Axis, Platform, RegistryPrototype, RegistryVersion, Scenario } from '@proto/registry';
import { defineElements, type DsSegmented } from '@proto/ui';

/**
 * Mobile browser: a phone screen in portrait or landscape. There the viewer shows a mobile prototype
 * full-screen without the design's bars, and the menu is not shown at all (menu.css repeats this query).
 */
export const PHONE_MEDIA = '(width <= 500px), (pointer: coarse) and (height <= 500px)';

export interface MenuHandlers {
  scenario(id: string): void;
  version(version: string): void;
  axis(id: string, value: string): void;
  /** Screen switch of a prototype with several platforms; without it the menu shows no «Экран» control. */
  screen?(platform: Platform): void;
}

export interface MenuState {
  proto: RegistryPrototype;
  version: RegistryVersion;
  scenario: Scenario;
  /** Chosen item per axis of `version` (see axisValues). */
  axes: Record<string, string>;
  /** Items to show on greyed-out axes of another version (the last choice there); default: first items. */
  keptAxes?: Record<string, string>;
  /** Screen the viewer shows now (one of proto.platforms). */
  screen?: Platform;
}

/** Labels of the «Экран» control. */
export const SCREEN_LABEL: Record<Platform, string> = { desktop: 'ПК', mobile: 'Телефон' };

/** Whether the menu offers the «Экран» control for this prototype. */
export const hasScreenSwitch = (proto: RegistryPrototype) => (proto.platforms?.length ?? 1) > 1;

/** Scenario to select in `version`: the one with the same id, else the version's first. */
export function pickScenario(version: RegistryVersion, id: string | null): Scenario {
  return version.scenarios.find((s) => s.id === id) ?? version.scenarios[0]!;
}

/**
 * Axes the menu shows for `version`: its own, or, when it has none, those of the nearest earlier version that has
 * them, disabled (a later version that dropped the axes). Versions before any axes keep scenario and version.
 */
export function menuAxes(
  proto: RegistryPrototype,
  version: RegistryVersion,
): { axes: Axis[]; disabled: boolean; from?: string } {
  if (version.axes.length) return { axes: version.axes, disabled: false };
  const at = proto.versions.findIndex((v) => v.version === version.version);
  const donor = proto.versions
    .slice(0, Math.max(at, 0))
    .reverse()
    .find((v) => v.axes.length);
  return donor ? { axes: donor.axes, disabled: true, from: donor.version } : { axes: [], disabled: true };
}

/** Short label of the current choice: axis item titles and the version, or the scenario and the version. */
export function menuSummary({ proto, version, scenario, axes }: MenuState): string {
  if (!version.axes.length) return `${scenario.title} · ${version.version}`;
  const titles = version.axes.map((a) => a.items.find((i) => i.id === axes[a.id])?.title ?? '');
  return [...titles, ...(proto.versions.length > 1 ? [version.version] : [])].join(' · ');
}

function segmented(label: string, key: string) {
  const el = document.createElement('ds-segmented') as DsSegmented;
  el.setAttribute('label', label);
  el.dataset.menu = key;
  return el;
}

/** A control with a caption above it (menu axes and the version next to them). */
function captioned(title: string, control: DsSegmented) {
  const group = document.createElement('div');
  group.className = 'proto-menu-axis';
  const caption = document.createElement('span');
  caption.className = 'proto-menu-caption';
  caption.textContent = title;
  caption.setAttribute('aria-hidden', 'true');
  group.append(caption, control);
  return group;
}

export function createMenu(handlers: MenuHandlers) {
  defineElements();
  const nav = document.createElement('nav');
  nav.className = 'proto-menu';
  nav.setAttribute('aria-label', 'Сценарий и версия');
  const scenario = segmented('Сценарий', 'scenario');
  const version = segmented('Версия', 'version');
  const screen = segmented('Экран', 'screen');
  scenario.addEventListener('change', () => handlers.scenario(scenario.value));
  version.addEventListener('change', () => handlers.version(version.value));
  screen.addEventListener('change', () => handlers.screen?.(screen.value as Platform));
  let layoutKey: string | null = null;
  let axisControls = new Map<string, DsSegmented>();

  /** Rebuild the controls when the shown axes change (appear, disappear or become disabled). */
  function build(
    { axes, disabled, from }: ReturnType<typeof menuAxes>,
    versions: boolean,
    scenarios: boolean,
    screens: boolean,
  ) {
    const key = JSON.stringify({ axes, disabled, from, versions, scenarios, screens });
    if (key === layoutKey) return;
    layoutKey = key;
    axisControls = new Map();
    const screenGroup = screens ? [captioned('Экран', screen)] : [];
    if (!axes.length) {
      nav.replaceChildren(scenario, version, ...screenGroup);
      return;
    }
    const groups = axes.map((a) => {
      const control = segmented(a.title, `axis-${a.id}`);
      control.items = a.items.map((i) => ({ value: i.id, label: i.title }));
      control.disabled = disabled;
      control.addEventListener('change', () => handlers.axis(a.id, control.value));
      axisControls.set(a.id, control);
      const group = captioned(a.title, control);
      group.classList.toggle('proto-menu-axis--disabled', disabled);
      if (disabled && from) {
        group.title = `Работает только в ${from}`;
        control.setAttribute('aria-description', group.title);
      }
      return group;
    });
    // A later version's own scenarios stay selectable next to the greyed-out axes.
    const own = disabled && scenarios ? [captioned('Сценарий', scenario)] : [];
    nav.replaceChildren(
      ...groups,
      ...own,
      ...(versions ? [captioned('Версия', version)] : []),
      ...screenGroup,
    );
  }

  return {
    element: nav,
    update({ proto, version: v, scenario: s, axes, keptAxes = {}, screen: current }: MenuState) {
      const shown = menuAxes(proto, v);
      const screens = Boolean(handlers.screen) && hasScreenSwitch(proto);
      build(shown, proto.versions.length > 1, v.scenarios.length > 1, screens);
      if (screens) {
        screen.items = proto.platforms.map((p) => ({ value: p, label: SCREEN_LABEL[p] }));
        screen.value = current ?? proto.platform;
      }
      version.items = proto.versions.map((x) => ({ value: x.version, label: x.version }));
      version.value = v.version;
      scenario.items = v.scenarios.map((x) => ({ value: x.id, label: x.title }));
      scenario.value = s.id;
      const values = shown.disabled ? keptAxes : axes;
      for (const [id, control] of axisControls) control.value = values[id] ?? '';
    },
  };
}

/** Sliders glyph drawn with currentColor (no asset, no CDN): the menu button here and on phones (variants.ts). */
export const MENU_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.5"/>
  <circle cx="10" cy="17" r="2.5"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>`;

let menuCount = 0;

/**
 * Floating button in the bottom-right corner that opens the menu next to it and closes it again (ADR-0026). The
 * menu starts collapsed on every page load; Alt+Shift+H toggles it too, from the page and from the prototype's frame.
 */
export function menuToggle(menu: HTMLElement) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'proto-menu-toggle';
  button.setAttribute('aria-label', 'Меню прототипа');
  menu.id ||= `proto-menu-${++menuCount}`;
  button.setAttribute('aria-controls', menu.id);
  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.innerHTML = open ? CLOSE_ICON : MENU_ICON;
  };
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  setOpen(false);
  button.addEventListener('click', () => setOpen(!isOpen()));
  const onKey = (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyH') setOpen(!isOpen());
  };
  return {
    button,
    setOpen,
    /** Listen for Alt+Shift+H in another window (the prototype's frame after each load). */
    listen(target: Window | null | undefined) {
      target?.addEventListener('keydown', onKey as EventListener);
    },
  };
}

/**
 * How far to raise the menu button so it sits above the prototype's own floating control in the bottom-right
 * corner (Tadum's «Demo» in English), stacked with a small gap (ADR-0026). Looks under the button's resting place
 * in `doc`, which covers the same viewport (the prototype's frame on the whole window, or the page itself): a
 * fixed element there, smaller than half the screen, lifts the button above its top edge. 0 when the corner is free.
 */
export function cornerLift(doc: Document, exclude?: Element): number {
  const view = doc.defaultView;
  if (!view) return 0;
  // Resting place of the button (menu.css): --ds-space-4 from the edges, a --ds-space-12 square; --ds-space-2 gap.
  const inset = 16;
  const size = 48;
  const gap = 8;
  const { innerWidth: w, innerHeight: h } = view;
  const xs = [w - inset - size + 2, w - inset - size / 2, w - inset - 2];
  const ys = [h - inset - size + 2, h - inset - size / 2, h - inset - 2];
  let top = Infinity;
  for (const x of xs)
    for (const y of ys)
      for (const el of doc.elementsFromPoint(x, y)) {
        if (exclude?.contains(el)) continue;
        const fixed = fixedAncestor(el);
        if (!fixed) continue;
        const r = fixed.getBoundingClientRect();
        if (r.height > h / 2 || r.width > w / 2) continue;
        top = Math.min(top, r.top);
      }
  return top === Infinity ? 0 : Math.max(0, Math.ceil(h - top + gap - inset));
}

function fixedAncestor(el: Element | null): Element | null {
  for (; el && el !== el.ownerDocument.documentElement; el = el.parentElement) {
    const position = el.ownerDocument.defaultView!.getComputedStyle(el).position;
    if (position === 'fixed' || position === 'sticky') return el;
  }
  return null;
}

/** Keep --proto-menu-lift on `target` in step with the prototype in `doc` (renders, route changes, resizes). */
export function followCornerLift(doc: Document, target: HTMLElement, exclude?: Element) {
  let queued = false;
  const update = () => {
    queued = false;
    const lift = cornerLift(doc, exclude);
    if (lift) target.style.setProperty('--proto-menu-lift', `${lift}px`);
    else target.style.removeProperty('--proto-menu-lift');
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  const observer = new MutationObserver(schedule);
  // Classes and hidden only: style attributes change on every animation frame.
  observer.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden'],
  });
  doc.defaultView?.addEventListener('resize', schedule);
  schedule();
  return () => {
    observer.disconnect();
    doc.defaultView?.removeEventListener('resize', schedule);
    target.style.removeProperty('--proto-menu-lift');
  };
}

export async function loadRegistryPrototype(slug: string) {
  const res = await fetch('/registry.json', { cache: 'no-cache', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`registry.json: HTTP ${res.status}`);
  const registry = (await res.json()) as { prototypes: RegistryPrototype[] };
  return registry.prototypes.find((p) => p.slug === slug) ?? null;
}
