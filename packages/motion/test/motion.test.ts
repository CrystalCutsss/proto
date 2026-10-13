import { describe, expect, it } from 'vitest';
import { bezierPath, duration, toSeconds } from '../src/index.ts';

describe('motion tokens', () => {
  it('converts token durations to seconds', () => {
    expect(toSeconds('240ms')).toBe(0.24);
    expect(toSeconds('1.5s')).toBe(1.5);
    expect(() => toSeconds('fast')).toThrow();
    expect(duration.moderate).toBe(0.3);
    expect(duration.fastest).toBe(0.075);
  });

  it('builds CustomEase paths from cubic-bezier tokens', () => {
    expect(bezierPath([0.2, 0, 0, 1])).toBe('M0,0 C0.2,0 0,1 1,1');
  });
});
