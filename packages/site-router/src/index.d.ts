import type { RegistryPrototype } from '@proto/registry';

export type CacheClass = 'immutable' | 'revalidate' | 'no-cache';

export type RoutePrototype = Pick<RegistryPrototype, 'slug' | 'defaultVersion'> & {
  versions: { version: string; status: string; routing: 'hash' | 'history' }[];
};

export interface RouteRegistry {
  prototypes: RoutePrototype[];
}

export type RouteDecision =
  | { type: 'asset'; path: string; fallback?: string; cache: CacheClass }
  | { type: 'redirect'; location: string; status: 302 }
  | { type: 'not-found' };

export declare function cacheClass(path: string): CacheClass;
export declare function latestVersion(p: RoutePrototype): string;
export declare function route(pathname: string, search: string, registry: RouteRegistry): RouteDecision;
export declare function securityHeaders(cache: CacheClass): Record<string, string>;
