// #/review — check the amount, the conditions that are on and the account. Without a pledge and options
// («Проверка без опций») there is no «Залог и условия» card and the button gets the money right away.
import { formatRub, formatRubKopecks, hasConditions, monthlyPayment, totalAmount } from '../calc';
import { LEGAL, bottomBlock, feeHtml, primaryButton, secondaryButton, topBars } from '../components';
import { config } from '../config';
import { icon } from '../icons';
import { choice, state } from '../state';
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

/** Rows of «Залог и условия» in the spec order: pledge, check, turnover, statement, package. */
function conditionRows(): string {
  const rows: string[] = [];
  if (state.pledge === 'auto')
    rows.push(avatarRow('transport-auto.svg', 'Mercedes-Benz W214', 'Понадобится фото СТС'));
  if (state.pledge === 'realty') {
    rows.push(avatarRow('doc.svg', 'Москва, ул.&nbsp;Лесная, 27, кв.&nbsp;263', 'Понадобится выписка ЕГРН'));
  }
  if (state.options.check)
    rows.push(avatarRow('doc.svg', 'Проверка данных', 'Обычно занимает до&nbsp;1 рабочего дня'));
  if (state.options.turnover)
    rows.push(avatarRow('briefcase.svg', 'Оборот по счету в&nbsp;Т‑Банке', 'От&nbsp;46&nbsp;789&nbsp;₽/мес'));
  if (state.options.statement)
    rows.push(avatarRow('doc.svg', 'Выписка из другого банка', 'Обычно проверяем за 2 минуты'));
  if (choice().package)
    rows.push(avatarRow('briefcase.svg', 'Пакет «Все включено»', 'Документы не потребуются'));
  return rows.join('');
}

export const review: Screen = {
  route: '#/review',
  label: 'Проверьте, все ли верно',
  canGoBack: true,
  html: () => {
    const c = choice();
    const full = hasConditions(c);
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
          ${config.product === 'ok' ? valueRow('Комиссия', feeHtml(c)) : ''}
          <div class="card__footer">${secondaryButton('График платежей')}</div>
        </section>
        ${
          full
            ? `<section class="card" aria-labelledby="card-collateral">
                <h2 class="card__title t-heading-m" id="card-collateral">Залог и условия</h2>
                ${conditionRows()}
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
    ${
      full
        ? bottomBlock({ button: primaryButton('Дальше', 'next') })
        : bottomBlock({ button: primaryButton('Получить деньги', 'next'), legalBelow: LEGAL })
    }`;
  },

  next: () => (hasConditions(choice()) ? (config.docs === 'one' ? '#/sts' : '#/documents') : '#/success'),
};
