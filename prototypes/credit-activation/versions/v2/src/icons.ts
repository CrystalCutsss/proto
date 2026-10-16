// Icons live in assets/icons (the Vite public dir), so they are addressed through BASE_URL:
// the site serves each version under /p/<slug>/<vN>/.

export function icon(name: string): string {
  return `${import.meta.env.BASE_URL}icons/${name}`;
}

/** Inline style for a `.mask` element: the SVG is used as a mask and coloured by `color`. */
export function maskStyle(name: string): string {
  return `--mask: url('${icon(name)}')`;
}
