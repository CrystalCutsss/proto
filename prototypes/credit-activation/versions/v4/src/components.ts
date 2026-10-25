// Shared building blocks rendered as HTML strings. Texts are static; user input is set via textContent.
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import type { Tone } from './calc';
import { icon, maskStyle } from './icons';

/** Legal line under «Получить деньги» (#/review without the pledge, #/documents). */
export const LEGAL =
  'Нажимая «Получить деньги», вы соглашаетесь <u>с&nbsp;условиями</u>. Они доступны до 16&nbsp;сентября';

/**
 * Actions handled by the navigation controller through event delegation. A control with `data-push="#/…"`
 * instead pushes that route (screens with more than one forward target, e.g. #/ and #/tariffs).
 */
export type NavAction = 'next' | 'back' | 'close';

/** Attribute of a control that pushes `route` when activated (see NavAction). */
export const pushRoute = (route: string) => `data-push="${route}"`;

const action = (a: NavAction) => `data-action="${a}"`;

/** Drawn iOS status bar; hidden where the device has its own (data-proto-system-bar, ADR-0020). */
export function statusBar(): string {
  return `
    <div class="status-bar" aria-hidden="true" data-proto-system-bar>
      <img class="status-bar__time" src="${icon('status-time.svg')}" alt="" width="28" height="11" />
      <span class="status-bar__right">
        <img src="${icon('status-signal-wifi.svg')}" alt="" width="63" height="10" />
        <img class="status-bar__battery" src="${icon('status-battery.svg')}" alt="" width="25" height="12" />
      </span>
    </div>`;
}

export function mask(name: string, className: string): string {
  return `<span class="mask ${className}" style="${maskStyle(name)}" aria-hidden="true"></span>`;
}

type AppBarSlot = 'back' | 'close' | 'dismiss' | null;

/**
 * iOS 26 app bar buttons: 44 px glass circles. `dismiss` is the close glyph of a root screen (#/,
 * `close-ios26`), `close` the one on pushed screens (`close-ios`), as the V5 frames draw them.
 */
function appBarButton(slot: AppBarSlot): string {
  if (slot === 'back') {
    return `<button type="button" class="glass-button" ${action('back')} aria-label="Назад">${mask('back-ios26.svg', 'glass-button__back')}</button>`;
  }
  if (slot === 'close' || slot === 'dismiss') {
    const glyph =
      slot === 'close'
        ? mask('close-ios.svg', 'glass-button__close')
        : mask('close-ios26.svg', 'glass-button__dismiss');
    return `<button type="button" class="glass-button" ${action('close')} aria-label="Закрыть">${glyph}</button>`;
  }
  return '';
}

/** Mock iOS status bar + navigation bar; sticky with a blurred translucent background. */
export function topBars(left: AppBarSlot, right: AppBarSlot, extra = ''): string {
  return `
    <header class="top-bars">
      ${statusBar()}
      ${
        left || right
          ? `<nav class="app-bar" data-fade>
              <div class="app-bar__slot">${appBarButton(left)}</div>
              <div class="app-bar__slot">${appBarButton(right)}</div>
            </nav>`
          : '<div class="app-bar" aria-hidden="true"></div>'
      }
      ${extra}
    </header>`;
}

export function primaryButton(label: string, act: NavAction, size: 'l' | 'm' = 'l', attrs = ''): string {
  return `<button type="button" class="button button--primary button--${size}" ${action(act)}${attrs ? ` ${attrs}` : ''}><span class="button__label">${label}</span></button>`;
}

export function secondaryButton(label: string): string {
  return `<button type="button" class="button button--secondary button--m"><span class="button__label">${label}</span></button>`;
}

export const homeIndicator = () =>
  `<div class="home-indicator" aria-hidden="true" data-proto-system-bar></div>`;

interface BottomBlock {
  button?: string;
  legalBelow?: string;
  /** No TUI fade above the button (#/ and #/conditions draw the button on the plain background). */
  plain?: boolean;
}

/** Sticky bottom block: fade, the yellow button, optional legal text, home indicator. */
export function bottomBlock({ button, legalBelow, plain }: BottomBlock): string {
  const actions = button
    ? `<div class="bottom-block__actions">${button}</div>
      ${legalBelow ? `<p class="legal legal--below"><span>${legalBelow}</span></p>` : ''}`
    : '';
  const modifier = button && !plain ? ' bottom-block--fade' : '';
  return `<footer class="bottom-block${modifier}">${actions}${homeIndicator()}</footer>`;
}

// ---------- badges and chips ----------

/** Badge / chip glyphs: a 16 px box; the inner glyphs keep their own size at a 1 px offset (spec «Assets»). */
export type Glyph = 'percent' | 'arrow' | 'calendar';

const GLYPH_FILE: Record<Glyph, string> = {
  percent: 'percent-circle.svg',
  arrow: 'arrow-circle-right.svg',
  calendar: 'calendar-small.svg',
};

export const glyph = (name: Glyph) => mask(GLYPH_FILE[name], `glyph glyph--${name}`);

