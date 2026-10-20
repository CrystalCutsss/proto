// #/ — «Условия»: the approved offer (static amount and terms) and two ways forward: the card «Увеличить
// лимит» pushes #/heavy (heavy path), «Дальше» pushes #/light (direct path: #/light → #/review → #/success with
// «Дальше» everywhere, owner 2026-10-20). The terms are the calc values of the offer before any choice
// (owner, Q1), so «Платеж в месяц» is the formula value at 4 000 000 ₽, not the drawn 193 500 ₽.
import { AMOUNT, BASE_CHOICE, BASE_FEE, formatPercent, formatRub, monthlyPayment } from '../calc';
import { bottomBlock, infoCard, primaryButton, pushRoute, topBars } from '../components';
import { icon } from '../icons';
import { state } from '../state';
import type { Screen } from './types';

const limitCard = () => `
  <div class="limit">
    <button type="button" class="limit-card" ${pushRoute('#/heavy')}>
      <span class="limit-card__avatar">
        <img src="${icon('plus-circle.svg')}" alt="" width="24" height="24" />
      </span>
      <span class="limit-card__text">
        <span class="t-heading-m">Увеличить лимит</span>
        <span class="t-body-l">При выполнении условий</span>
      </span>
    </button>
  </div>`;

export const conditions: Screen = {
  route: '#/',
  label: 'Одобрили кредит',
  canGoBack: false,
  html: () => `
    ${topBars('close', null)}
    <div class="content content--conditions">
      <h1 class="offer__title t-heading-s">Одобрили кредит<br />ИП Константинопольский К.&nbsp;К.</h1>
      <p class="offer__amount t-number-2xl">${formatRub(AMOUNT.initial)}</p>
      <div class="info-cards">
        ${infoCard('Срок', '5 лет', { chevron: true })}
        ${infoCard('Комиссия', formatPercent(BASE_FEE))}
        ${infoCard('Платеж в месяц', formatRub(monthlyPayment(BASE_CHOICE)), { chevron: true, wide: true })}
      </div>
      ${limitCard()}
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/light',

  beforeAction(control) {
    state.direct = control.dataset.action === 'next';
  },
};
