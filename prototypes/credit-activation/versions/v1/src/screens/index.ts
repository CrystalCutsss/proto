import { conditions } from './conditions';
import { documents } from './documents';
import { offer } from './offer';
import { review } from './review';
import { success } from './success';
import type { Screen } from './types';

/** Screens in flow order: the navigation stack is always a prefix of this list. */
export const FLOW: readonly Screen[] = [offer, conditions, review, documents, success];

export function routeIndex(hash: string): number {
  const route = hash === '' || hash === '#' ? '#/' : hash;
  return Math.max(
    0,
    FLOW.findIndex((screen) => screen.route === route),
  );
}
