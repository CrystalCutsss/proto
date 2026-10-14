// iOS-like navigation stack: push/pop slides with parallax and dimming, browser history, interactive
// left-edge swipe back, «Закрыть» reset. location.hash is the source of truth; the stack is always a
// prefix of FLOW, so history entry `i` (history.state.i) shows FLOW[i].
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import type { NavAction } from './components';
import { FLOW, routeIndex } from './screens';
import type { Screen } from './screens/types';
import { resetState } from './state';

const EDGE = 20; // px from the left edge where a back swipe may start
const SLOP = 8; // px of movement before a gesture is recognised
const PARALLAX = -30; // xPercent of the screen below the top one
const FLICK = 0.5; // px/ms: a faster rightward release completes the pop

interface Page {
  screen: Screen;
  el: HTMLElement;
  scroll: HTMLElement;
  dim: HTMLElement;
}

interface Drag {
  id: number;
  x0: number;
  y0: number;
  width: number;
  engaged: boolean;
  progress: number;
  samples: { x: number; t: number }[];
}

type Draw = (progress: number) => void;

export function startNavigation(viewport: HTMLElement): void {
  const reduced = prefersReducedMotion();
  let pages: Page[] = [];
  let tween: gsap.core.Tween | null = null;
  let drag: Drag | null = null;
  let suppressClick = false;

  const top = () => pages[pages.length - 1]!;
  const depth = () => pages.length - 1;
  const historyIndex = (): number => {
    const i: unknown = (history.state as { i?: unknown } | null)?.i;
    return typeof i === 'number' ? i : -1;
  };
  const route = (index: number) => FLOW[index]!.route;

  // ---------- pages ----------

  function createPage(screen: Screen): Page {
    const el = document.createElement('section');
    el.className = 'page';
    el.dataset.route = screen.route;
    el.setAttribute('aria-label', screen.label);
    el.innerHTML = `<div class="page__scroll" tabindex="-1">${screen.html()}</div><div class="page__dim" aria-hidden="true"></div>`;
    viewport.append(el);
    screen.mount?.(el);
    return {
      screen,
      el,
      scroll: el.querySelector<HTMLElement>('.page__scroll')!,
      dim: el.querySelector<HTMLElement>('.page__dim')!,
    };
  }

  /** Park a page below the top one: shifted, dimmed, hidden and inert (its scroll position is kept). */
  function cover(page: Page): void {
    page.el.inert = true;
    page.el.classList.add('page--covered');
    gsap.set(page.el, { xPercent: reduced ? 0 : PARALLAX });
    gsap.set(page.dim, { opacity: reduced ? 0 : 1 });
  }

  function activate(page: Page, focus = true): void {
    page.el.inert = false;
    page.el.classList.remove('page--covered');
    gsap.set(page.el, { clearProps: 'transform,opacity' });
    gsap.set(page.dim, { opacity: 0 });
    if (focus) page.scroll.focus({ preventScroll: true });
  }

  // ---------- motion ----------

  /** Progress 0: `upper` covers the screen; 1: `upper` is gone and `lower` is fully visible. */
  function slide(lower: Page, upper: Page, fade = reduced): Draw {
    return (p) => {
      if (fade) {
        gsap.set(upper.el, { xPercent: 0, opacity: 1 - p });
        return;
      }
      gsap.set(upper.el, { xPercent: 100 * p });
      gsap.set(lower.el, { xPercent: reduced ? 0 : PARALLAX * (1 - p) });
      gsap.set(lower.dim, { opacity: reduced ? 0 : 1 - p });
    };
  }

  function run(from: number, to: number, seconds: number, curve: string, draw: Draw, done: () => void): void {
    const proxy = { p: from };
    draw(from);
    viewport.classList.add('is-busy');
    tween = gsap.to(proxy, {
      p: to,
      duration: seconds,
      ease: curve,
      onUpdate: () => draw(proxy.p),
      onComplete: () => {
        tween = null;
        viewport.classList.remove('is-busy');
        done();
      },
    });
    // setupMotion() fast-forwards the global timeline under reduced motion; the spec asks for a short
    // cross-fade instead, so reduced-motion transitions run at real speed.
    if (reduced) tween.timeScale(1 / gsap.globalTimeline.timeScale());
  }

  /** Jump a running transition to its end (its completion handler runs synchronously). */
  function finish(): void {
    tween?.progress(1);
  }

  const transitionTime = () => (reduced ? duration.fast : duration.slow);

  // ---------- stack operations ----------

  function push(target: number): void {
    finish();
    const lower = top();
    for (let i = pages.length; i <= target; i++) {
      const page = createPage(FLOW[i]!);
      pages.push(page);
      if (i < target) cover(page);
    }
    const upper = top();
    lower.el.inert = true;
    run(1, 0, transitionTime(), ease.expressive, slide(lower, upper), () => {
      cover(lower);
      activate(upper);
    });
  }

  function pop(target: number): void {
    finish();
    const upper = top();
    const removed = pages.splice(target + 1);
    removed.slice(0, -1).forEach((page) => page.el.remove());
    const lower = top();
    upper.el.inert = true;
    lower.el.classList.remove('page--covered');
    run(0, 1, transitionTime(), ease.expressive, slide(lower, upper), () => {
      upper.el.remove();
      activate(lower);
    });
  }

  /** «Закрыть» / «К счету»: drop the stack, reset the state and return to #/. */
  function close(): void {
    finish();
    resetState();
    const leaving = pages.length > 1 ? top() : null;
    pages.forEach((page) => page !== leaving && page.el.remove());
    const fresh = createPage(FLOW[0]!);
    pages = [fresh];

    const index = historyIndex();
    if (index > 0) history.go(-index);
    else history.replaceState({ i: 0 }, '', route(0));

    if (!leaving) {
      activate(fresh);
      return;
    }
    viewport.append(leaving.el); // keep the leaving screen above the fresh one
    leaving.el.inert = true;
    const dismiss: Draw = (p) =>
      reduced ? gsap.set(leaving.el, { opacity: 1 - p }) : gsap.set(leaving.el, { yPercent: 100 * p });
    run(0, 1, transitionTime(), ease.expressiveExit, dismiss, () => {
      leaving.el.remove();
      activate(fresh);
    });
  }

  function next(): void {
    const target = depth() + 1;
    if (target >= FLOW.length) return;
    history.pushState({ i: target }, '', route(target));
    push(target);
  }

  function back(): void {
    if (pages.length < 2 || !top().screen.canGoBack) return;
    const from = depth();
    pop(from - 1);
    syncHistoryAfterPop(from);
  }

  /** After an in-app pop: step the browser history back too (its popstate is then a no-op). */
  function syncHistoryAfterPop(from: number): void {
    if (historyIndex() === from) history.back();
    else history.replaceState({ i: depth() }, '', route(depth()));
  }

  // ---------- events ----------

  viewport.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const el = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!el || tween || drag?.engaged || !top().el.contains(el)) return;
    const actions: Record<NavAction, () => void> = { next, back, close };
    actions[el.dataset.action as NavAction]?.();
  });

  window.addEventListener('popstate', () => {
    const entry = historyIndex();
    const target = routeIndex(location.hash);
    cancelDrag();
    // No forward navigation, as in iOS: browser forward onto one of our entries is undone. This also keeps
    // forward entries left by «Закрыть» from re-entering the flow with reset state. A hash typed by hand
    // (no history state) still pushes.
    if (entry >= 0 && target > depth()) {
      history.go(depth() - entry);
      return;
    }
    if (entry !== target) history.replaceState({ i: target }, '', route(target));
    if (target === depth()) return;
    if (target > depth()) push(target);
    else if (top().screen.canGoBack) pop(target);
    else close(); // e.g. browser back on #/success: the application is already submitted
  });

  // Interactive edge swipe (pointer events; screens use touch-action: pan-y).
  viewport.addEventListener('pointerdown', (event) => {
    if (tween || drag || !event.isPrimary || event.button !== 0) return;
    if (pages.length < 2 || !top().screen.canGoBack) return;
    const rect = viewport.getBoundingClientRect();
    if (event.clientX - rect.left > EDGE) return;
    drag = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      width: rect.width,
      engaged: false,
      progress: 0,
      samples: [{ x: event.clientX, t: event.timeStamp }],
    };
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      cancelDrag(); // the button was released outside the window
      return;
    }
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;
    if (!drag.engaged) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        drag = null; // vertical scroll wins
        return;
      }
      if (dx < SLOP || dx < Math.abs(dy)) return;
      drag.engaged = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      pages[depth() - 1]!.el.classList.remove('page--covered');
    }
    drag.progress = Math.min(1, Math.max(0, dx / drag.width));
    slide(pages[depth() - 1]!, top(), false)(drag.progress);
    drag.samples.push({ x: event.clientX, t: event.timeStamp });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[0]!.t > 100) drag.samples.shift();
  });

  function release(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.id) return;
    const { engaged, progress, samples } = drag;
    drag = null;
    if (!engaged) return;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);

    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    const velocity = (last.x - first.x) / Math.max(1, last.t - first.t);
    const upper = top();
    const lower = pages[depth() - 1]!;
    const draw = slide(lower, upper, false);

    if (event.type === 'pointerup' && (progress > 0.5 || velocity > FLICK)) {
      const from = depth();
      pages.pop();
      upper.el.inert = true;
      syncHistoryAfterPop(from);
      const seconds = Math.max(duration.fast, duration.slow * (1 - progress));
      run(progress, 1, seconds, ease.productiveEntrance, draw, () => {
        upper.el.remove();
        activate(lower);
      });
    } else {
      const seconds = Math.max(duration.fast, duration.slow * progress);
      run(progress, 0, seconds, ease.productiveEntrance, draw, () => cover(lower));
    }
  }

  function cancelDrag(): void {
    if (!drag?.engaged) {
      drag = null;
      return;
    }
    viewport.classList.remove('is-dragging');
    slide(pages[depth() - 1]!, top(), false)(0);
    cover(pages[depth() - 1]!);
    drag = null;
  }

  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', () => {
    if (drag?.engaged) cancelDrag();
  });

  // ---------- start: a deep link builds the stack (and history) from the flow order ----------

  const target = routeIndex(location.hash);
  if (historyIndex() !== target) {
    history.replaceState({ i: 0 }, '', route(0));
    for (let i = 1; i <= target; i++) history.pushState({ i }, '', route(i));
  }
  for (let i = 0; i <= target; i++) {
    const page = createPage(FLOW[i]!);
    pages.push(page);
    if (i < target) cover(page);
  }
  activate(top(), false);
}
