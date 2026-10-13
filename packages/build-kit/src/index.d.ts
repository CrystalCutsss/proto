import type { HtmlTagDescriptor, Plugin, UserConfig } from 'vite';

export interface VersionContext {
  slug: string;
  version: string;
  repoRoot: string;
  base: string;
}
export declare const FORBIDDEN_CDN: RegExp;
export declare function versionContext(versionDir: string): VersionContext;
export declare function shellTags(ctx: { slug: string; version: string }): HtmlTagDescriptor[];
export declare function protoShell(ctx: { slug: string; version: string; repoRoot: string }): Plugin;
export declare function cdnGuard(): Plugin;
export declare function svgOptimize(): Plugin;
export declare function defineVersionConfig(versionDir: string, overrides?: UserConfig): UserConfig;
