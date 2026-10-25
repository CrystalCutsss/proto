// #/tariffs — «Варианты платежа» (КН only, after «Дальше» on #/): a horizontal snap slider of tariff cards.
// «Выбрать» sets the tariff, which drives the payment on #/review (owner, 2026-10-25), and pushes #/review;
// «Свои условия» → «Настроить» opens #/conditions. Only the first card's bullets are drawn; the others are
// Lorem ipsum in the frame, so their texts are placeholders (spec, Q14).
import { formatPerMonth, type Tariff, tariffPayment } from '../calc';
import { bottomBlock, mask, pushRoute, topBars } from '../components';
import { icon } from '../icons';
import { state } from '../state';
import type { Screen } from './types';

interface TariffCard {
  id: Tariff;
  title: string;
  subtitle: string;
  bullets: string[];
  button: string;
  route: string;
  badge?: string;
}

const CARDS: TariffCard[] = [
  {
    id: 'universal',
    title: formatPerMonth(tariffPayment('universal')),
    subtitle: '«Универсальный»',
    bullets: [
      'Ставка ниже на&nbsp;15% — сэкономите 10&nbsp;541&nbsp;₽',
      'Бесплатное обслуживание счета для бизнеса',
      'Без комиссии за досрочное погашение',
    ],
    button: 'Выбрать',
    route: '#/review',
    badge: 'Часто выбирают',
  },
  {
    id: 'minimal',
    title: formatPerMonth(tariffPayment('minimal')),
    subtitle: '«Минимальный»',
    bullets: [
      'Самый низкий платеж в&nbsp;месяц',
      'Обслуживание счета по&nbsp;тарифу',
      'Досрочное погашение без ограничений',
    ],
    button: 'Выбрать',
    route: '#/review',
  },
  {
    id: 'custom',
    title: 'Свои условия',
    subtitle: 'На ваш выбор',
    bullets: [
      'Залог, выписка или проверка данных',
      'Сумма до&nbsp;4,5&nbsp;млн&nbsp;₽',
      'Сниженная комиссия',
    ],
    button: 'Настроить',
    route: '#/conditions',
  },
];

const card = (c: TariffCard) => `
  <section class="tariff" role="listitem" aria-labelledby="tariff-${c.id}">
    ${c.badge ? `<span class="tariff__badge">${c.badge}</span>` : ''}
    <div class="tariff__header">
      <div class="tariff__titles">
        <h2 class="t-heading-m" id="tariff-${c.id}">${c.title}</h2>
        <p class="t-body-m">${c.subtitle}</p>
      </div>
      <button type="button" class="tooltip-button" aria-label="Подробнее о тарифе ${c.subtitle}">
        <img src="${icon('tooltip-question.svg')}" alt="" width="12" height="12" />
      </button>
    </div>
    <ul class="tariff__bullets">
      ${c.bullets
        .map(
          (text) => `
        <li class="tariff__bullet">${mask('check-small.svg', 'tariff__check')}<span class="t-body-m">${text}</span></li>`,
        )
        .join('')}
    </ul>
    <div class="tariff__footer">
      <button type="button" class="button button--primary button--m" ${pushRoute(c.route)} data-tariff="${c.id}"
        aria-describedby="tariff-${c.id}"><span class="button__label">${c.button}</span></button>
    </div>
  </section>`;

export const tariffs: Screen = {
  route: '#/tariffs',
  label: 'Варианты платежа',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content content--tariffs">
      <h1 class="large-title large-title--tariffs t-heading-l">Варианты платежа</h1>
      <div class="tariffs" role="list" tabindex="0" aria-label="Тарифы">${CARDS.map(card).join('')}</div>
    </div>
    ${bottomBlock({})}`,

  beforeAction(control) {
    const tariff = control.dataset.tariff as Tariff | undefined;
    if (tariff) state.tariff = tariff;
  },
};
