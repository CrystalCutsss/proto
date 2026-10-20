import { describe, expect, it } from 'vitest';
import type { RegistryPrototype, RegistryVersion } from '@proto/registry';
import { menuAxes, menuSummary } from '../src/menu.ts';

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
    expect(menuAxes(p, p.versions[2]!)).toEqual({ axes: [axis], disabled: true });
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
