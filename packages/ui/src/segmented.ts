// <ds-segmented label="Версия" value="v2"><option value="v1">v1</option>…</ds-segmented>
// TUI tui-segmented as a single-choice radio group. Options come from child <option> elements or the
// `items` property; choosing one updates `value` and fires a bubbling, composed `change` event. The `disabled`
// attribute keeps the current choice visible but greyed out and ignores clicks and keys.
import style from './segmented.css?inline';

export interface SegmentedItem {
  value: string;
  label: string;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

export class DsSegmented extends HTMLElement {
  static observedAttributes = ['value', 'label', 'disabled'];

  #root: ShadowRoot;
  #items: SegmentedItem[] = [];

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.addEventListener('click', this.#onClick);
    this.#root.addEventListener('keydown', this.#onKey as EventListener);
  }

  get items(): SegmentedItem[] {
    return this.#items;
  }

  set items(items: SegmentedItem[]) {
    this.#items = [...items];
    this.#render();
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(v: string) {
    this.setAttribute('value', v);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  connectedCallback() {
    if (!this.#items.length) {
      this.#items = [...this.querySelectorAll('option')].map((o) => ({
        value: o.value,
        label: o.textContent?.trim() ?? o.value,
      }));
    }
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  #selected() {
    const v = this.value;
    return this.#items.some((i) => i.value === v) ? v : (this.#items[0]?.value ?? '');
  }

  #render() {
    const selected = this.#selected();
    const label = this.getAttribute('label') ?? '';
    const disabled = this.disabled;
    this.#root.innerHTML = `<style>${style}</style>
      <div class="track" role="radiogroup"${label ? ` aria-label="${esc(label)}"` : ''}${
        disabled ? ' aria-disabled="true"' : ''
      }>${this.#items
        .map(
          (i) =>
            `<button type="button" class="item" role="radio" data-value="${esc(i.value)}"` +
            ` aria-checked="${i.value === selected}" tabindex="${i.value === selected ? 0 : -1}"` +
            `${disabled ? ' disabled' : ''}>${esc(i.label)}</button>`,
        )
        .join('')}</div>`;
    this.#root.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  #choose(value: string, focus = false) {
    if (this.disabled) return;
    if (value !== this.value) {
      this.value = value;
      this.dispatchEvent(new CustomEvent('change', { detail: { value }, bubbles: true, composed: true }));
    }
    if (focus) this.#root.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)?.focus();
  }

  #onClick = (e: Event) => {
    const value = (e.target as HTMLElement).closest<HTMLElement>('[data-value]')?.dataset.value;
    if (value !== undefined) this.#choose(value);
  };

  #onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (this.disabled || (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End')) return;
    e.preventDefault();
    const n = this.#items.length;
    if (!n) return;
    const at = this.#items.findIndex((i) => i.value === this.#selected());
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (at + (keys[e.key] ?? 0) + n) % n;
    this.#choose(this.#items[next]!.value, true);
  };
}
