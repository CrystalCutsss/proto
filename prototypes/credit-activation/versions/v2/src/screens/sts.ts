// #/sts — 1 док: «Нужны фото СТС», «Получить деньги» goes to success.
import { LEGAL, bottomBlock, primaryButton, topBars } from '../components';
import { mountFileField, stsContent } from './sts-content';
import type { Screen } from './types';

export const sts: Screen = {
  route: '#/sts',
  label: 'Нужны фото СТС',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    ${stsContent()}
    ${bottomBlock({ button: primaryButton('Получить деньги', 'next'), legalBelow: LEGAL })}`,
  next: () => '#/success',
  mount: mountFileField,
};
