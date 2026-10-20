// #/light — «Выберите улучшения условий»: the package (on by default) and two «Снизим комиссию» cards, which
// are mutually exclusive (owner, Q3: selecting one clears the other; tapping the selected one clears it). The
// sticky panel's chips are recalculated on every toggle; «Дальше» (no legal line) pushes #/review on both
// paths (owner, 2026-10-20).
import type { FeeCut } from '../calc';
import {
  badge,
  badges,
  bottomBlock,
  cardLarge,
  mask,
  onActivate,
  primaryButton,
  secondaryButton,
  topBars,
} from '../components';
import { state } from '../state';
import { chips, renderCards, renderChips } from './panel';
import type { Screen } from './types';

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

const FEE_TEXT: Record<FeeCut, string> = {
  one: '−1% за&nbsp;каждые 100&nbsp;000&nbsp;₽, выплаченных сотрудникам в&nbsp;месяц',
  half: 'При обороте по счету для бизнеса в&nbsp;Т‑Банке от&nbsp;46&nbsp;789&nbsp;₽/мес',
};

type Key = 'package' | FeeCut;

const isOn = (key: string): boolean => (key === 'package' ? state.package : state.feeCut === key);

function toggle(key: Key): void {
  if (key === 'package') state.package = !state.package;
  else state.feeCut = state.feeCut === key ? null : key;
}

const feeCard = (key: FeeCut, label: string) =>
  cardLarge({
    id: `light-fee-${key}`,
    choice: key,
    title: 'Снизим комиссию',
    titleText: `Снизим комиссию ${label}`,
    description: FEE_TEXT[key],
    checked: isOn(key),
    body: badges(badge('percent', label)),
  });

export const light: Screen = {
  route: '#/light',
  label: 'Выберите улучшения условий',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title large-title--options t-heading-l">Выберите улучшения условий</h1>
      <div class="card-list card-list--light">
        ${cardLarge({
          id: 'light-package',
          choice: 'package',
          title: 'Пакет «Все включено»',
          titleText: 'Пакет «Все включено»',
          description: '',
          checked: isOn('package'),
          body: packageRows(),
          footer: secondaryButton('Изменить пакет'),
        })}
        ${feeCard('one', '−1%')}
        ${feeCard('half', 'До −0,5%')}
      </div>
    </div>
    ${bottomBlock({ chips: chips('light'), button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/review',

  refresh(root) {
    renderCards(root, isOn);
    renderChips(root, 'light');
  },

  mount(root) {
    root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
      onActivate(control, () => {
        toggle(control.dataset.choice as Key);
        renderCards(root, isOn);
        renderChips(root, 'light');
      });
    });
  },
};
