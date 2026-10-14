// #/documents — upload photos of the vehicle registration certificate (СТС).
import { bottomBlock, mask, primaryButton, topBars } from '../components';
import { icon } from '../icons';
import { state } from '../state';
import type { Screen } from './types';

const bullet = (text: string) => `
  <li class="bullets__item">
    <img class="bullets__dot" src="${icon('bullet-accent.svg')}" alt="" width="6" height="6" />
    <span class="t-body-l">${text}</span>
  </li>`;

export const documents: Screen = {
  route: '#/documents',
  label: 'Нужны фото СТС',
  canGoBack: true,
  html: () => `
    ${topBars('back', 'close')}
    <div class="content">
      <h1 class="large-title large-title--documents t-heading-l">Нужны фото СТС,<br />чтобы получить деньги</h1>
      <ul class="bullets">
        ${bullet('Загрузите фото обеих сторон СТС')}
        ${bullet('Убедитесь, что документ виден полностью, текст хорошо читается, нет бликов и посторонних предметов')}
      </ul>
      <div class="disclosure">
        <img class="disclosure__image" src="${icon('sts-sample.jpg')}" alt="" width="56" height="56" />
        <span class="disclosure__title t-body-l">Образцы обеих сторон СТС</span>
        ${mask('chevron-right-service.svg', 'disclosure__chevron')}
      </div>
      <div class="file-field">
        <label class="file-field__button t-body-m">
          Выберите файлы
          <input class="file-field__input" type="file" multiple accept=".jpg,.jpeg,.png,.heif,.heic,image/*" />
        </label>
        <p class="file-field__hint t-ui-s text-secondary">Файлы jpg, png, heif, heic не больше 10&nbsp;МБ</p>
        <ul class="file-field__list t-ui-s" aria-live="polite"></ul>
      </div>
    </div>
    ${bottomBlock({
      button: primaryButton('Получить деньги', 'next'),
      legalBelow:
        'Нажимая «Получить деньги», вы соглашаетесь <u>с условиями</u>. Они доступны до 16 сентября',
    })}`,

  mount(root) {
    const input = root.querySelector<HTMLInputElement>('.file-field__input')!;
    const list = root.querySelector<HTMLUListElement>('.file-field__list')!;
    const render = () => {
      list.replaceChildren(
        ...state.files.map((name) => {
          const item = document.createElement('li');
          item.textContent = name;
          return item;
        }),
      );
    };
    input.addEventListener('change', () => {
      state.files = [...(input.files ?? [])].map((file) => file.name);
      render();
    });
    render();
  },
};
