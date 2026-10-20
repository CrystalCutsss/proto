// #/review — check the amount, the conditions that are on and the account; «Дальше» → #/documents.
// No «Комиссия» row (owner, Q8). «Залог и условия» lists what is on; it is left out only when nothing is.
import { formatRub, formatRubKopecks, monthlyPayment, totalAmount } from '../calc';
import { bottomBlock, primaryButton, secondaryButton, topBars } from '../components';
import { icon } from '../icons';
import { choice, state } from '../state';
import type { Screen } from './types';

const valueRow = (caption: string, value: string) => `
  <div class="row">
    <div class="row__text">
      <span class="t-ui-s text-secondary">${caption}</span>
      <span class="row__value t-body-l">${value}</span>
    </div>
  </div>`;

const avatarRow = (iconName: string, title: string, text: string) => `
  <div class="row row--avatar">
    <span class="avatar"><img src="${icon(iconName)}" alt="" width="24" height="24" /></span>
    <div class="row__text">
      <span class="t-body-l">${title}</span>
      <span class="t-ui-s text-secondary">${text}</span>
    </div>
  </div>`;

/** Rows of «Залог и условия» in the spec order: pledge, check, statement, package. */
function conditionRows(): string[] {
  const rows: string[] = [];
  if (state.pledge) rows.push(avatarRow('transport-auto.svg', 'Mercedes-Benz W214', 'Понадобится фото СТС'));
  if (state.check)
    rows.push(avatarRow('doc.svg', 'Проверка данных', 'Обычно занимает до&nbsp;1 рабочего дня'));
  if (state.statement)
    rows.push(avatarRow('doc.svg', 'Выписка из другого банка', 'Обычно проверяем за 2 минуты'));
  if (state.package)
    rows.push(avatarRow('briefcase.svg', 'Пакет «Все включено»', 'Документы не потребуются'));
  return rows;
}

export const review: Screen = {
  route: '#/review',
  label: 'Проверьте, все ли верно',
  canGoBack: true,
  html: () => {
    const c = choice();
    const rows = conditionRows();
    return `
    ${topBars('back', 'close')}
    <div class="content">
      <div class="large-title large-title--review">
        <h1 class="t-heading-l">Проверьте,<br />все ли верно</h1>
        <p class="t-body-l">Условия доступны до 16 декабря 2026</p>
      </div>
      <div class="cards">
        <section class="card" aria-labelledby="card-sum">
          <h2 class="card__title t-heading-m" id="card-sum">Сумма и платеж</h2>
          ${valueRow('Сумма', formatRub(totalAmount(c)))}
          ${valueRow('Платеж в месяц', formatRubKopecks(monthlyPayment(c)))}
          <div class="card__footer">${secondaryButton('График платежей')}</div>
        </section>
        ${
          rows.length
            ? `<section class="card" aria-labelledby="card-collateral">
                <h2 class="card__title t-heading-m" id="card-collateral">Залог и условия</h2>
                <div class="card__rows">${rows.join('')}</div>
                <div class="card__footer">${secondaryButton('Как это работает')}</div>
              </section>`
            : ''
        }
        <section class="card card--account" aria-labelledby="card-account">
          <div class="card__header">
            <h2 class="t-heading-m" id="card-account">Рублевый счет</h2>
            <button type="button" class="text-button t-body-l">Изменить</button>
          </div>
          <p class="card__subtitle t-body-m text-secondary">Куда поступят деньги</p>
        </section>
      </div>
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`;
  },

  next: () => '#/documents',
};
