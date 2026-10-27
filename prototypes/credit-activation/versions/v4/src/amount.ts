// The big amount (`[data-amount]`) on #/ and #/conditions: counts to the new total when a condition changes.
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import { belowMinimum, formatRub, MIN_AMOUNT, totalAmount } from './calc';
import { choice } from './state';
import { showToast } from './toast';

const shown = new WeakMap<HTMLElement, { value: number }>();

/** The toast «Можем выдать не меньше 100 000 ₽» (owner, 2026-10-27). */
export const showMinimumToast = (): void => showToast(`Можем выдать не меньше ${formatRub(MIN_AMOUNT)}`);

/** After a condition was switched: the toast when the floor now holds the amount up (it changed by less than the
 * condition's badge). */
export function toastIfBelowMinimum(): void {
  if (belowMinimum(choice())) showMinimumToast();
}

/** Stop a running count on a page that leaves the DOM. */
export function stopAmount(root: HTMLElement): void {
  const el = root.querySelector<HTMLElement>('[data-amount]');
  const proxy = el && shown.get(el);
  if (proxy) gsap.killTweensOf(proxy);
}

/** Set the page's amount to the current total; `animate` counts from the shown value (off: jump). */
export function renderAmount(root: HTMLElement, animate = true): void {
  const el = root.querySelector<HTMLElement>('[data-amount]');
  if (!el) return;
  const target = totalAmount(choice());
  // The first change on a page counts from the amount the markup drew, not from the new total (no jump-in).
  const proxy = shown.get(el) ?? { value: Number(el.textContent?.replace(/\D/g, '')) || target };
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
    // The count runs in whole thousands; it lands on the exact total (a typed amount need not be round).
    onComplete: () => {
      el.textContent = formatRub(target);
    },
  });
}
