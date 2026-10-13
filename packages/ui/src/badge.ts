// <ds-badge status="draft|review|frozen|active|paused|archived">label</ds-badge>
const COLORS: Record<string, string> = {
  draft: 'var(--ds-status-neutral)',
  review: 'var(--ds-status-warning)',
  frozen: 'var(--ds-status-positive)',
  active: 'var(--ds-status-info)',
  paused: 'var(--ds-status-warning)',
  archived: 'var(--ds-status-neutral)',
};

const STYLE = `
  :host {
    display: inline-block;
    padding: 0 var(--ds-space-2);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-typography-body-s-font-size);
    line-height: var(--ds-typography-body-m-line-height);
    color: var(--ds-text-primary-on-dark);
    background: var(--ds-badge-color, var(--ds-status-neutral));
    white-space: nowrap;
  }
`;

export class DsBadge extends HTMLElement {
  static observedAttributes = ['status'];

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style><slot></slot>`;
  }

  attributeChangedCallback() {
    const color = COLORS[this.getAttribute('status') ?? ''] ?? COLORS.draft!;
    this.style.setProperty('--ds-badge-color', color);
  }
}
