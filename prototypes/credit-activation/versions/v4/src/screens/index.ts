// Screens by route and the default path that deep links build the stack from.
import { product } from '../config';
import { conditions } from './conditions';
import { credit } from './credit';
import { documents } from './documents';
import { review } from './review';
import { success } from './success';
import { tariffs } from './tariffs';
import type { Screen } from './types';
import { upload } from './upload';

const SCREENS: readonly Screen[] = [credit, conditions, tariffs, review, documents, upload, success];

export const ROOT = credit;

export function normalizeRoute(hash: string): string {
  return hash === '' || hash === '#' ? '#/' : hash;
}

/** Screen of a hash; unknown hashes (and «Тарифы» in ОК, which has none) fall back to «Кредит». */
export function screenFor(hash: string): Screen {
  const route = normalizeRoute(hash);
  const screen = SCREENS.find((s) => s.route === route) ?? ROOT;
  return screen === tariffs && product === 'ok' ? ROOT : screen;
}

/**
 * Main scenario of the product (owner, 2026-10-25): КН #/ → #/tariffs, ОК #/ → #/conditions; then #/documents
 * right after the options and packages, #/review and #/success (owner, 2026-10-27).
 */
const MAIN: readonly Screen[] = [credit, product === 'kn' ? tariffs : conditions, documents, review, success];

/** Default path to a screen along the main scenario; #/upload sits on top of #/documents, #/success on #/review. */
export function defaultPath(target: Screen): Screen[] {
  if (target === credit) return [credit];
  if (target === conditions || target === tariffs) return [credit, target];
  if (target === upload) return [...MAIN.slice(0, MAIN.indexOf(documents) + 1), upload];
  if (target === success) return [...MAIN.slice(0, MAIN.indexOf(review) + 1), success];
  return MAIN.slice(0, MAIN.indexOf(target) + 1);
}
