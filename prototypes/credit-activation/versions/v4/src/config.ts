// Variant chosen in the viewer menu (the `product` axis in version.json). The viewer reloads the iframe with
// new query parameters; the prototype only reads them, once, and never writes them.

export type Product = 'kn' | 'ok';

export function parseProduct(search: string): Product {
  const value = new URLSearchParams(search).get('product');
  return value === 'ok' ? 'ok' : 'kn';
}

export const product: Product = parseProduct(typeof location === 'undefined' ? '' : location.search);
