// Hash routing by default (ADR-0005): screens are #/, #/details … List them in version.json "routes"
// so the version switcher can keep the current screen.
import '@proto/ui/ui.css';
import './style.css';
import { defineElements } from '@proto/ui';

defineElements();

const screens: Record<string, () => string> = {
  '#/': () => `
    <section class="screen ds-stack">
      <h1 class="ds-heading">Демо: базовый</h1>
      <p class="ds-muted">Стартовый экран. Новое в этой версии — экран настроек.</p>
      <div class="ds-cluster"><a class="ds-button" href="#/details">Детали</a><a class="ds-button" data-variant="ghost" href="#/settings">Настройки</a></div>
    </section>`,
  '#/details': () => `
    <section class="screen ds-stack">
      <h1 class="ds-heading">Подробности</h1>
      <div class="ds-card">Карточка на токенах дизайн-системы. <ds-badge status="draft">черновик</ds-badge></div>
      <div class="ds-cluster"><a class="ds-button" data-variant="ghost" href="#/">Назад</a></div>
    </section>`,
  '#/settings': () => `
    <section class="screen ds-stack">
      <h1 class="ds-heading">Настройки</h1>
      <label class="ds-stack">Имя <input class="ds-input" value="Демо" /></label>
      <div class="ds-cluster"><a class="ds-button" data-variant="ghost" href="#/">Назад</a></div>
    </section>`,
};

const app = document.querySelector<HTMLElement>('#app')!;
const render = () => {
  app.innerHTML = (screens[location.hash] ?? screens['#/']!)();
};
window.addEventListener('hashchange', render);
render();
