import { DsBadge } from './badge.ts';
import { DsSegmented, type SegmentedItem } from './segmented.ts';

export { DsBadge, DsSegmented, type SegmentedItem };

/** Register the design-system Web Components once. */
export function defineElements(registry: CustomElementRegistry = customElements) {
  if (!registry.get('ds-badge')) registry.define('ds-badge', DsBadge);
  if (!registry.get('ds-segmented')) registry.define('ds-segmented', DsSegmented);
}
