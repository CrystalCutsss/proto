export interface Screen {
  /** Hash route, e.g. `#/review`. */
  route: string;
  /** Accessible name of the page. */
  label: string;
  /** Whether back (chevron, edge swipe) is allowed from this screen. */
  canGoBack: boolean;
  /** Markup of the scroll container: top bars, content, bottom block. */
  html(): string;
  /** Wire interactive parts after the markup is in place. */
  mount?(root: HTMLElement): void;
}
