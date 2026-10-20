// Screens by route and the default path that deep links build the stack from.
import { conditions } from './conditions';
import { documents } from './documents';
import { heavy } from './heavy';
import { light } from './light';
import { review } from './review';
import { success } from './success';
import type { Screen } from './types';
import { upload } from './upload';

const SCREENS: readonly Screen[] = [conditions, heavy, review, documents, upload, light, success];

export const ROOT = conditions;

export function normalizeRoute(hash: string): string {
  return hash === '' || hash === '#' ? '#/' : hash;
}

/** Screen of a hash; unknown hashes fall back to the conditions. */
export function screenFor(hash: string): Screen {
  const route = normalizeRoute(hash);
  return SCREENS.find((screen) => screen.route === route) ?? ROOT;
}

/** The main scenario: #/ → #/heavy → #/documents → #/light → #/review → #/success. */
const MAIN: readonly Screen[] = [conditions, heavy, documents, light, review, success];

/**
 * Default path to a screen along the main scenario; #/upload sits on top of #/documents. #/light takes the long
 * path through the documents (owner, Q4), so back from a deep link to it returns to #/documents.
 */
export function defaultPath(target: Screen): Screen[] {
  if (target === upload) return [...MAIN.slice(0, MAIN.indexOf(documents) + 1), upload];
  return MAIN.slice(0, MAIN.indexOf(target) + 1);
}
