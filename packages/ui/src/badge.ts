// <ds-badge status="draft|review|frozen|active|paused|archived">label</ds-badge>
const COLORS: Record<string, string> = {
  draft: 'var(--ds-color-status-draft)',
  review: 'var(--ds-color-status-review)',
  frozen: 'var(--ds-color-status-frozen)',
  active: 'var(--ds-color-action-primary)',
  paused: 'var(--ds-color-status-review)',
  archived: 'var(--ds-color-status-draft)',
};

const STYLE = `
  :host {
    display: inline-block;
    padding: 0 var(--ds-space-2);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-font-size-sm);
    line-height: var(--ds-font-line-height-normal);
    color: var(--ds-color-fg-inverse);
    background: var(--ds-badge-color, var(--ds-color-status-draft));
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
