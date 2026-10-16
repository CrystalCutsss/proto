// Screens by route and the default path that deep links build the stack from.
import type { Docs } from '../config';
import { documents } from './documents';
import { offer } from './offer';
import { options } from './options';
import { review } from './review';
import { sts } from './sts';
import { success } from './success';
import type { Screen } from './types';
import { upload } from './upload';

const SCREENS: readonly Screen[] = [offer, options, review, sts, documents, upload, success];

export const ROOT = offer;

export function normalizeRoute(hash: string): string {
  return hash === '' || hash === '#' ? '#/' : hash;
}

/** Screen of a hash; unknown hashes fall back to the offer. */
export function screenFor(hash: string): Screen {
  const route = normalizeRoute(hash);
  return SCREENS.find((screen) => screen.route === route) ?? ROOT;
}

/**
 * Default path to a screen: #/ → #/options → #/review → (#/sts | #/documents → #/upload) → #/success.
 * The documents branch follows the screen itself, or `docs` for #/success (two docs skip #/upload).
 */
export function defaultPath(target: Screen, docs: Docs): Screen[] {
  const head = [offer, options, review];
  switch (target) {
    case offer:
      return [offer];
    case options:
      return [offer, options];
    case review:
      return head;
    case sts:
      return [...head, sts];
    case documents:
      return [...head, documents];
    case upload:
      return [...head, documents, upload];
    default:
      return [...head, docs === 'two' ? documents : sts, success];
  }
}
