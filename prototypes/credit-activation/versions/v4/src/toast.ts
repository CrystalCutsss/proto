// tui-notification-toast (Figma 105:10434): a white pill with the fixed-colour alert-warning icon, pinned to the
// top of the screen under the status bar. One toast at a time; a new message restarts its timer.
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import { icon } from './icons';

const SHOWN_MS = 3000;

let el: HTMLElement | null = null;
let timer = 0;

function toastElement(): HTMLElement {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="toast__stack">
      <img src="${icon('alert-warning.svg')}" alt="" width="24" height="24" />
      <span class="toast__text t-body-m"></span>
    </div>`;
  document.querySelector('.app')!.append(el);
  return el;
}

function hide(): void {
  if (!el) return;
  const target = el;
  gsap.to(target, {
    autoAlpha: 0,
    y: prefersReducedMotion() ? 0 : -16,
    duration: duration.fast,
    ease: ease.productive,
  });
}

/** Show a warning toast with `text` (plain text, may hold &nbsp; entities). */
export function showToast(text: string): void {
  const toast = toastElement();
  toast.querySelector('.toast__text')!.innerHTML = text;
  window.clearTimeout(timer);
  gsap.killTweensOf(toast);
  if (prefersReducedMotion()) gsap.set(toast, { autoAlpha: 1, y: 0 });
  else
    gsap.fromTo(
      toast,
      { autoAlpha: 0, y: -16 },
      { autoAlpha: 1, y: 0, duration: duration.moderate, ease: ease.productive },
    );
  timer = window.setTimeout(hide, SHOWN_MS);
}
