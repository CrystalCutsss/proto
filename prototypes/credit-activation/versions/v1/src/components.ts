// Shared building blocks rendered as HTML strings. Texts are static; user input is set via textContent.
import { icon, maskStyle } from './icons';

/** Actions handled by the navigation controller through event delegation. */
export type NavAction = 'next' | 'back' | 'close';

const action = (a: NavAction) => `data-action="${a}"`;

export function statusBar(): string {
  return `
    <div class="status-bar" aria-hidden="true">
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

export function primaryButton(label: string, act: NavAction, size: 'l' | 'm' = 'l'): string {
  return `<button type="button" class="button button--primary button--${size}" ${action(act)}><span class="button__label">${label}</span></button>`;
}

export function secondaryButton(label: string): string {
  return `<button type="button" class="button button--secondary button--m"><span class="button__label">${label}</span></button>`;
}

export const homeIndicator = () => `<div class="home-indicator" aria-hidden="true"></div>`;

interface BottomBlock {
  button?: string;
  legalAbove?: string;
  legalBelow?: string;
}

/** Sticky bottom block: fade, optional legal text, the yellow button and the home indicator. */
export function bottomBlock({ button, legalAbove, legalBelow }: BottomBlock): string {
  const actions = button
    ? `<div class="bottom-block__actions">
        ${legalAbove ? `<p class="legal">${legalAbove}</p>` : ''}
        ${button}
        ${legalBelow ? `<p class="legal legal--below"><span>${legalBelow}</span></p>` : ''}
      </div>`
    : '';
  return `<footer class="bottom-block${button ? ' bottom-block--fade' : ''}">${actions}${homeIndicator()}</footer>`;
}

export function iosSwitch(labelledBy: string, checked: boolean, index: number): string {
  return `<input type="checkbox" role="switch" class="switch" data-option="${index}" aria-labelledby="${labelledBy}"${checked ? ' checked' : ''} />`;
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
