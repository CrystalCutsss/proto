// #/documents — 2 дока: «Загрузите документы». Not ready: «Загрузить» badges and the yellow button push
// #/upload. Ready (after «Загрузить» there): «Загружено» badges, the button goes to success.
import { LEGAL, bottomBlock, primaryButton, topBars } from '../components';
import { state } from '../state';
import type { Screen } from './types';

const DOCS = [
  { id: 'doc-sts', title: 'Фото СТС авто', text: 'Mercedes-Benz W214, О&nbsp;7&nbsp;***&nbsp;Р' },
  {
    id: 'doc-letter',
    title: 'Гарантийное письмо',
    text: 'Загрузите бухгалтерские карточки, сформированные в&nbsp;1С',
  },
];

const status = (id: string) =>
  state.docsUploaded
    ? `<span class="badge badge--doc badge--positive"><span class="badge__label">Загружено</span></span>`
    : `<button type="button" class="badge badge--doc badge--action" data-action="next" aria-describedby="${id}-title"><span class="badge__label">Загрузить</span></button>`;

const docCard = (doc: (typeof DOCS)[number]) => `
  <section class="doc-card" aria-labelledby="${doc.id}-title">
    <h2 class="t-heading-m" id="${doc.id}-title">${doc.title}</h2>
    <p class="doc-card__text t-body-m text-secondary">${doc.text}</p>
    <div class="doc-card__status" data-doc-status="${doc.id}">${status(doc.id)}</div>
  </section>`;

export const documents: Screen = {
  route: '#/documents',
  label: 'Загрузите документы',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title large-title--docs t-heading-l">Загрузите документы</h1>
      <div class="cards">${DOCS.map(docCard).join('')}</div>
    </div>
    ${bottomBlock({ button: primaryButton('Получить деньги', 'next'), legalBelow: LEGAL })}`,

  next: () => (state.docsUploaded ? '#/success' : '#/upload'),

  refresh(root) {
    root.querySelectorAll<HTMLElement>('[data-doc-status]').forEach((el) => {
      el.innerHTML = status(el.dataset.docStatus!);
    });
  },
};
