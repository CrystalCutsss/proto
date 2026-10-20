// #/upload — «Загрузить» (v2 label, owner Q12) marks the documents uploaded and pops back to #/documents,
// which shows its ready state while it slides in (its refresh() runs before the pop).
import { LEGAL, bottomBlock, primaryButton, topBars } from '../components';
import { state } from '../state';
import { mountFileField, stsContent } from './sts-content';
import type { Screen } from './types';

export const upload: Screen = {
  route: '#/upload',
  label: 'Загрузка документов',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    ${stsContent()}
    ${bottomBlock({ button: primaryButton('Загрузить', 'back', 'l', 'data-upload'), legalBelow: LEGAL })}`,
  mount: mountFileField,
  beforeAction(control) {
    if (control.hasAttribute('data-upload')) state.docsUploaded = true;
  },
};
