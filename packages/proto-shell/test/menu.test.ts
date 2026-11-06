import { describe, expect, it } from 'vitest';
import type { RegistryPrototype, RegistryVersion } from '@proto/registry';
import { hasScreenSwitch, menuAxes, menuSummary, menuToggle, SCREEN_LABEL } from '../src/menu.ts';

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
