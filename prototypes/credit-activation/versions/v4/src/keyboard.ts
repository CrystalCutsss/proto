// The iOS 26 numeric keyboard (Figma system-keyboard 105:10204, Type=Numeric). A device brings up its own:
// where the device has its own bars (an installed web app, the viewer's full-screen phone mode: the loader sets
// data-proto-bars="hidden") the input keeps inputmode="numeric" and the native keyboard opens. In the viewer's
// iPhone mockup (desktop) there is none, so this drawn one slides up instead while the input has focus; its keys
// type into the input and it never takes the focus away from it.
import { icon } from './icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

/** Whether the device draws its own keyboard (a phone or an installed web app). */
export const hasNativeKeyboard = (): boolean => document.documentElement.dataset.protoBars === 'hidden';

let el: HTMLElement | null = null;
let target: HTMLInputElement | null = null;

function keyboardElement(): HTMLElement {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'keyboard';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="keyboard__keys">${KEYS.map((key) =>
    key === 'delete'
      ? `<button type="button" class="keyboard__delete" data-key="delete" tabindex="-1" aria-label="Стереть">
          <span class="mask keyboard__delete-glyph" style="--mask: url('${icon('keyboard-delete.svg')}')"></span></button>`
      : key
        ? `<button type="button" class="keyboard__key" data-key="${key}" tabindex="-1">${key}</button>`
        : '<span></span>',
  ).join('')}</div>`;
  // Keep the focus (and the caret) in the input: a press on the keyboard must not blur it.
  el.addEventListener('mousedown', (event) => event.preventDefault());
  el.addEventListener('click', (event) => {
    const key = (event.target as Element).closest<HTMLElement>('[data-key]')?.dataset.key;
    if (!key || !target) return;
    target.value = key === 'delete' ? target.value.replace(/\d\D*$/, '') : target.value + key;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.querySelector('.app')!.append(el);
  return el;
}

/**
 * Wire an input to the numeric keyboard: native on a device; elsewhere the drawn one shows while the input has
 * focus (inputmode="none" keeps a desktop's own virtual keyboard closed; a physical keyboard still types).
 */
export function attachKeyboard(input: HTMLInputElement): void {
  if (hasNativeKeyboard()) return;
  input.inputMode = 'none';
  input.addEventListener('focus', () => {
    target = input;
    keyboardElement().classList.add('is-open');
  });
  input.addEventListener('blur', () => {
    if (target === input) target = null;
    el?.classList.remove('is-open');
  });
}
