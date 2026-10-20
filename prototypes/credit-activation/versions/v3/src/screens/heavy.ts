// #/heavy — «Как хотите увеличить лимит»: three independent option cards (checkbox semantics, radio look) and
// the sticky panel whose chips (amount, payment, fee) are recalculated on every toggle. «Дальше» is always
// enabled (owner, Q9).
import { CHECK_BONUS, formatRub, PLEDGE_BONUS, STATEMENT_LIMIT } from '../calc';
import {
  badge,
  badges,
  bottomBlock,
  cardLarge,
  onActivate,
  primaryButton,
  setCardChecked,
  topBars,
} from '../components';
import { state } from '../state';
import { chips, renderCards, renderChips } from './panel';
import type { Screen } from './types';

type Option = 'pledge' | 'check' | 'statement';

const CARDS: { key: Option; title: string; description: string; badges: string }[] = [
  {
    key: 'pledge',
    title: 'Оставить в залог авто',
    description: 'Mercedes-Benz W214',
    badges: badges(badge('rub', `+${formatRub(PLEDGE_BONUS)}`), badge('percent', '−0,5%')),
  },
  {
    key: 'check',
    title: 'Проверить данные',
    description: 'Обычно занимает до&nbsp;1 рабочего дня',
    badges: badges(badge('rub', `+${formatRub(CHECK_BONUS)}`)),
  },
  {
    key: 'statement',
    title: 'Предоставить выписку',
    description: 'По счетам из других банков',
    badges: badges(badge('rub', `до +${formatRub(STATEMENT_LIMIT)}`)),
  },
];

export const heavy: Screen = {
  route: '#/heavy',
  label: 'Как хотите увеличить лимит',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title large-title--options t-heading-l">Как хотите увеличить лимит</h1>
      <div class="card-list card-list--heavy">
        ${CARDS.map((card) =>
          cardLarge({
            id: `heavy-${card.key}`,
            choice: card.key,
            title: card.title,
            titleText: card.title,
            description: card.description,
            checked: state[card.key],
            body: card.badges,
          }),
        ).join('')}
      </div>
    </div>
    ${bottomBlock({ chips: chips('heavy'), button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/review',

  refresh(root) {
    renderCards(root, (key) => state[key as Option]);
    renderChips(root, 'heavy');
  },

  mount(root) {
    root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
      const key = control.dataset.choice as Option;
      onActivate(control, () => {
        state[key] = !state[key];
        setCardChecked(control, state[key]);
        renderChips(root, 'heavy');
      });
    });
  },
};
