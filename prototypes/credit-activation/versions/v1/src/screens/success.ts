// #/success — the application is submitted; no way back, only «К счету».
import { bottomBlock, primaryButton, topBars } from '../components';
import { icon } from '../icons';
import { formatRub, state } from '../state';
import type { Screen } from './types';

export const success: Screen = {
  route: '#/success',
  label: 'Зачисляем деньги',
  canGoBack: false,
  html: () => `
    ${topBars(null, null)}
    <div class="content content--center">
      <div class="status">
        <img class="status__image" src="${icon('coins-check.png')}" alt="" width="128" height="128" />
        <h1 class="status__title t-heading-s">Зачисляем ${formatRub(state.amount)} на&nbsp;счет</h1>
        <p class="status__text t-body-m text-secondary">Обычно это занимает несколько минут.<br />Когда закончим, пришлем СМС</p>
        ${primaryButton('К счету', 'close', 'm')}
      </div>
    </div>
    ${bottomBlock({})}`,
};
