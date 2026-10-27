// #/ — «Кредит»: the approved offer and the hint (КН «До 4,5 млн ₽ с условиями», ОК «400 000 ₽ с улучшением
// условий») that opens #/conditions with the shared-header transition. Two states (frames «Кредит КН» /
// «Кредит ОК»): КН shows the amount with a chevron that takes an exact amount from the numeric keyboard (owner,
// 2026-10-27), «Срок», «Платеж в месяц» and the pledge card «Залог авто» (the same flag as on #/conditions, where
// КН has no pledge card); ОК shows «Срок», «Комиссия» and a wide «Платеж в месяц» and no pledge card (owner,
// 2026-10-25). «Дальше» goes to #/tariffs («Варианты платежа») in КН and straight to #/review in ОК.
// «Платеж в месяц» is the formula value (as v3), not the drawn 193 500 ₽ (spec, Q2). Every
// forward step from here starts a fresh branch, so a tariff chosen earlier is dropped (it belongs to #/tariffs).
import { renderAmount, stopAmount } from '../amount';
import {
  clampAmount,
  fee,
  formatPercent,
  formatRub,
  limitAmount,
  monthlyPayment,
  PLEDGE_BONUS,
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

/** КН (frame «Кредит КН» 105:6556): the elevated white bubble with the shadow, no chevron; ОК keeps the neutral one. */
const hint = () =>
  product === 'kn'
    ? `
  <div class="hint hint--elevated" data-fade>
    <button type="button" class="hint__button" ${pushRoute('#/conditions')}>
      ${mask('hint-tail.svg', 'hint__tail')}
      <span class="hint__body">
        ${mask('plus.svg', 'hint__plus')}
        <span class="hint__label t-body-m">До&nbsp;4,5&nbsp;млн&nbsp;₽ с&nbsp;условиями</span>
      </span>
    </button>
  </div>`
    : `
  <div class="hint" data-fade>
    <button type="button" class="hint__button" ${pushRoute('#/conditions')}>
      ${mask('hint-tail.svg', 'hint__tail')}
      <span class="hint__body">
        ${mask('plus.svg', 'hint__plus')}
        <span class="hint__label t-body-m">400&nbsp;000&nbsp;₽ с&nbsp;улучшением условий</span>
        ${mask('chevron-right-service.svg', 'hint__chevron')}
      </span>
    </button>
  </div>`;

/** «4000000» → «4 000 000» (non-breaking spaces), the value of the amount input while it is typed. */
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

/**
 * КН: the amount with the chevron (frame «Кредит КН»). A tap on the amount or the chevron lands on a transparent
 * numeric input laid over both, which brings up the numeric keyboard; the typed amount is kept within
 * [MIN_AMOUNT, limit] when the input loses focus.
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

/** The exact amount input (КН): digits only while typing, the clamped amount on blur, Enter closes the keyboard. */
function mountAmountField(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('.amount-field__input');
  if (!input) return;
  input.addEventListener('input', () => {
    input.value = groupDigits(input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9));
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });
  input.addEventListener('blur', () => {
    const typed = Number(input.value.replace(/\D/g, ''));
    if (typed) {
      const amount = clampAmount(typed, choice());
      state.requested = amount === limitAmount(choice()) ? null : amount;
    }
    input.value = groupDigits(String(totalAmount(choice())));
    render(root, true);
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
      ${
        product === 'kn'
          ? amountField()
          : `<p class="offer__amount t-number-2xl" data-shared="amount" data-amount>${formatRub(totalAmount(choice()))}</p>`
      }
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
