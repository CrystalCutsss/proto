export interface Screen {
  /** Hash route, e.g. `#/review`. */
  route: string;
  /** Accessible name of the page. */
  label: string;
  /** Whether back (chevron, edge swipe, browser back as a pop) is allowed from this screen. */
  canGoBack: boolean;
  /** Markup of the scroll container: top bars, content, bottom block. Rendered when the page is pushed. */
  html(): string;
  /** Wire interactive parts after the markup is in place. */
  mount?(root: HTMLElement): void;
  /** Route that «next» pushes (may depend on the state); null: nothing to push. Controls with `data-push`
   *  push their own route instead (components.ts `pushRoute`). */
  next?(): string | null;
  /** Re-render state-dependent parts; called on the page below before it is uncovered (pop, drag start). */
  refresh?(root: HTMLElement): void;
  /** Called with the clicked control before the navigation controller runs its `data-action`. */
  beforeAction?(control: HTMLElement): void;
}
