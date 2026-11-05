// Phone screens get no bottom menu (ADR-0021). A version with menu axes, or a later version that shows them greyed
// out, gets a small floating button in the bottom-right corner there instead; it opens a modal sheet with the same
// captioned axis controls and the version control (ADR-0023, ADR-0024).
import { createMenu, menuAxes, type MenuHandlers, type MenuState } from './menu.ts';

/** Sliders glyph drawn with currentColor (no asset, no CDN). */
const ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.5"/>
  <circle cx="10" cy="17" r="2.5"/></svg>`;

let count = 0;

export function createVariants(handlers: MenuHandlers) {
  const id = `proto-variants-title-${++count}`;
  // Phones always show the prototype full-screen: no «Экран» switch in the sheet (ADR-0025).
  const menu = createMenu({ ...handlers, screen: undefined });
  menu.element.classList.add('proto-menu--sheet');
  menu.element.setAttribute('aria-label', 'Варианты прототипа');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'proto-variants-fab';
  fab.setAttribute('aria-label', 'Варианты прототипа');
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = ICON;

  const dialog = document.createElement('dialog');
  dialog.className = 'proto-variants';
  dialog.setAttribute('aria-labelledby', id);
  const header = document.createElement('div');
  header.className = 'proto-variants-header';
  const title = document.createElement('h2');
  title.id = id;
  title.className = 'proto-variants-title';
  title.textContent = 'Варианты';
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'proto-variants-done';
  done.textContent = 'Готово';
  header.append(title, done);
  dialog.append(header, menu.element);

  fab.addEventListener('click', () => dialog.showModal());
  done.addEventListener('click', () => dialog.close());
  // A tap on the backdrop (the dialog box itself, outside its content) closes the sheet.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return {
    elements: [fab, dialog] as const,
    update(state: MenuState) {
      // Own axes, or the greyed-out axes of an earlier version (then the sheet is how to switch back to it).
      const shown = menuAxes(state.proto, state.version).axes.length > 0;
      fab.hidden = !shown;
      if (shown) menu.update(state);
      else if (dialog.open) dialog.close();
    },
  };
}
