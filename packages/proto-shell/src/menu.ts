// Scenario/version menu shared by the viewer and the installed-app shell: two <ds-segmented> controls. A version
// with menu axes (version.json → axes) gets one captioned control per axis instead, plus the captioned version
// control when the prototype has several versions. A version without axes that follows a version with them shows
// that version's axes greyed out (disabled): they work only there (ADR-0024). A prototype with several platforms
// gets an «Экран» control (Компьютер / Телефон) at the end, when the caller handles it (ADR-0025).
import type { Axis, Platform, RegistryPrototype, RegistryVersion, Scenario } from '@proto/registry';
import { defineElements, type DsSegmented } from '@proto/ui';

export const HIDDEN_KEY = 'proto-shell:hidden';

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
export const SCREEN_LABEL: Record<Platform, string> = { desktop: 'Компьютер', mobile: 'Телефон' };

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
    const keep = [...nav.children].filter((c) => c.matches('.proto-menu-collapse'));
    const screenGroup = screens ? [captioned('Экран', screen)] : [];
    if (!axes.length) {
      nav.replaceChildren(scenario, version, ...screenGroup, ...keep);
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
      ...keep,
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

const sessionGet = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const sessionSet = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // storage may be blocked; hiding then lasts until reload
  }
};

/** Show or hide the menu; the choice lasts for the browser session. */
export function setMenuHidden(menu: HTMLElement, hidden: boolean) {
  menu.hidden = hidden;
  sessionSet(HIDDEN_KEY, hidden ? '1' : null);
}

/** Alt+Shift+H hides and shows the menu. */
export function hideShortcut(menu: HTMLElement, targets: (Window | null | undefined)[]) {
  menu.hidden = sessionGet(HIDDEN_KEY) === '1';
  const onKey = (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyH') setMenuHidden(menu, !menu.hidden);
  };
  for (const t of targets) t?.addEventListener('keydown', onKey as EventListener);
}

/**
 * Touch screens have no shortcut: a collapse button at the end of the menu hides it, and a small pill with the current
 * scenario and version brings it back. Used by the installed-app shell, where the menu covers the page.
 */
export function collapsible(menu: HTMLElement, summary: string) {
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'proto-menu-collapse';
  collapse.setAttribute('aria-label', 'Свернуть меню');
  collapse.textContent = '⌄';
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'proto-menu-pill';
  pill.setAttribute('aria-label', 'Показать меню сценария и версии');
  pill.textContent = `${summary} ⌃`;
  menu.append(collapse);
  collapse.addEventListener('click', () => setMenuHidden(menu, true));
  pill.addEventListener('click', () => setMenuHidden(menu, false));
  const sync = () => {
    pill.hidden = !menu.hidden;
  };
  new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  return pill;
}

export async function loadRegistryPrototype(slug: string) {
  const res = await fetch('/registry.json', { cache: 'no-cache', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`registry.json: HTTP ${res.status}`);
  const registry = (await res.json()) as { prototypes: RegistryPrototype[] };
  return registry.prototypes.find((p) => p.slug === slug) ?? null;
}
