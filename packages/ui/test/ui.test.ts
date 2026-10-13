import { describe, expect, it } from 'vitest';
import { defineElements } from '../src/index.ts';

describe('defineElements', () => {
  it('registers ds-badge idempotently and maps status to a token color', () => {
    defineElements();
    defineElements();
    const el = document.createElement('ds-badge');
    el.setAttribute('status', 'frozen');
    document.body.append(el);
    expect(el.style.getPropertyValue('--ds-badge-color')).toBe('var(--ds-color-status-frozen)');
    el.setAttribute('status', 'unknown');
    expect(el.style.getPropertyValue('--ds-badge-color')).toBe('var(--ds-color-status-draft)');
  });
});
