// Types of registry.json (schemaVersion 1). Keep in sync with schemas/*.schema.json and src/index.js.

export type VersionStatus = 'draft' | 'review' | 'frozen';
export type PrototypeStatus = 'active' | 'paused' | 'archived';

export interface DesignSource {
  kind: 'inbox' | 'figma' | 'other';
  url?: string;
  note?: string;
}

export type Platform = 'mobile' | 'desktop';

export interface Scenario {
  id: string;
  title: string;
  /** Start screen of the scenario: "#/path" (hash routing) or "/path" (history routing). */
  route: string;
}

export interface AxisItem {
  id: string;
  title: string;
}

/** One independent choice of the viewer menu (opt-in); the chosen item id reaches the version as ?<id>=<item>. */
export interface Axis {
  id: string;
  title: string;
  /** The first item is the default. */
  items: AxisItem[];
}

export interface RegistryVersion {
  version: string;
  title: string;
  date: string;
  author: string;
  status: VersionStatus;
  changelog: string[];
  baseVersion: string | null;
  designSource: DesignSource | null;
  routing: 'hash' | 'history';
  routes: string[];
  /** Never empty: versions without scenarios get DEFAULT_SCENARIO at the start screen. */
  scenarios: Scenario[];
  /** Menu axes; when not empty the menu shows them instead of the scenario and version controls. */
  axes: Axis[];
  /** Site path, always /p/<slug>/<vN>/ */
  path: string;
}

export interface RegistryPrototype {
  slug: string;
  title: string;
  description: string;
  owner: string;
  tags: string[];
  status: PrototypeStatus;
  designSource: DesignSource | null;
  /** Resolved version id (never "latest"). */
  defaultVersion: string;
  separatePassword: boolean;
  /** How the viewer shows the prototype (ADR-0020). */
  platform: Platform;
  /** Latest version date, YYYY-MM-DD. */
  updated: string;
  /** Site path, always /p/<slug>/ */
  path: string;
  /** Preview image path (/_previews/<slug>.jpg), set by site:build when a screenshot exists. */
  preview?: string;
  versions: RegistryVersion[];
}

export interface Registry {
  schemaVersion: 1;
  prototypes: RegistryPrototype[];
}

export interface RegistryIssue {
  file: string;
  pointer: string;
  message: string;
}

export declare const DEFAULT_SCENARIO: { id: string; title: string };
export declare const RESERVED_AXES: Set<string>;
export declare const SLUG_RE: RegExp;
export declare const VERSION_RE: RegExp;
export declare const RESERVED_SLUGS: Set<string>;
export declare class RegistryError extends Error {
  issues: RegistryIssue[];
  constructor(issues: RegistryIssue[]);
}
export declare function versionNumber(v: string): number;
export declare function resolveDefaultVersion(
  defaultVersion: string,
  versions: { version: string; status: string }[],
): string | null;
export declare function inboxOnly(dir: string): boolean;
export declare function buildRegistry(repoRoot: string): Registry;
export declare function validateMetadata(
  kind: 'prototype' | 'version',
  data: unknown,
  file?: string,
): RegistryIssue[];
export declare function serializeRegistry(registry: unknown): string;
