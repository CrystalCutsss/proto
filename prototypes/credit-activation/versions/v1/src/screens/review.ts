// #/review — check the amount, collateral and the account before getting the money.
import { bottomBlock, primaryButton, secondaryButton, topBars } from '../components';
import { icon } from '../icons';
import { formatRub, state } from '../state';
import type { Screen } from './types';

const valueRow = (caption: string, value: string) => `
  <div class="row">
    <div class="row__text">
      <span class="t-ui-s text-secondary">${caption}</span>
      <span class="t-body-l">${value}</span>
    </div>
  </div>`;

const avatarRow = (iconName: string, title: string, text: string) => `
  <div class="row">
    <span class="avatar"><img src="${icon(iconName)}" alt="" width="24" height="24" /></span>
    <div class="row__text">
      <span class="t-body-l">${title}</span>
      <span class="t-ui-s text-secondary">${text}</span>
    </div>
  </div>`;

export const review: Screen = {
  route: '#/review',
  label: 'Проверьте, все ли верно',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <div class="large-title large-title--review">
        <h1 class="t-heading-l">Проверьте,<br />все ли верно</h1>
        <p class="t-body-l">Условия доступны до 16 декабря 2026</p>
      </div>
      <div class="cards">
        <section class="card" aria-labelledby="card-sum">
          <h2 class="card__title t-heading-m" id="card-sum">Сумма и платеж</h2>
          ${valueRow('Всего', formatRub(state.amount))}
          ${valueRow('Платеж в месяц', '20\u00a0851,05\u00a0₽')}
          <div class="card__footer">${secondaryButton('График платежей')}</div>
        </section>
        <section class="card" aria-labelledby="card-collateral">
          <h2 class="card__title t-heading-m" id="card-collateral">Залог и условия</h2>
          ${avatarRow('transport-auto.svg', 'Mercedes-Benz W214', 'Понадобится фото СТС')}
          ${avatarRow('doc.svg', 'Выписка из другого банка', 'Обычно проверяем за 2 минуты')}
          <div class="card__footer">${secondaryButton('Как это работает')}</div>
        </section>
        <section class="card card--account" aria-labelledby="card-account">
          <div class="card__header">
            <h2 class="t-heading-m" id="card-account">Рублевый счет</h2>
            <button type="button" class="text-button t-body-l">Изменить</button>
          </div>
          <p class="card__subtitle t-body-m text-secondary">Куда поступят деньги</p>
        </section>
      </div>
    </div>
    ${bottomBlock({
      legalAbove: 'Нажимая «Получить деньги», вы соглашаетесь с условиями. Они доступны до 16 декабря',
      button: primaryButton('Дальше', 'next'),
    })}`,
};
