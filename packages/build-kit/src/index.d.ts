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

export declare const PWA_DIR: string;
export declare const ICON_SIZES: readonly [180, 192, 512];
export declare const MANIFEST_FILE: string;
export declare function appNames(ctx: { slug: string; version: string; repoRoot: string }): {
  name: string;
  shortName: string;
};
export declare function initials(title: string): string;
export declare function defaultIconSvg(title: string): string;
export declare function manifest(
  ctx: { slug: string; version: string; base: string },
  names: { name: string; shortName: string },
): Record<string, unknown>;
export declare function pwaTags(
  ctx: { base: string },
  names: { shortName: string },
  html: string,
): HtmlTagDescriptor[];
export declare function renderIcons(versionDir: string, title: string): Promise<Map<number, Buffer>>;
export declare function pwa(ctx: VersionContext, versionDir: string): Plugin;
