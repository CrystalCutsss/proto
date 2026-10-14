// #/conditions — choose a plan: the whole card is a radio option.
import { bottomBlock, iosRadio, primaryButton, topBars } from '../components';
import { icon } from '../icons';
import { state } from '../state';
import type { Screen } from './types';

interface Plan {
  price: string;
  name: string;
  rows: [ok: boolean, text: string][];
}

const PLANS: Plan[] = [
  {
    price: '17\u00a0713\u00a0₽ в месяц',
    name: 'С пакетом «Все включено»',
    rows: [
      [true, 'Ставка ниже на 15% — сэкономите 10\u00a0541\u00a0₽'],
      [true, 'Бесплатное обслуживание счета для бизнеса'],
      [true, 'Без комиссии за досрочное погашение'],
    ],
  },
  {
    price: '21\u00a0029\u00a0₽ в месяц',
    name: 'С пакетом «Универсальный»',
    rows: [
      [true, 'Ставка ниже на 10% — сэкономите 4\u00a0432\u00a0₽'],
      [false, 'Бесплатное обслуживание счета для бизнеса'],
      [true, 'Без комиссии за досрочное погашение'],
    ],
  },
  {
    price: '23\u00a0029\u00a0₽ в месяц',
    name: 'Без пакета',
    rows: [
      [false, 'Снижение ставки'],
      [false, 'Бесплатное обслуживание счета для бизнеса'],
    ],
  },
];

function planCard(plan: Plan, index: number): string {
  const selected = state.plan === index;
  const rows = plan.rows
    .map(
      ([ok, text]) => `
        <li class="plan__row">
          <span class="plan__icon">
            <img src="${icon(ok ? 'check-medium.svg' : 'cross-medium.svg')}" alt="${ok ? 'Есть' : 'Нет'}" width="14" height="14" />
          </span>
          <span class="t-body-l">${text}</span>
        </li>`,
    )
    .join('');
  return `
    <div class="plan" role="radio" aria-checked="${selected}" tabindex="${selected ? 0 : -1}" data-plan="${index}"
      aria-labelledby="plan-title-${index}" aria-describedby="plan-name-${index}">
      <div class="plan__head">
        <div class="plan__titles">
          <span class="t-heading-m" id="plan-title-${index}">${plan.price}</span>
          <span class="t-body-m text-secondary" id="plan-name-${index}">${plan.name}</span>
        </div>
        ${iosRadio()}
      </div>
      <ul class="plan__rows">${rows}</ul>
    </div>`;
}

export const conditions: Screen = {
  route: '#/conditions',
  label: 'Выберите условия',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title t-heading-l">Выберите условия</h1>
      <div class="plans" role="radiogroup" aria-label="Условия кредита">${PLANS.map(planCard).join('')}</div>
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  mount(root) {
    const cards = [...root.querySelectorAll<HTMLElement>('.plan')];
    const select = (index: number, focus = false) => {
      state.plan = index;
      cards.forEach((card, i) => {
        card.setAttribute('aria-checked', String(i === index));
        card.tabIndex = i === index ? 0 : -1;
      });
      if (focus) cards[index]?.focus();
    };
    cards.forEach((card, i) => {
      card.addEventListener('click', () => select(i));
      card.addEventListener('keydown', (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (step) {
          event.preventDefault();
          select((i + step + cards.length) % cards.length, true);
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          select(i);
        }
      });
    });
  },
};
