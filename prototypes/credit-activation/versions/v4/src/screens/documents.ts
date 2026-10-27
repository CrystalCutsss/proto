// #/documents — «Загрузите документы»: always the two documents (as v3). The «Загрузить» badges push
// #/upload; after «Загрузить» there both show «Загружено». Shown right after the options and packages (#/conditions,
// #/tariffs), before #/review (owner, 2026-10-27): «Дальше» → #/review, without waiting for the upload (v3).
import { bottomBlock, primaryButton, pushRoute, topBars } from '../components';
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
    : `<button type="button" class="badge badge--doc badge--action" ${pushRoute('#/upload')} aria-describedby="${id}-title"><span class="badge__label">Загрузить</span></button>`;

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
    ${bottomBlock({ button: primaryButton('Дальше', 'next') })}`,

  next: () => '#/review',

  refresh(root) {
    root.querySelectorAll<HTMLElement>('[data-doc-status]').forEach((el) => {
      el.innerHTML = status(el.dataset.docStatus!);
    });
  },
};
