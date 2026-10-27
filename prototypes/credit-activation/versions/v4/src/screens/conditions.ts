// #/conditions — «Условия»: the conditions block (amount + chips «5 лет», fee, payment) stays under the bars
// while the «Барабан условий» scrolls under it and under «Дальше» like an iOS picker wheel (wheel.ts). A tap
// anywhere on a card or on its «+» toggles it; the header recalculates at once («Условия выбраны»).
// Opened from #/ with the shared-header transition (nav.ts). «Дальше» pushes #/documents (owner, 2026-10-27); in
// КН it first pushes #/tariffs unless «Тарифы» are already below (reached through «Ваши условия») (2026-10-26).
// КН has no pledge card here: its pledge lives on #/ (owner, 2026-10-25). The payment chip turns positive when the
// payment goes below the offer's, like the fee chip. ОК's pledge card is drawn like the one on КН's #/: «Залог авто»
// with «Изменить» in the title row.
import { renderAmount, stopAmount } from '../amount';
import {
  CHECK_BONUS,
  type FeeCut,
  fee,
  feeTone,
  formatPaymentChip,
  formatPercent,
  formatRub,
  monthlyPayment,
  paymentTone,
  PLEDGE_BONUS,
  STATEMENT_LIMIT,
  totalAmount,
} from '../calc';
import {
  badge,
  badges,
  bottomBlock,
  chip,
  onActivate,
  optionCard,
  primaryButton,
  setChip,
  setOptionChecked,
  topBars,
} from '../components';
import { product } from '../config';
import { choice, state } from '../state';
import { mountWheel } from '../wheel';
import type { Screen } from './types';

const stopWheel = new WeakMap<HTMLElement, () => void>();

type Key = 'pledge' | 'check' | 'statement' | FeeCut;

const ALL_CARDS: { key: Key; title: string; description: string; badges: string; link?: string }[] = [
  {
    key: 'pledge',
    title: 'Залог авто',
    description: 'Потребуется СТС Mercedes-Benz W214',
    badges: badges(badge(`+${formatRub(PLEDGE_BONUS)}`), badge('−0,5%')),
    link: 'Изменить',
  },
  {
    key: 'check',
    title: 'Проверить данные',
    description: 'Занимает до&nbsp;1 рабочего дня',
    badges: badges(badge(`+${formatRub(CHECK_BONUS)}`)),
  },
  {
    key: 'statement',
    title: 'Предоставить выписку',
    description: 'По счетам из других банков',
    badges: badges(badge(`До +${formatRub(STATEMENT_LIMIT)}`)),
  },
  {
    key: 'one',
    title: 'Снизить комиссию',
    description: 'За каждые 100&nbsp;000&nbsp;₽, выплаченных сотрудникам в&nbsp;месяц',
    badges: badges(badge('−1%', 'percent')),
  },
  {
    key: 'half',
    title: 'Снизить комиссию',
    description:
      'Поддерживайте оборот по&nbsp;счету для бизнеса в&nbsp;Т‑Банке от&nbsp;46&nbsp;789&nbsp;₽/мес',
    badges: badges(badge('До −0,5%', 'percent')),
  },
];

const CARDS = product === 'kn' ? ALL_CARDS.filter((card) => card.key !== 'pledge') : ALL_CARDS;

const isFeeCut = (key: Key): key is FeeCut => key === 'one' || key === 'half';

const isOn = (key: Key): boolean => (isFeeCut(key) ? state.feeCuts.includes(key) : state[key]);

function toggle(key: Key): void {
  if (isFeeCut(key))
    state.feeCuts = state.feeCuts.includes(key)
      ? state.feeCuts.filter((cut) => cut !== key)
      : [...state.feeCuts, key];
  else state[key] = !state[key];
}

const paymentChip = () => formatPaymentChip(monthlyPayment(choice()));

function renderHeader(root: HTMLElement, animate: boolean): void {
  const c = choice();
  renderAmount(root, animate);
  setChip(root, 'fee', formatPercent(fee(c)), feeTone(c));
  setChip(root, 'payment', paymentChip(), paymentTone(c));
}

const header = () => {
  const c = choice();
  return `
    <div class="conditions-head">
      <p class="conditions-head__amount t-number-2xl" data-shared="amount" data-amount>${formatRub(totalAmount(c))}</p>
      <div class="chips" data-fade aria-live="polite">
        ${chip('term', 'calendar', '5 лет')}
        ${chip('fee', 'percent', formatPercent(fee(c)), feeTone(c))}
        ${chip('payment', 'arrow', paymentChip(), paymentTone(c))}
      </div>
      <div class="wheel-fade wheel-fade--top" data-fade aria-hidden="true"></div>
    </div>`;
};

export const conditions: Screen = {
  route: '#/conditions',
  label: 'Условия',
  canGoBack: true,
  transition: 'shared',
  html: () => `
    ${topBars('back', 'close', header())}
    <div class="content content--conditions">
      <div class="wheel" data-fade>
        ${CARDS.map((card) =>
          optionCard({
            id: `conditions-${card.key}`,
            choice: card.key,
            title: card.title,
            description: card.description,
            badges: card.badges,
            checked: isOn(card.key),
            link: card.link,
          }),
        ).join('')}
      </div>
    </div>
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  next: (below) => (product === 'kn' && !below.includes('#/tariffs') ? '#/tariffs' : '#/documents'),

  refresh(root) {
    root.querySelectorAll<HTMLElement>('.option__control').forEach((control) => {
      setOptionChecked(control, isOn(control.dataset.choice as Key));
    });
    renderHeader(root, false);
  },

  mount(root) {
    root.querySelectorAll<HTMLElement>('.option__control').forEach((control) => {
      const key = control.dataset.choice as Key;
      onActivate(control, () => {
        toggle(key);
        setOptionChecked(control, isOn(key));
        renderHeader(root, true);
      });
    });
    stopWheel.set(root, mountWheel(root));
  },

  unmount(root) {
    stopWheel.get(root)?.();
    stopAmount(root);
  },
};
