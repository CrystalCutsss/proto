import { DsBadge } from './badge.ts';

export { DsBadge };

/** Register the design-system Web Components once. */
export function defineElements(registry: CustomElementRegistry = customElements) {
  if (!registry.get('ds-badge')) registry.define('ds-badge', DsBadge);
}
