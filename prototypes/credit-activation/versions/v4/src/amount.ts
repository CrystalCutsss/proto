// The big amount (`[data-amount]`) on #/ and #/conditions: counts to the new total when a condition changes.
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import { formatRub, totalAmount } from './calc';
import { choice } from './state';

const shown = new WeakMap<HTMLElement, { value: number }>();

/** Set the page's amount to the current total; `animate` counts from the shown value (off: jump). */
export function renderAmount(root: HTMLElement, animate = true): void {
  const el = root.querySelector<HTMLElement>('[data-amount]');
  if (!el) return;
  const target = totalAmount(choice());
  const proxy = shown.get(el) ?? { value: target };
  shown.set(el, proxy);
  gsap.killTweensOf(proxy);
  if (!animate || prefersReducedMotion() || proxy.value === target) {
    proxy.value = target;
    el.textContent = formatRub(target);
    return;
  }
  gsap.to(proxy, {
    value: target,
    duration: duration.moderate,
    ease: ease.productive,
    onUpdate: () => {
      el.textContent = formatRub(Math.round(proxy.value / 1000) * 1000);
    },
  });
}
