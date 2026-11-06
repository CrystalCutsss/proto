import { describe, expect, it } from 'vitest';
import type { RegistryPrototype, RegistryVersion } from '@proto/registry';
import {
  createMenu,
  followPrototypeTheme,
  hasScreenSwitch,
  hasVersionSwitch,
  menuAxes,
  menuSummary,
  menuToggle,
  SCREEN_LABEL,
  type MenuState,
} from '../src/menu.ts';

const axis = {
  id: 'docs',
  title: 'Документы',
  items: [
    { id: 'one', title: '1 док' },
    { id: 'two', title: '2 дока' },
  ],
};
const v = (version: string, axes = [] as RegistryVersion['axes']) =>
  ({
    version,
    axes,
    scenarios: [{ id: 'main', title: 'Основной', route: '#/' }],
  }) as unknown as RegistryVersion;
const proto = (...versions: RegistryVersion[]) => ({ versions }) as unknown as RegistryPrototype;

describe('menuAxes', () => {
  it('shows a version its own axes, enabled', () => {
    const v2 = v('v2', [axis]);
    expect(menuAxes(proto(v('v1'), v2), v2)).toEqual({ axes: [axis], disabled: false });
  });

  it('greys out the axes of the nearest earlier version on a later version without them', () => {
    const p = proto(v('v1'), v('v2', [axis]), v('v3'));
    expect(menuAxes(p, p.versions[2]!)).toEqual({ axes: [axis], disabled: true, from: 'v2' });
    // A version before any axes keeps its scenario and version controls.
    expect(menuAxes(p, p.versions[0]!).axes).toEqual([]);
  });

  it('shows no axes when no version has them', () => {
    const p = proto(v('v1'), v('v2'));
    expect(menuAxes(p, p.versions[1]!).axes).toEqual([]);
  });
});

describe('menuSummary', () => {
  it('adds the version to the axis titles when there are several versions', () => {
    const v2 = v('v2', [axis]);
    const state = { proto: proto(v2), version: v2, scenario: v2.scenarios[0]!, axes: { docs: 'two' } };
    expect(menuSummary(state)).toBe('2 дока');
    expect(menuSummary({ ...state, proto: proto(v('v1'), v2) })).toBe('2 дока · v2');
  });
});

describe('screen switch (ADR-0025)', () => {
  const p = (platforms?: string[]) => ({ platform: 'desktop', platforms }) as unknown as RegistryPrototype;

  it('is offered only for a prototype with several platforms', () => {
    expect(hasScreenSwitch(p(['desktop', 'mobile']))).toBe(true);
    expect(hasScreenSwitch(p(['desktop']))).toBe(false);
    // Registry written before ADR-0025 (no platforms): no switch.
    expect(hasScreenSwitch(p())).toBe(false);
  });

  it('labels the screens in Russian', () => {
    expect(SCREEN_LABEL).toEqual({ desktop: 'ПК', mobile: 'Телефон' });
  });
});

describe('menuToggle (ADR-0026)', () => {
  it('starts collapsed, and the button opens and closes the menu', () => {
    const menu = document.createElement('nav');
    const { button } = menuToggle(menu);
    expect(menu.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(menu.id);
    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    expect(menu.hidden).toBe(true);
  });

  it('toggles on Alt+Shift+H in a listened window', () => {
    const menu = document.createElement('nav');
    menuToggle(menu).listen(window);
    const press = () =>
      window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true, shiftKey: true, code: 'KeyH' }));
    press();
    expect(menu.hidden).toBe(false);
    press();
    expect(menu.hidden).toBe(true);
  });
});

describe('menu settings of a prototype (ADR-0027)', () => {
  const p2 = (menu?: RegistryPrototype['menu']) =>
    ({ ...proto(v('v1', [axis]), v('v2', [axis])), menu }) as RegistryPrototype;

  it('hides the version control when menu.versions is false', () => {
    expect(hasVersionSwitch(p2())).toBe(true);
    expect(hasVersionSwitch(p2({ versions: false, style: 'ds' }))).toBe(false);
    expect(hasVersionSwitch(proto(v('v1')))).toBe(false);
    const state = {
      proto: p2({ versions: false, style: 'shadcn' }),
      version: v('v2', [axis]),
      scenario: {},
      axes: { docs: 'two' },
    };
    expect(menuSummary(state as unknown as MenuState)).toBe('2 дока');
  });

  it('draws the shadcn menu as labelled radio groups without a version group', () => {
    const p = p2({ versions: false, style: 'shadcn' });
    const picked: string[] = [];
    const menu = createMenu({
      scenario() {},
      version() {},
      axis: (id, value) => picked.push(`${id}=${value}`),
    });
    menu.update({
      proto: p,
      version: p.versions[1]!,
      scenario: p.versions[1]!.scenarios[0]!,
      axes: { docs: 'one' },
    });
    const nav = menu.element;
    expect(nav.classList.contains('proto-menu--shadcn')).toBe(true);
    expect(nav.getAttribute('role')).toBe('menu');
    expect([...nav.querySelectorAll('.proto-menu-caption')].map((c) => c.textContent)).toEqual(['Документы']);
    const items = [...nav.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
    expect(items.map((i) => [i.textContent, i.getAttribute('aria-checked')])).toEqual([
      ['1 док', 'true'],
      ['2 дока', 'false'],
    ]);
    items[1]!.click();
    expect(picked).toEqual(['docs=two']);
    expect(items[1]!.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps the classic segmented menu by default', () => {
    const p = p2();
    const menu = createMenu({ scenario() {}, version() {}, axis() {} });
    menu.update({
      proto: p,
      version: p.versions[1]!,
      scenario: p.versions[1]!.scenarios[0]!,
      axes: { docs: 'one' },
    });
    expect(menu.element.classList.contains('proto-menu--shadcn')).toBe(false);
    expect(menu.element.querySelectorAll('ds-segmented')).toHaveLength(2);
  });

  it('closes the shadcn menu on a pick, on Escape and on a press outside', () => {
    const p = p2({ versions: false, style: 'shadcn' });
    const menu = createMenu({ scenario() {}, version() {}, axis() {} });
    menu.update({
      proto: p,
      version: p.versions[1]!,
      scenario: p.versions[1]!.scenarios[0]!,
      axes: { docs: 'one' },
    });
    const toggle = menuToggle(menu.element);
    toggle.listen(window);
    document.body.append(menu.element, toggle.button);
    toggle.button.click();
    expect(menu.element.hidden).toBe(false);
    expect(document.activeElement?.textContent).toBe('1 док');
    menu.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.textContent).toBe('2 дока');
    (document.activeElement as HTMLElement).click();
    expect(menu.element.hidden).toBe(true);
    toggle.button.click();
    menu.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.element.hidden).toBe(true);
    toggle.button.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(menu.element.hidden).toBe(true);
    menu.element.remove();
    toggle.button.remove();
  });
});

describe('followPrototypeTheme (ADR-0027)', () => {
  it('switches the targets to night tokens while the prototype root has .dark', async () => {
    const target = document.createElement('div');
    const stop = followPrototypeTheme(document, [target]);
    expect(target.dataset.dsTheme).toBeUndefined();
    document.documentElement.classList.add('dark');
    await Promise.resolve();
    expect(target.dataset.dsTheme).toBe('night');
    document.documentElement.classList.remove('dark');
    await Promise.resolve();
    expect(target.dataset.dsTheme).toBeUndefined();
    stop();
  });
});
