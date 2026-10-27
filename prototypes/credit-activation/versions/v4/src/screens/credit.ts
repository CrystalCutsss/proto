// #/ — «Кредит»: the approved offer and the hint «До 4,5 млн ₽ с условиями» that opens #/conditions with the
// shared-header transition. Both products show the amount with a chevron that takes an exact amount from the
// numeric keyboard, and the КН bubble (owner, 2026-10-27). Two states (frames «Кредит КН» / «Кредит ОК»): КН shows
// «Срок», «Платеж в месяц» and the pledge card «Залог авто» (the same flag as on #/conditions, where КН has no
// pledge card); ОК shows «Срок», «Комиссия» and a wide «Платеж в месяц» and no pledge card (owner, 2026-10-25).
// «Дальше» goes to #/tariffs («Варианты платежа») in КН and straight to #/review in ОК.
// «Платеж в месяц» is the formula value (as v3), not the drawn 193 500 ₽ (spec, Q2). Every
// forward step from here starts a fresh branch, so a tariff chosen earlier is dropped (it belongs to #/tariffs).
import { renderAmount, stopAmount } from '../amount';
import {
  fee,
  formatPercent,
  formatRub,
  limitAmount,
  monthlyPayment,
  PLEDGE_BONUS,
  requestedFor,
  totalAmount,
} from '../calc';
import { product } from '../config';
import {
  badge,
  badges,
  bottomBlock,
  infoCard,
  mask,
  onActivate,
  optionCard,
  primaryButton,
  pushRoute,
  setOptionChecked,
  topBars,
} from '../components';
import { choice, state } from '../state';
import type { Screen } from './types';
import { attachKeyboard } from '../keyboard';
import { showToast } from '../toast';

/** The elevated white bubble with the shadow and no chevron (frame «Кредит КН» 105:6556), in КН and ОК (owner,
 * 2026-10-27). */
const hint = () => `
  <div class="hint hint--elevated" data-fade>
    <button type="button" class="hint__button" ${pushRoute('#/conditions')}>
      ${mask('hint-tail.svg', 'hint__tail')}
      <span class="hint__body">
        ${mask('plus.svg', 'hint__plus')}
        <span class="hint__label t-body-m">До&nbsp;4,5&nbsp;млн&nbsp;₽ с&nbsp;условиями</span>
      </span>
    </button>
  </div>`;

/** «4000000» → «4 000 000» (non-breaking spaces), the value of the amount input while it is typed. */
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

/**
 * The amount with the chevron (frame «Кредит КН», in ОК too). A tap on the amount or the chevron lands on a
 * transparent numeric input laid over both, which brings up the numeric keyboard (keyboard.ts); the typed amount is
 * kept within [MIN_AMOUNT, limit].
 */
const amountField = () => `
  <div class="offer__amount">
    <div class="amount-field">
      <span class="t-number-2xl" data-shared="amount" data-amount aria-hidden="true">${formatRub(totalAmount(choice()))}</span>
      ${mask('chevron-right-service.svg', 'amount-field__chevron')}
      <input class="amount-field__input t-number-2xl" type="text" inputmode="numeric" enterkeyhint="done"
        autocomplete="off" aria-label="Сумма кредита, ₽" value="${groupDigits(String(totalAmount(choice())))}" />
    </div>
  </div>`;

const payment = () => formatRub(monthlyPayment({ ...choice(), tariff: null }));

const knCards = () => `
  <div class="info-cards" data-fade>
    ${infoCard('Срок', '5 лет')}
    ${infoCard('Платеж в месяц', payment(), 'data-payment')}
  </div>
  <div class="credit-pledge" data-fade>
    ${optionCard({
      id: 'credit-pledge',
      choice: 'pledge',
      title: 'Залог авто',
      description: 'Mercedes-Benz W214',
      badges: badges(badge(`+${formatRub(PLEDGE_BONUS)}`), badge('−0,5%')),
      checked: state.pledge,
      link: 'Изменить',
    })}
  </div>`;

/** ОК: «Срок» and «Комиссия» (no chevron) side by side, the wide «Платеж в месяц» under them. */
const okCards = () => `
  <div class="info-cards info-cards--ok" data-fade>
    ${infoCard('Срок', '5 лет')}
    ${infoCard('Комиссия', formatPercent(fee(choice())), 'data-fee', false)}
    <div class="info-cards__wide">${infoCard('Платеж в месяц', payment(), 'data-payment')}</div>
  </div>`;

function render(root: HTMLElement, animate: boolean): void {
  renderAmount(root, animate);
  const value = root.querySelector<HTMLElement>('[data-payment]');
  if (value) value.textContent = payment();
  const feeValue = root.querySelector<HTMLElement>('[data-fee]');
  if (feeValue) feeValue.textContent = formatPercent(fee(choice()));
  const control = root.querySelector<HTMLElement>('.option__control');
  if (control) setOptionChecked(control, state.pledge);
  const input = root.querySelector<HTMLInputElement>('.amount-field__input');
  if (input && document.activeElement !== input) input.value = groupDigits(String(totalAmount(choice())));
}

/**
 * The exact amount input: digits only while typing; a number above the limit is cut to it at once with the toast
 * «Можем выдать не больше …» (Figma tui-notification-toast 105:10434). On blur the amount is set without the count
 * animation (owner, 2026-10-27); Enter closes the keyboard.
 */
function mountAmountField(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('.amount-field__input');
  if (!input) return;
  attachKeyboard(input);
  input.addEventListener('input', () => {
    let digits = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9);
    const limit = limitAmount(choice());
    if (Number(digits) > limit) {
      digits = String(limit);
      showToast(`Можем выдать не больше ${formatRub(limit)}`);
    }
    input.value = groupDigits(digits);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });
  input.addEventListener('blur', () => {
    const typed = Number(input.value.replace(/\D/g, ''));
    if (typed) state.requested = requestedFor(typed, choice());
    input.value = groupDigits(String(totalAmount(choice())));
    render(root, false);
  });
}

export const credit: Screen = {
  route: '#/',
  label: 'Одобрили кредит',
  canGoBack: false,
  html: () => `
    ${topBars('dismiss', null)}
    <div class="content content--credit">
      <h1 class="offer__title t-heading-s" data-fade>Одобрили кредит<br />ИП Константинопольский К.&nbsp;К.</h1>
      ${amountField()}
      ${hint()}
      ${product === 'ok' ? okCards() : knCards()}
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next'), plain: true })}`,

  next: () => (product === 'kn' ? '#/tariffs' : '#/review'),

  beforeAction() {
    state.tariff = null;
  },

  unmount: stopAmount,

  refresh(root) {
    render(root, false);
  },

  mount(root) {
    mountAmountField(root);
    const control = root.querySelector<HTMLElement>('.option__control');
    if (!control) return;
    onActivate(control, () => {
      state.pledge = !state.pledge;
      render(root, true);
    });
  },
};
