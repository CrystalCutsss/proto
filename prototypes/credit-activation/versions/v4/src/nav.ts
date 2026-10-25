// iOS-like navigation stack: push/pop slides with parallax and dimming (or the shared-element cross-fade of
// screens with `transition: 'shared'`), browser history, interactive left-edge swipe back, «Закрыть» reset.
// location.hash is the source of truth. The stack holds screens by route: history entry `i` (history.state.i)
// shows pages[i]; «next» pushes the route the top screen's next() returns, a control with `data-push` pushes its
// own route; a deep link builds the stack from the default path (screens/index.ts).
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import type { NavAction } from './components';
import { defaultPath, normalizeRoute, ROOT, screenFor } from './screens';
import type { Screen } from './screens/types';
import { resetState } from './state';

const EDGE = 20; // px from the left edge where a back swipe may start
const SLOP = 8; // px of movement before a gesture is recognised
const PARALLAX = -30; // xPercent of the screen below the top one
const FLICK = 0.5; // px/ms: a faster rightward release completes the pop
const SHARED_SHIFT = 12; // px the fading content of a shared-transition screen travels while it fades

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
  draw?: Draw;
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
  const route = (index: number) => pages[index]!.screen.route;

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

  /** Take a page out of the DOM after its screen released what it holds (tweens, observers). */
  function remove(page: Page): void {
    page.screen.unmount?.(page.el);
    page.el.remove();
  }

  /** Park a page below the top one: shifted, dimmed, hidden and inert (its scroll position is kept). */
  function cover(page: Page): void {
    settle(page);
    page.el.inert = true;
    page.el.classList.add('page--covered');
    gsap.set(page.el, { xPercent: reduced ? 0 : PARALLAX });
    gsap.set(page.dim, { opacity: reduced ? 0 : 1 });
  }

  /** Re-render the state-dependent parts of a page that is about to be uncovered. */
  function refresh(page: Page): void {
    page.screen.refresh?.(page.el);
  }

  function activate(page: Page, focus = true): void {
    settle(page);
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

  /** Clear what a shared transition left on a page. */
  function settle(page: Page): void {
    page.el.classList.remove('page--sharing');
    gsap.set(page.el.querySelectorAll('[data-fade], [data-shared]'), { clearProps: 'opacity,transform' });
  }

  /**
   * Shared-element transition (#/ ↔ #/conditions): no slide. The shared element (the amount) moves from its place
   * on `lower` to its place on `upper`; `lower`'s `[data-fade]` parts fade out first, then `upper`'s fade in
   * (rising a little), so the two never overlap at full strength. The bottom blocks (the same «Дальше») stay put.
   * Progress 0: `upper` is shown; 1: `lower` is shown.
   */
  function shared(lower: Page, upper: Page, from: HTMLElement, to: HTMLElement): Draw {
    gsap.set([lower.el, upper.el], { xPercent: 0, yPercent: 0, opacity: 1 });
    gsap.set(lower.dim, { opacity: 0 });
    gsap.set(to, { clearProps: 'transform' });
    upper.el.classList.add('page--sharing');
    // Align the glyphs, not the boxes: the two amounts have different paddings, so box-aligned tops would leave the
    // text 12 px off and jump when the pages swap at the end.
    const a = textRect(from);
    const b = textRect(to);
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top - b.top;
    const lowerFades = [...lower.el.querySelectorAll<HTMLElement>('[data-fade]')];
    const upperFades = [...upper.el.querySelectorAll<HTMLElement>('[data-fade]')];
    const rising = upperFades.filter((el) => !el.closest('.top-bars'));
    const clamp = gsap.utils.clamp(0, 1);
    return (p) => {
      gsap.set(to, { x: dx * p, y: dy * p, force3D: true });
      gsap.set(from, { opacity: p >= 1 ? 1 : 0 });
      gsap.set(upperFades, { opacity: clamp(1 - p * 2) });
      gsap.set(rising, { y: SHARED_SHIFT * p });
      gsap.set(lowerFades, { opacity: clamp((p - 0.5) * 2) });
    };
  }

  /** Box of an element's text (its padding left out). */
  function textRect(el: HTMLElement): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  }

  /** The transition between two neighbouring pages: shared when `upper` asks for it and both have the element. */
  function transition(lower: Page, upper: Page, fade = reduced): Draw {
    if (!fade && upper.screen.transition === 'shared') {
      const from = lower.el.querySelector<HTMLElement>('[data-shared]');
      const to = from && upper.el.querySelector<HTMLElement>(`[data-shared="${from.dataset.shared}"]`);
      if (from && to) return shared(lower, upper, from, to);
    }
    return slide(lower, upper, fade);
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

  /** Push screens (the last one slides in; the ones in between are created covered). */
  function push(screens: Screen[]): void {
    finish();
    const lower = top();
    screens.forEach((screen, i) => {
      const page = createPage(screen);
      pages.push(page);
      if (i < screens.length - 1) cover(page);
    });
    const upper = top();
    lower.el.inert = true;
    run(1, 0, transitionTime(), ease.expressive, transition(lower, upper), () => {
      cover(lower);
      activate(upper);
    });
  }

  function pop(target: number): void {
    finish();
    const upper = top();
    const removed = pages.splice(target + 1);
    removed.slice(0, -1).forEach(remove);
    const lower = top();
    upper.el.inert = true;
    refresh(lower);
    lower.el.classList.remove('page--covered');
    run(0, 1, transitionTime(), ease.expressive, transition(lower, upper), () => {
      remove(upper);
      activate(lower);
    });
  }

  /** «Закрыть» / «К счету»: drop the stack, reset the state and return to #/. */
  function close(): void {
    finish();
    resetState();
    const leaving = pages.length > 1 ? top() : null;
    pages.forEach((page) => page !== leaving && remove(page));
    const fresh = createPage(ROOT);
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
      remove(leaving);
      activate(fresh);
    });
  }

  /** Push the screen of `target` (a hash route) on top; nothing when it is already on top. */
  function forward(target: string | null | undefined): void {
    if (!target) return;
    const screen = screenFor(target);
    if (screen === top().screen) return;
    history.pushState({ i: depth() + 1 }, '', screen.route);
    push([screen]);
  }

  const next = () => forward(top().screen.next?.());

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
    const el = (event.target as Element).closest<HTMLElement>('[data-action], [data-push]');
    if (!el || tween || drag?.engaged || !top().el.contains(el)) return;
    const actions: Record<NavAction, () => void> = { next, back, close };
    const { push: target, action } = el.dataset;
    const handler = target ? () => forward(target) : actions[action as NavAction];
    if (!handler) return;
    top().screen.beforeAction?.(el);
    handler();
  });

  /** Go down the stack to `target`; screens without back (#/success) reset the flow instead. */
  function popTo(target: number): void {
    if (top().screen.canGoBack) pop(target);
    else close(); // e.g. browser back on #/success: the application is already submitted
  }

  window.addEventListener('popstate', () => {
    const entry = historyIndex();
    cancelDrag();
    if (entry >= 0) {
      // No forward navigation, as in iOS: browser forward onto one of our entries is undone. This also keeps
      // forward entries left by «Закрыть» from re-entering the flow with reset state.
      if (entry > depth()) history.go(depth() - entry);
      else if (entry < depth()) popTo(entry);
      return;
    }
    // A hash typed by hand (no history state): pop to it if it is in the stack, else push up to it.
    const screen = screenFor(location.hash);
    const index = pages.findIndex((page) => page.screen === screen);
    if (index === depth()) {
      history.replaceState({ i: index }, '', screen.route);
    } else if (index >= 0) {
      history.replaceState({ i: index }, '', screen.route);
      popTo(index);
    } else {
      const path = defaultPath(screen);
      const from = path.indexOf(top().screen);
      const screens = from >= 0 ? path.slice(from + 1) : [screen];
      // The typed entry becomes the first pushed screen; the rest get their own entries.
      screens.forEach((s, i) => {
        const state = { i: depth() + 1 + i };
        if (i === 0) history.replaceState(state, '', s.route);
        else history.pushState(state, '', s.route);
      });
      push(screens);
    }
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
      refresh(pages[depth() - 1]!);
      pages[depth() - 1]!.el.classList.remove('page--covered');
      drag.draw = transition(pages[depth() - 1]!, top(), false);
    }
    drag.progress = Math.min(1, Math.max(0, dx / drag.width));
    drag.draw?.(drag.progress);
    drag.samples.push({ x: event.clientX, t: event.timeStamp });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[0]!.t > 100) drag.samples.shift();
  });

  function release(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.id) return;
    const { engaged, progress, samples, draw } = drag;
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
    if (!draw) return;

    if (event.type === 'pointerup' && (progress > 0.5 || velocity > FLICK)) {
      const from = depth();
      pages.pop();
      upper.el.inert = true;
      syncHistoryAfterPop(from);
      const seconds = Math.max(duration.fast, duration.slow * (1 - progress));
      run(progress, 1, seconds, ease.productiveEntrance, draw, () => {
        remove(upper);
        activate(lower);
      });
    } else {
      const seconds = Math.max(duration.fast, duration.slow * progress);
      run(progress, 0, seconds, ease.productiveEntrance, draw, () => {
        cover(lower);
        settle(upper);
      });
    }
  }

  function cancelDrag(): void {
    if (!drag?.engaged) {
      drag = null;
      return;
    }
    viewport.classList.remove('is-dragging');
    drag.draw?.(0);
    cover(pages[depth() - 1]!);
    settle(top());
    drag = null;
  }

  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', () => {
    if (drag?.engaged) cancelDrag();
  });

  // ---------- start: a deep link builds the stack (and history) from the default path ----------

  const target = screenFor(location.hash);
  const path = defaultPath(target);
  const last = path.length - 1;
  if (historyIndex() !== last || normalizeRoute(location.hash) !== target.route) {
    history.replaceState({ i: 0 }, '', path[0]!.route);
    path.slice(1).forEach((screen, i) => history.pushState({ i: i + 1 }, '', screen.route));
  }
  path.forEach((screen, i) => {
    const page = createPage(screen);
    pages.push(page);
    if (i < last) cover(page);
  });
  activate(top(), false);
}
