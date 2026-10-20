// Shared building blocks rendered as HTML strings. Texts are static; user input is set via textContent.
import { duration, ease, gsap, prefersReducedMotion } from '@proto/motion';
import type { Tone } from './calc';
import { icon, maskStyle } from './icons';

/** Legal line under «Получить деньги» on #/review, the last step of both paths (owner, 2026-10-20). */
export const LEGAL =
  'Нажимая «Получить деньги», вы соглашаетесь <u>с&nbsp;условиями</u>. Они доступны до 16&nbsp;сентября';

/**
 * Actions handled by the navigation controller through event delegation. A control with `data-push="#/…"`
 * instead pushes that route (screens with more than one forward target, e.g. #/ and #/documents).
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

type AppBarSlot = 'back' | 'close' | null;

function appBarButton(slot: AppBarSlot, side: 'left' | 'right'): string {
  if (slot === 'back') {
    return `
      <button type="button" class="app-bar__back" ${action('back')} aria-label="Назад">
        <span class="mask app-bar__chevron" style="${maskStyle('back-ios-alt.svg')}"></span>
      </button>`;
  }
  if (slot === 'close') {
    return `<button type="button" class="text-button app-bar__text app-bar__text--${side}" ${action('close')}>Закрыть</button>`;
  }
  return '';
}

/** Mock iOS status bar + navigation bar; sticky with a blurred translucent background. */
export function topBars(left: AppBarSlot, right: AppBarSlot): string {
  return `
    <header class="top-bars">
      ${statusBar()}
      ${
        left || right
          ? `<nav class="app-bar">
              <div class="app-bar__slot">${appBarButton(left, 'left')}</div>
              <div class="app-bar__slot">${appBarButton(right, 'right')}</div>
            </nav>`
          : '<div class="app-bar" aria-hidden="true"></div>'
      }
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
  /** Chips row: the block becomes the translucent sticky panel of #/heavy and #/light (no fade). */
  chips?: string;
}

/** Sticky bottom block: fade (or the chips panel), optional legal text, the yellow button, home indicator. */
export function bottomBlock({ button, legalBelow, chips }: BottomBlock): string {
  const actions = button
    ? `<div class="bottom-block__actions">
        ${chips ? `<div class="chips" aria-live="polite">${chips}</div>` : ''}
        ${button}
      </div>
      ${legalBelow ? `<p class="legal legal--below"><span>${legalBelow}</span></p>` : ''}`
    : '';
  const modifier = chips ? ' bottom-block--panel' : button ? ' bottom-block--fade' : '';
  return `<footer class="bottom-block${modifier}">${actions}${homeIndicator()}</footer>`;
}

/** iOS radio: blue disc with a white check when selected, a hairline ring otherwise (state via CSS). */
export function iosRadio(): string {
  return `
    <span class="radio" aria-hidden="true">
      <img class="radio__normal" src="${icon('radio-normal.svg')}" alt="" width="22" height="22" />
      <img class="radio__selected" src="${icon('radio-selected.svg')}" alt="" width="22" height="22" />
      <span class="mask radio__check" style="${maskStyle('check-ios.svg')}"></span>
    </span>`;
}

export function mask(name: string, className: string): string {
  return `<span class="mask ${className}" style="${maskStyle(name)}" aria-hidden="true"></span>`;
}

// ---------- badges and chips ----------

/** Badge / chip glyphs: a 16 px box; the inner glyphs keep their own size at 1 px offset (spec «Assets»). */
export type Glyph = 'rub' | 'percent' | 'arrow';

const GLYPH_FILE: Record<Glyph, string> = {
  rub: 'currency-rub.svg',
  percent: 'percent-circle.svg',
  arrow: 'arrow-circle-right.svg',
};

export const glyph = (name: Glyph) => mask(GLYPH_FILE[name], `glyph glyph--${name}`);

/** `tui-badge` inside a card; it turns positive with its card (`.card-large.is-on`). */
export function badge(name: Glyph, label: string): string {
  return `<span class="badge">${glyph(name)}<span class="badge__label">${label}</span></span>`;
}

export function badges(...items: string[]): string {
  return `<span class="badges">${items.join('')}</span>`;
}

/** `tui-chip` of the sticky panels on #/heavy and #/light; `data-tone` is updated in place. */
export function chip(id: string, name: Glyph, label: string, tone: Tone): string {
  return `<span class="chip" data-chip="${id}" data-tone="${tone}">${glyph(name)}<span class="chip__label">${label}</span></span>`;
}

export function setChip(root: HTMLElement, id: string, label: string, tone: Tone): void {
  const el = root.querySelector<HTMLElement>(`[data-chip="${id}"]`);
  if (!el) return;
  el.dataset.tone = tone;
  el.querySelector('.chip__label')!.textContent = label;
}

// ---------- card-large (option cards on #/heavy and #/light) ----------

interface CardLarge {
  /** Unique id prefix. */
  id: string;
  /** Value written to `data-choice`. */
  choice: string;
  title: string;
  /** Plain-text title for the tooltip label. */
  titleText: string;
  description: string;
  checked: boolean;
  /** Badges or rows, part of the control. */
  body?: string;
  /** Interactive footer (outside the control, no nested controls). */
  footer?: string;
}

/**
 * `tui-card-large` whose content is one checkbox control (radio look). The «?» tooltip and
 * an optional footer button are siblings of the control, so no interactive element is nested in another.
 */
export function cardLarge(c: CardLarge): string {
  return `
    <div class="card-large${c.checked ? ' is-on' : ''}" data-card="${c.choice}">
      <div class="card-large__control" role="checkbox" tabindex="0" aria-checked="${c.checked}"
        data-choice="${c.choice}" aria-labelledby="${c.id}-title" aria-describedby="${c.id}-body">
        <span class="card-large__header">
          <span class="card-large__title t-heading-m" id="${c.id}-title">${c.title}</span>
          <span class="card-large__tooltip-slot"></span>
          ${iosRadio()}
        </span>
        <span class="card-large__body" id="${c.id}-body">
          ${c.description ? `<span class="card-large__description t-body-l">${c.description}</span>` : ''}
          ${c.body ?? ''}
        </span>
      </div>
      <button type="button" class="tooltip-button card-large__tooltip" aria-label="Подробнее: ${c.titleText}">
        <img src="${icon('tooltip-question.svg')}" alt="" width="12" height="12" />
      </button>
      ${c.footer ? `<div class="card-large__footer">${c.footer}</div>` : ''}
    </div>`;
}

/** Reflect a card control's state (radio look, positive badges). */
export function setCardChecked(control: HTMLElement, checked: boolean): void {
  control.setAttribute('aria-checked', String(checked));
  control.closest('.card-large')?.classList.toggle('is-on', checked);
}

/** Same depth as the yellow button's pressed state. */
const PRESSED_SCALE = 0.98;

/**
 * Press feedback of a card: it shrinks a little while pressed and springs back on release. A quick tap still
 * plays the whole press before the return, so the feedback is always visible. Off under reduced motion.
 */
function pressFeedback(control: HTMLElement): void {
  const card = control.closest<HTMLElement>('.card-large');
  if (!card || prefersReducedMotion()) return;
  let pressedAt = 0;
  const release = () => {
    if (!pressedAt) return;
    const held = (performance.now() - pressedAt) / 1000;
    pressedAt = 0;
    removeEventListener('pointerup', release);
    removeEventListener('pointercancel', release);
    const tl = gsap.timeline();
    if (held < duration.fast) {
      tl.to(card, {
        scale: PRESSED_SCALE,
        duration: duration.fast - held,
        ease: ease.productive,
        overwrite: true,
      });
    }
    tl.to(card, { scale: 1, duration: duration.moderate, ease: ease.productiveEntrance, overwrite: 'auto' });
  };
  const press = () => {
    pressedAt = performance.now();
    gsap.to(card, { scale: PRESSED_SCALE, duration: duration.fast, ease: ease.productive, overwrite: true });
    // The release may land outside the card (or on the viewport during an edge swipe).
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

/** Offer info card: caption + value (+ chevron). */
export function infoCard(
  caption: string,
  value: string,
  opts: { chevron?: boolean; wide?: boolean } = {},
): string {
  return `
    <div class="info-card${opts.wide ? ' info-card--wide' : ''}">
      <div class="info-card__text">
        <span class="t-ui-s text-secondary">${caption}</span>
        <span class="t-heading-s">${value}</span>
      </div>
      ${opts.chevron ? mask('chevron-right-small.svg', 'info-card__chevron') : ''}
    </div>`;
}
