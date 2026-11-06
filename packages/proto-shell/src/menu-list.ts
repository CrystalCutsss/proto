// <proto-menu-list>: one group of radio items for the shadcn-style menu (ADR-0027), a drop-in for <ds-segmented>
// in createMenu: the same `items`, `value` and `disabled` properties and a bubbling, composed `change` event. Each
// item is a role="menuitemradio" button with a check mark before the selected one, like a shadcn DropdownMenu
// RadioItem. Arrow keys move between all items of the menu (see menuKeys).
import type { SegmentedItem } from '@proto/ui';

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

export class ProtoMenuList extends HTMLElement {
  #items: SegmentedItem[] = [];
  #value = '';
  #disabled = false;

  connectedCallback() {
    this.setAttribute('role', 'group');
    const label = this.getAttribute('label');
    if (label) this.setAttribute('aria-label', label);
  }

  get items(): SegmentedItem[] {
    return this.#items;
  }

  set items(items: SegmentedItem[]) {
    this.#items = [...items];
    this.#render();
  }

  get value(): string {
    return this.#value;
  }

  set value(v: string) {
    this.#value = v;
    for (const b of this.#buttons()) b.setAttribute('aria-checked', String(b.dataset.value === v));
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  set disabled(v: boolean) {
    this.#disabled = v;
    for (const b of this.#buttons()) b.setAttribute('aria-disabled', String(v));
  }

  #buttons() {
    return [...this.querySelectorAll<HTMLButtonElement>('.proto-menu-item')];
  }

  #render() {
    this.replaceChildren(
      ...this.#items.map((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'proto-menu-item';
        button.setAttribute('role', 'menuitemradio');
        button.tabIndex = -1;
        button.dataset.value = item.value;
        button.setAttribute('aria-checked', String(item.value === this.#value));
        button.setAttribute('aria-disabled', String(this.#disabled));
        const check = document.createElement('span');
        check.className = 'proto-menu-check';
        check.innerHTML = CHECK_ICON;
        const label = document.createElement('span');
        label.textContent = item.label;
        button.append(check, label);
        button.addEventListener('click', () => this.#choose(item.value));
        return button;
      }),
    );
  }

  #choose(value: string) {
    if (this.#disabled) return;
    // A click on the chosen item still closes the menu (like a DropdownMenu), but changes nothing.
    const changed = value !== this.#value;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent(changed ? 'change' : 'proto-menu-pick', { bubbles: true, composed: true }),
    );
  }
}

export function defineMenuList() {
  if (!customElements.get('proto-menu-list')) customElements.define('proto-menu-list', ProtoMenuList);
}

/** Up/Down/Home/End move focus between the enabled items of the whole menu, as in a DropdownMenu. */
export function menuKeys(menu: HTMLElement, event: KeyboardEvent) {
  const items = [...menu.querySelectorAll<HTMLElement>('.proto-menu-item:not([aria-disabled="true"])')];
  if (!items.length) return;
  const root = menu.getRootNode() as Document | ShadowRoot;
  const at = items.indexOf(root.activeElement as HTMLElement);
  const next =
    event.key === 'ArrowDown'
      ? items[(at + 1) % items.length]
      : event.key === 'ArrowUp'
        ? items[(at - 1 + items.length) % items.length]
        : event.key === 'Home'
          ? items[0]
          : event.key === 'End'
            ? items.at(-1)
            : null;
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/** First item to focus when the menu opens: the checked one of the first group, else the first enabled one. */
export function firstMenuItem(menu: HTMLElement): HTMLElement | null {
  return (
    menu.querySelector<HTMLElement>('.proto-menu-item[aria-checked="true"]:not([aria-disabled="true"])') ??
    menu.querySelector<HTMLElement>('.proto-menu-item:not([aria-disabled="true"])')
  );
}
