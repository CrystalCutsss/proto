// #/ — approved credit offer: amount slider, terms and options.
import { bottomBlock, iosSwitch, mask, primaryButton, topBars } from '../components';
import { icon } from '../icons';
import { AMOUNT, formatRub, state } from '../state';
import type { Screen } from './types';

const OPTIONS = [
  {
    title: `+1\u00a0000\u00a0000\u00a0₽`,
    badge: '−0,4% комиссия',
    text: 'Залог авто Mercedes-Benz W214',
  },
  { title: `+100\u00a0000\u00a0₽`, text: 'За выписку из другого банка', tooltip: true },
  { title: `До +2\u00a0000\u00a0000\u00a0₽`, text: 'За дополнительный залог авто<br />или недвижимости' },
];

function infoCard(caption: string, title: string, chevron: boolean, wide = false): string {
  return `
    <div class="info-card${wide ? ' info-card--wide' : ''}">
      <div class="info-card__text">
        <span class="t-ui-s text-secondary">${caption}</span>
        <span class="t-heading-s">${title}</span>
      </div>
      ${chevron ? mask('chevron-right-small.svg', 'info-card__chevron') : ''}
    </div>`;
}

function optionRow(option: (typeof OPTIONS)[number], index: number): string {
  const id = `option-title-${index}`;
  const badge = 'badge' in option ? `<span class="badge">${option.badge}</span>` : '';
  const tooltip =
    'tooltip' in option
      ? `<button type="button" class="tooltip-button" aria-label="Подробнее про выписку">
          <img src="${icon('tooltip-question.svg')}" alt="" width="12" height="12" />
        </button>`
      : '';
  return `
    <div class="option">
      <div class="option__text">
        <div class="option__title"><span class="t-heading-s" id="${id}">${option.title}</span>${badge}</div>
        <div class="t-ui-s text-secondary">${option.text}</div>
      </div>
      <div class="option__accessory">${tooltip}${iosSwitch(id, state.options[index] ?? false, index)}</div>
    </div>`;
}

const ticks = Array.from(
  { length: 5 },
  () => `<img src="${icon('slider-tick.svg')}" alt="" width="4" height="4" />`,
).join('');

export const offer: Screen = {
  route: '#/',
  label: 'Одобрили кредит',
  canGoBack: false,
  html: () => `
    ${topBars('close', null)}
    <div class="content">
      <h1 class="offer__title t-heading-s">Одобрили кредит<br />ИП Константинопольский К.&nbsp;К.</h1>
      <p class="offer__amount t-number-2xl" data-amount>${formatRub(state.amount)}</p>
      <div class="slider">
        <div class="slider__track" aria-hidden="true"></div>
        <div class="slider__ticks" aria-hidden="true">${ticks}</div>
        <input class="slider__input" type="range" min="${AMOUNT.min}" max="${AMOUNT.max}"
          step="${AMOUNT.step}" value="${state.amount}" aria-label="Сумма кредита" />
      </div>
      <div class="slider__labels t-body-m text-secondary" aria-hidden="true">
        <span>${formatRub(AMOUNT.min)}</span><span>${formatRub(AMOUNT.max)}</span>
      </div>
      <div class="info-cards">
        ${infoCard('Срок', '5 лет', true)}
        ${infoCard('Комиссия', '2,9%', false)}
        ${infoCard('Платеж в месяц', '193\u00a0500\u00a0₽', true, true)}
      </div>
      <section class="options-card" aria-labelledby="options-title">
        <h2 class="options-card__title t-heading-m" id="options-title">Опции</h2>
        ${OPTIONS.map(optionRow).join('')}
      </section>
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  mount(root) {
    const slider = root.querySelector<HTMLInputElement>('.slider__input')!;
    const amount = root.querySelector<HTMLElement>('[data-amount]')!;
    const sync = () => {
      state.amount = Number(slider.value);
      amount.textContent = formatRub(state.amount);
      const progress = (state.amount - AMOUNT.min) / (AMOUNT.max - AMOUNT.min);
      slider.parentElement!.style.setProperty('--progress', String(progress));
      slider.setAttribute('aria-valuetext', formatRub(state.amount));
    };
    slider.addEventListener('input', sync);
    sync();

    root.querySelectorAll<HTMLInputElement>('.switch').forEach((input) => {
      input.addEventListener('change', () => {
        state.options[Number(input.dataset.option)] = input.checked;
      });
    });
  },
};
