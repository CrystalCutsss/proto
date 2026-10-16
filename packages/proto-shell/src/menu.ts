// Scenario/version menu shared by the viewer and the installed-app shell: two <ds-segmented> controls. A version
// with menu axes (version.json → axes) gets one captioned control per axis instead.
import type { RegistryPrototype, RegistryVersion, Scenario } from '@proto/registry';
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
}

export interface MenuState {
  proto: RegistryPrototype;
  version: RegistryVersion;
  scenario: Scenario;
  /** Chosen item per axis of `version` (see axisValues). */
  axes: Record<string, string>;
}

/** Scenario to select in `version`: the one with the same id, else the version's first. */
export function pickScenario(version: RegistryVersion, id: string | null): Scenario {
  return version.scenarios.find((s) => s.id === id) ?? version.scenarios[0]!;
}

/** Short label of the current choice: axis item titles, or the scenario and the version. */
export function menuSummary({ version, scenario, axes }: MenuState): string {
  if (!version.axes.length) return `${scenario.title} · ${version.version}`;
  return version.axes.map((a) => a.items.find((i) => i.id === axes[a.id])?.title ?? '').join(' · ');
}

function segmented(label: string, key: string) {
  const el = document.createElement('ds-segmented') as DsSegmented;
  el.setAttribute('label', label);
  el.dataset.menu = key;
  return el;
}

export function createMenu(handlers: MenuHandlers) {
  defineElements();
  const nav = document.createElement('nav');
  nav.className = 'proto-menu';
  nav.setAttribute('aria-label', 'Сценарий и версия');
  const scenario = segmented('Сценарий', 'scenario');
  const version = segmented('Версия', 'version');
  scenario.addEventListener('change', () => handlers.scenario(scenario.value));
  version.addEventListener('change', () => handlers.version(version.value));
  let axesKey: string | null = null;
  let axisControls = new Map<string, DsSegmented>();

  /** Rebuild the controls when the version's axes change (or appear / disappear). */
  function build(v: RegistryVersion) {
    const key = JSON.stringify(v.axes);
    if (key === axesKey) return;
    axesKey = key;
    axisControls = new Map();
    const keep = [...nav.children].filter((c) => c.matches('.proto-menu-collapse'));
    if (!v.axes.length) {
      nav.replaceChildren(scenario, version, ...keep);
      return;
    }
    const groups = v.axes.map((a) => {
      const group = document.createElement('div');
      group.className = 'proto-menu-axis';
      const caption = document.createElement('span');
      caption.className = 'proto-menu-caption';
      caption.textContent = a.title;
      caption.setAttribute('aria-hidden', 'true');
      const control = segmented(a.title, `axis-${a.id}`);
      control.items = a.items.map((i) => ({ value: i.id, label: i.title }));
      control.addEventListener('change', () => handlers.axis(a.id, control.value));
      axisControls.set(a.id, control);
      group.append(caption, control);
      return group;
    });
    nav.replaceChildren(...groups, ...keep);
  }

  return {
    element: nav,
    update({ proto, version: v, scenario: s, axes }: MenuState) {
      build(v);
      if (v.axes.length) {
        for (const [id, control] of axisControls) control.value = axes[id] ?? '';
        return;
      }
      scenario.items = v.scenarios.map((x) => ({ value: x.id, label: x.title }));
      scenario.value = s.id;
      version.items = proto.versions.map((x) => ({ value: x.version, label: x.version }));
      version.value = v.version;
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
