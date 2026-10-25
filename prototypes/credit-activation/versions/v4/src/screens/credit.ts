// #/ — «Кредит»: the approved offer and the hint «400 000 ₽ и улучшить условия» that opens #/conditions with the
// shared-header transition. Two states (frames «Кредит КН» / «Кредит ОК»): КН shows «Срок» and «Платеж в месяц»
// and the pledge card «Залог авто» (the same flag as on #/conditions, where КН has no pledge card); ОК shows
// «Срок», «Комиссия» and a wide «Платеж в месяц» and no pledge card (owner, 2026-10-25). «Дальше» goes to
// #/tariffs («Варианты платежа») in КН and straight to #/review in ОК.
// «Платеж в месяц» is the formula value (as v3), not the drawn 193 500 ₽ (spec, Q2). Every
// forward step from here starts a fresh branch, so a tariff chosen earlier is dropped (it belongs to #/tariffs).
import { renderAmount, stopAmount } from '../amount';
import { fee, formatPercent, formatRub, monthlyPayment, PLEDGE_BONUS, totalAmount } from '../calc';
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

const hint = () => `
  <div class="hint" data-fade>
    <button type="button" class="hint__button" ${pushRoute('#/conditions')}>
      ${mask('hint-tail.svg', 'hint__tail')}
      <span class="hint__body">
        ${mask('plus.svg', 'hint__plus')}
        <span class="hint__label t-body-m">400&nbsp;000&nbsp;₽ и&nbsp;улучшить условия</span>
        ${mask('chevron-right-service.svg', 'hint__chevron')}
      </span>
    </button>
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
}

export const credit: Screen = {
  route: '#/',
  label: 'Одобрили кредит',
  canGoBack: false,
  html: () => `
    ${topBars('dismiss', null)}
    <div class="content content--credit">
      <h1 class="offer__title t-heading-s" data-fade>Одобрили кредит<br />ИП Константинопольский К.&nbsp;К.</h1>
      <p class="offer__amount t-number-2xl" data-shared="amount" data-amount>${formatRub(totalAmount(choice()))}</p>
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
    const control = root.querySelector<HTMLElement>('.option__control');
    if (!control) return;
    onActivate(control, () => {
      state.pledge = !state.pledge;
      render(root, true);
    });
  },
};
