// Design source → platform-neutral spec → platform builder (web now, iOS later).

/** One screen of the prototype, independent of platform. */
export interface SpecScreen {
  id: string;
  name: string;
  /** Route in the web build ("#/checkout"); iOS will map it to a navigation destination. */
  route: string;
  /** Reference image relative to the version folder, e.g. design-input/checkout.png. */
  reference?: string;
  /** Frame size in px when known. */
  frame?: { width: number; height: number };
}

export interface VersionSpec {
  schemaVersion: 1;
  source: { kind: 'fixture' | 'figma'; ref: string };
  screens: SpecScreen[];
  /** Other inputs worth a human look (PDF, notes, exports). */
  attachments: string[];
}

export interface DesignSource {
  readonly kind: 'fixture' | 'figma';
  /** Build the spec of one version. */
  readSpec(): Promise<VersionSpec>;
}
