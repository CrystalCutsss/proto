// Types of registry.json (schemaVersion 1). Keep in sync with schemas/*.schema.json and src/index.js.

export type VersionStatus = 'draft' | 'review' | 'frozen';
export type PrototypeStatus = 'active' | 'paused' | 'archived';

export interface DesignSource {
  kind: 'inbox' | 'figma' | 'other';
  url?: string;
  note?: string;
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
  /** Latest version date, YYYY-MM-DD. */
  updated: string;
  /** Site path, always /p/<slug>/ */
  path: string;
  /** Preview image path, set by site:build when a screenshot exists. */
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
export declare function buildRegistry(repoRoot: string): Registry;
export declare function validateMetadata(
  kind: 'prototype' | 'version',
  data: unknown,
  file?: string,
): RegistryIssue[];
export declare function serializeRegistry(registry: unknown): string;
