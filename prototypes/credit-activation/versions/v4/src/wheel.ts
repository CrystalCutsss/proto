// «Барабан условий» on #/conditions: an iOS picker-like scroll. Cards that reach the top or the bottom edge of
// the visible band (between the sticky conditions block and the sticky «Дальше») shrink a little, tilt away and
// dim as they slide under those blocks; the gradients at both edges keep them from cutting off sharply.
// It reacts from the moment a card starts to slide under a block. Scroll-linked, read once per frame from cached offsets (transforms do not change them). Off under reduced
// motion: the cards then just scroll under the gradients.
import { prefersReducedMotion } from '@proto/motion';

const MIN_SCALE = 0.9;
const MAX_TILT = 20; // deg
const MIN_OPACITY = 0.4;
const PERSPECTIVE = 800; // px

interface Item {
  el: HTMLElement;
  top: number;
  height: number;
}

export function mountWheel(root: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const scroll = root.querySelector<HTMLElement>('.page__scroll');
  const wheel = root.querySelector<HTMLElement>('.wheel');
  const head = root.querySelector<HTMLElement>('.top-bars');
  const foot = root.querySelector<HTMLElement>('.bottom-block');
  if (!scroll || !wheel || !head || !foot) return;

  let items: Item[] = [];
  let frame = 0;

  const measure = () => {
    items = [...wheel.querySelectorAll<HTMLElement>('.option')].map((el) => ({
      el,
      top: wheel.offsetTop + el.offsetTop,
      height: el.offsetHeight,
    }));
  };

  const update = () => {
    frame = 0;
    const bandTop = scroll.scrollTop + head.offsetHeight;
    const bandBottom = scroll.scrollTop + scroll.clientHeight - foot.offsetHeight;
    for (const { el, top, height } of items) {
      // Distance of the card's near side from each band edge (negative: that much of the card is under a block).
      const fromTop = top - bandTop;
      const fromBottom = bandBottom - (top + height);
      const edge = Math.min(fromTop, fromBottom);
      // 0 while the card is fully inside the band (at rest), 1 once it is fully under a block.
      const p = Math.min(1, Math.max(0, -edge / height));
      if (p === 0) {
        el.style.transform = '';
        el.style.opacity = '';
        continue;
      }
      const side = fromTop < fromBottom ? 1 : -1; // top edge tilts the top away, the bottom edge the bottom
      const scale = 1 - (1 - MIN_SCALE) * p;
      el.style.transformOrigin = side > 0 ? '50% 100%' : '50% 0';
      el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${side * MAX_TILT * p}deg) scale(${scale})`;
      el.style.opacity = String(1 - (1 - MIN_OPACITY) * p);
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  measure();
  update();
  scroll.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(() => {
    measure();
    schedule();
  }).observe(scroll);
}
