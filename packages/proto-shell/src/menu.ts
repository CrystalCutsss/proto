// Scenario/version menu shared by the viewer and the installed-app shell: two <ds-segmented> controls.
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
}

export interface MenuState {
  proto: RegistryPrototype;
  version: RegistryVersion;
  scenario: Scenario;
}

/** Scenario to select in `version`: the one with the same id, else the version's first. */
export function pickScenario(version: RegistryVersion, id: string | null): Scenario {
  return version.scenarios.find((s) => s.id === id) ?? version.scenarios[0]!;
}

export function createMenu(handlers: MenuHandlers) {
  defineElements();
  const nav = document.createElement('nav');
  nav.className = 'proto-menu';
  nav.setAttribute('aria-label', 'Сценарий и версия');
  const scenario = document.createElement('ds-segmented') as DsSegmented;
  scenario.setAttribute('label', 'Сценарий');
  scenario.dataset.menu = 'scenario';
  const version = document.createElement('ds-segmented') as DsSegmented;
  version.setAttribute('label', 'Версия');
  version.dataset.menu = 'version';
  nav.append(scenario, version);
  scenario.addEventListener('change', () => handlers.scenario(scenario.value));
  version.addEventListener('change', () => handlers.version(version.value));

  return {
    element: nav,
    update({ proto, version: v, scenario: s }: MenuState) {
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
