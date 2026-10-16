// #/options — «Выберите улучшения условий»: option cards (checkbox semantics, radio look) and the sticky
// panel whose chips (amount, payment, ОК fee) are recalculated as options change.
import {
  CHECK_BONUS,
  amountTone,
  totalAmount,
  fee,
  feeTone,
  formatPercent,
  formatRub,
  monthlyPayment,
  paymentTone,
} from '../calc';
import {
  badge,
  badges,
  bottomBlock,
  cardLarge,
  chip,
  mask,
  onActivate,
  primaryButton,
  secondaryButton,
  setCardChecked,
  setChip,
  topBars,
} from '../components';
import { config } from '../config';
import { choice, type FlowState, state } from '../state';
import type { Screen } from './types';

type Option = keyof FlowState['options'];

const PACKAGE_ROWS = [
  'Ставка ниже на&nbsp;15% — сэкономите 10&nbsp;541&nbsp;₽',
  'Бесплатное обслуживание счета для бизнеса',
  'Без комиссии за досрочное погашение',
];

const packageRows = () => `
  <span class="check-rows">
    ${PACKAGE_ROWS.map(
      (text) => `
        <span class="check-row">
          <span class="check-row__icon">${mask('check-medium.svg', 'check-row__glyph')}</span>
          <span class="t-body-l">${text}</span>
        </span>`,
    ).join('')}
  </span>`;

interface OptionCard {
  key: Option;
  title: string;
  titleText: string;
  description: string;
  body: string;
  footer?: string;
}

const CARDS: OptionCard[] = [
  {
    key: 'package',
    title: 'Пакет «Все включено»',
    titleText: 'Пакет «Все включено»',
    description: '',
    body: packageRows(),
    footer: secondaryButton('Изменить пакет'),
  },
  {
    key: 'check',
    title: 'Проверить данные',
    titleText: 'Проверить данные',
    description: 'Обычно занимает до&nbsp;1 рабочего дня',
    body: badges(badge('rub', `+${formatRub(CHECK_BONUS)}`)),
  },
  {
    key: 'turnover',
    title: 'Поддерживать оборот',
    titleText: 'Поддерживать оборот',
    description: 'По счету для бизнеса в&nbsp;Т‑Банке от&nbsp;46&nbsp;789&nbsp;₽/мес',
    body: badges(badge('percent', '−0,5%')),
  },
  {
    key: 'statement',
    title: 'Предоставить выписку',
    titleText: 'Предоставить выписку',
    description: 'По счетам из других банков',
    body: badges(badge('rub', `до +${formatRub(10_000_000)}`)),
  },
];

const visibleCards = () => CARDS.filter((card) => config.product === 'kn' || card.key !== 'package');

const paymentLabel = (value: number) => `${formatRub(value)}\u00a0/\u00a0мес`;

function chips(): string {
  const c = choice();
  return [
    chip('amount', 'rub', formatRub(totalAmount(c)), amountTone(c)),
    chip('payment', 'arrow', paymentLabel(monthlyPayment(c)), paymentTone(c)),
    config.product === 'ok' ? chip('fee', 'percent', formatPercent(fee(c)), feeTone(c)) : '',
  ].join('');
}

function renderChips(root: HTMLElement): void {
  const c = choice();
  setChip(root, 'amount', formatRub(totalAmount(c)), amountTone(c));
  setChip(root, 'payment', paymentLabel(monthlyPayment(c)), paymentTone(c));
  setChip(root, 'fee', formatPercent(fee(c)), feeTone(c));
}

export const options: Screen = {
  route: '#/options',
  label: 'Выберите улучшения условий',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title large-title--options t-heading-l">Выберите улучшения условий</h1>
      <div class="card-list card-list--options">
        ${visibleCards()
          .map((card) =>
            cardLarge({
              id: `option-${card.key}`,
              choice: card.key,
              title: card.title,
              titleText: card.titleText,
              description: card.description,
              role: 'checkbox',
              checked: state.options[card.key],
              body: card.body,
              ...(card.footer ? { footer: card.footer } : {}),
            }),
          )
          .join('')}
      </div>
    </div>
    ${bottomBlock({ chips: chips(), button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/review',

  refresh(root) {
    root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
      setCardChecked(control, state.options[control.dataset.choice as Option]);
    });
    renderChips(root);
  },

  mount(root) {
    root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
      const key = control.dataset.choice as Option;
      onActivate(control, () => {
        state.options[key] = !state.options[key];
        setCardChecked(control, state.options[key]);
        renderChips(root);
      });
    });
  },
};
