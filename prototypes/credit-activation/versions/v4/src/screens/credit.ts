// #/ — «Кредит» (same in КН and ОК): the approved offer, the hint «До 4,5 млн ₽ с условиями» that opens
// #/conditions with the shared-header transition, and the pledge card «Залог авто» (the same flag as on
// #/conditions). «Дальше» goes to #/tariffs in КН and straight to #/review in ОК (owner, 2026-10-25).
// «Платеж в месяц» is the formula value (as v3), not the drawn 193 500 ₽ (spec, Q1).
import { renderAmount } from '../amount';
import { formatRub, monthlyPayment, PLEDGE_BONUS, totalAmount } from '../calc';
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
        <span class="hint__label t-body-m">До 4,5&nbsp;млн&nbsp;₽ с&nbsp;условиями</span>
        ${mask('chevron-right-service.svg', 'hint__chevron')}
      </span>
    </button>
  </div>`;

const payment = () => formatRub(monthlyPayment(choice()));

function render(root: HTMLElement, animate: boolean): void {
  renderAmount(root, animate);
  const value = root.querySelector<HTMLElement>('[data-payment]');
  if (value) value.textContent = payment();
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
      </div>
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next'), plain: true })}`,

  next: () => (product === 'kn' ? '#/tariffs' : '#/review'),

  refresh(root) {
    render(root, false);
  },

  mount(root) {
    const control = root.querySelector<HTMLElement>('.option__control')!;
    onActivate(control, () => {
      state.pledge = !state.pledge;
      render(root, true);
    });
  },
};