/** `tui-badge`: text only on neutral-1 (amounts), or with the % glyph on neutral-2 (fee cuts), as drawn. */
export function badge(label: string, name?: Glyph): string {
  return name
    ? `<span class="badge badge--glyph">${glyph(name)}<span class="badge__label">${label}</span></span>`
    : `<span class="badge"><span class="badge__label">${label}</span></span>`;
}

export function badges(...items: string[]): string {
  return `<span class="badges">${items.join('')}</span>`;
}

/** `tui-chip` of the header on #/conditions; `data-tone` and the label are updated in place. */
export function chip(id: string, name: Glyph, label: string, tone: Tone = 'neutral'): string {
  return `<span class="chip" data-chip="${id}" data-tone="${tone}">${glyph(name)}<span class="chip__label">${label}</span></span>`;
}

export function setChip(root: HTMLElement, id: string, label: string, tone: Tone): void {
  const el = root.querySelector<HTMLElement>(`[data-chip="${id}"]`);
  if (!el) return;
  el.dataset.tone = tone;
  el.querySelector('.chip__label')!.textContent = label;
}

// ---------- option cards (#/ pledge card, the wheel on #/conditions) ----------

/** `tui-labs-action` 56 px: blue plus on neutral-1, a green check on positive-pale when the card is on. */
const actionCircle = () => `
  <span class="action-circle" aria-hidden="true">
    ${mask('plus.svg', 'action-circle__plus')}
    ${mask('check-pragmatic.svg', 'action-circle__check')}
  </span>`;

interface OptionCard {
  /** Unique id prefix. */
  id: string;
  /** Value written to `data-choice`. */
  choice: string;
  title: string;
  description: string;
  badges: string;
  checked: boolean;
  /** A text button next to the title (outside the control, no nested controls), e.g. «Изменить» on #/. */
  link?: string;
}

/**
 * `tui-card-large` with a `tui-cell [button]`: the whole card is one checkbox control (tap anywhere or on «+»).
 * Title, description and badges on the left, the 56 px action circle on the right.
 */
export function optionCard(c: OptionCard): string {
  return `
    <div class="option${c.checked ? ' is-on' : ''}${c.link ? ' option--link' : ''}" data-card="${c.choice}">
      <div class="option__control" role="checkbox" tabindex="0" aria-checked="${c.checked}"
        data-choice="${c.choice}" aria-labelledby="${c.id}-title" aria-describedby="${c.id}-body">
        <span class="option__text">
          <span class="option__head">
            <span class="option__title t-heading-m" id="${c.id}-title">${c.title}</span>
            <span class="option__description t-body-m" id="${c.id}-body">${c.description}</span>
          </span>
          ${c.badges}
        </span>
        ${actionCircle()}
      </div>
      ${c.link ? `<button type="button" class="text-button option__link">${c.link}</button>` : ''}
    </div>`;
}

/** Reflect a card control's state (action circle). */
export function setOptionChecked(control: HTMLElement, checked: boolean): void {
  control.setAttribute('aria-checked', String(checked));
  control.closest('.option')?.classList.toggle('is-on', checked);
}

/** Same depth as the yellow button's pressed state. */
const PRESSED_SCALE = 0.98;

/**
 * Press feedback of a card: it shrinks a little while pressed and springs back on release. A quick tap still
 * plays the whole press before the return, so the feedback is always visible. Off under reduced motion.
 * The card's own transform belongs to the wheel (#/conditions), so the press scales its inner surface.
 */
function pressFeedback(control: HTMLElement): void {
  if (prefersReducedMotion()) return;
  let pressedAt = 0;
  const release = () => {
    if (!pressedAt) return;
    const held = (performance.now() - pressedAt) / 1000;
    pressedAt = 0;
    removeEventListener('pointerup', release);
    removeEventListener('pointercancel', release);
    const tl = gsap.timeline();
    if (held < duration.fast) {
      tl.to(control, {
        scale: PRESSED_SCALE,
        duration: duration.fast - held,
        ease: ease.productive,
        overwrite: true,
      });
    }
    tl.to(control, {
      scale: 1,
      duration: duration.moderate,
      ease: ease.productiveEntrance,
      overwrite: 'auto',
    });
  };
  const press = () => {
    pressedAt = performance.now();
    gsap.to(control, {
      scale: PRESSED_SCALE,
      duration: duration.fast,
      ease: ease.productive,
      overwrite: true,
    });
    // The release may land outside the card (or on the viewport during a scroll or an edge swipe).
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
  };
  control.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) press();
  });
  control.addEventListener('pointerleave', release);
  control.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      press();
      release();
    }
  });
}

/** Space / Enter toggle a card control (click handles pointer and the rest); pressing it plays press feedback. */
export function onActivate(control: HTMLElement, handler: () => void): void {
  pressFeedback(control);
  control.addEventListener('click', handler);
  control.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handler();
    }
  });
}

/** Offer info card (`tui-card-large` neutral-1, 72 px): caption + value + chevron. Visual only. */
export function infoCard(caption: string, value: string, valueAttr = ''): string {
  return `
    <div class="info-card">
      <div class="info-card__text">
        <span class="t-ui-s text-secondary">${caption}</span>
        <span class="t-heading-s"${valueAttr ? ` ${valueAttr}` : ''}>${value}</span>
      </div>
      ${mask('chevron-right-service.svg', 'info-card__chevron')}
    </div>`;
}
