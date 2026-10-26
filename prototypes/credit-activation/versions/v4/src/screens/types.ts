export interface Screen {
  /** Hash route, e.g. `#/review`. */
  route: string;
  /** Accessible name of the page. */
  label: string;
  /** Whether back (chevron, edge swipe, browser back as a pop) is allowed from this screen. */
  canGoBack: boolean;
  /**
   * `shared`: pushed onto (and popped off) a screen with the same `[data-shared]` element, this screen does not
   * slide: the shared element moves between the two positions and the `[data-fade]` parts of both screens
   * cross-fade (nav.ts). From any other screen it slides as usual.
   */
  transition?: 'shared';
  /** Markup of the scroll container: top bars, content, bottom block. Rendered when the page is pushed. */
  html(): string;
  /** Wire interactive parts after the markup is in place. */
  mount?(root: HTMLElement): void;
  /** Route that «next» pushes (may depend on the state and on `below`, the routes of the pages under this one,
   *  bottom first); null: nothing to push. Controls with `data-push` push their own route instead
   *  (components.ts `pushRoute`). */
  next?(below: readonly string[]): string | null;
  /** Release tweens and observers before the page leaves the DOM. */
  unmount?(root: HTMLElement): void;
  /** Re-render state-dependent parts; called on the page below before it is uncovered (pop, drag start). */
  refresh?(root: HTMLElement): void;
  /** Called with the clicked control before the navigation controller runs its `data-action`. */
  beforeAction?(control: HTMLElement): void;
}
