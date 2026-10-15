import { describe, expect, it } from 'vitest';
import { defineElements } from '../src/index.ts';

describe('defineElements', () => {
  it('registers ds-badge idempotently and maps status to a token color', () => {
    defineElements();
    defineElements();
    const el = document.createElement('ds-badge');
    el.setAttribute('status', 'frozen');
    document.body.append(el);
    expect(el.style.getPropertyValue('--ds-badge-color')).toBe('var(--ds-status-positive)');
    el.setAttribute('status', 'unknown');
    expect(el.style.getPropertyValue('--ds-badge-color')).toBe('var(--ds-status-neutral)');
  });
});

describe('ds-segmented', () => {
  const make = () => {
    defineElements();
    const el = document.createElement('ds-segmented');
    el.setAttribute('label', 'Версия');
    el.innerHTML =
      '<option value="v1">v1</option><option value="v2">v2</option><option value="v3">v3</option>';
    el.setAttribute('value', 'v2');
    document.body.append(el);
    return el as HTMLElement & { value: string; items: { value: string; label: string }[] };
  };
  const radios = (el: HTMLElement) => [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role=radio]')];

  it('renders options as a labelled radio group with one checked item', () => {
    const el = make();
    expect(el.shadowRoot!.querySelector('[role=radiogroup]')?.getAttribute('aria-label')).toBe('Версия');
    expect(radios(el).map((r) => [r.textContent, r.getAttribute('aria-checked'), r.tabIndex])).toEqual([
      ['v1', 'false', -1],
      ['v2', 'true', 0],
      ['v3', 'false', -1],
    ]);
  });

  it('fires change on click and on arrow keys, wrapping around', () => {
    const el = make();
    const seen: string[] = [];
    el.addEventListener('change', (e) => seen.push((e as CustomEvent<{ value: string }>).detail.value));
    radios(el)[0]!.click();
    radios(el)[0]!.click(); // same value: no event
    radios(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    radios(el)[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(seen).toEqual(['v1', 'v3', 'v1']);
    expect(el.value).toBe('v1');
  });

  it('accepts items as a property and falls back to the first item for an unknown value', () => {
    const el = make();
    el.items = [
      { value: 'a', label: 'Старт' },
      { value: 'b', label: 'Успех' },
    ];
    expect(radios(el).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });
});
