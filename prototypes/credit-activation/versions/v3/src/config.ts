// Variant chosen in the viewer menu (axes in version.json). The viewer reloads the iframe with new query
// parameters; the prototype only reads them, once, and never writes them.

export type Product = 'kn' | 'ok';
export type PledgeVariant = 'auto' | 'realty' | 'both';
export type Docs = 'one' | 'two';

export interface Config {
  product: Product;
  pledge: PledgeVariant;
  docs: Docs;
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseConfig(search: string): Config {
  const params = new URLSearchParams(search);
  return {
    product: pick(params.get('product'), ['kn', 'ok'], 'kn'),
    pledge: pick(params.get('pledge'), ['auto', 'realty', 'both'], 'auto'),
    docs: pick(params.get('docs'), ['one', 'two'], 'one'),
  };
}

export const config: Config = parseConfig(typeof location === 'undefined' ? '' : location.search);
