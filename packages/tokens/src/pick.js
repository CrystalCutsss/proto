// Pick a subset of tokens.css: the given variables plus everything they reference, in every selector block
// (:root, [data-ds-theme], [data-ds-platform]). Used to embed only the needed tokens, e.g. in proto-shell.

/** @param {string} css */
function parseBlocks(css) {
  const blocks = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map();
    for (const d of (m[2] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
      decls.set(/** @type {string} */ (d[1]), (d[2] ?? '').trim());
    blocks.push({ selector: (m[1] ?? '').trim(), decls });
  }
  return blocks;
}

/**
 * @param {string} css tokens.css
 * @param {Iterable<string>} names custom property names, e.g. "--ds-text-primary"
 * @returns {string}
 */
export function pickVariables(css, names) {
  const blocks = parseBlocks(css);
  const keep = new Set();
  const queue = [...names];
  while (queue.length) {
    const name = /** @type {string} */ (queue.pop());
    if (keep.has(name)) continue;
    keep.add(name);
    for (const b of blocks) {
      const value = b.decls.get(name);
      if (value) for (const r of value.matchAll(/var\((--[\w-]+)/g)) queue.push(/** @type {string} */ (r[1]));
    }
  }
  return blocks
    .map((b) => {
      const lines = [...b.decls].filter(([n]) => keep.has(n)).map(([n, v]) => `  ${n}: ${v};`);
      return lines.length ? `${b.selector} {\n${lines.join('\n')}\n}\n` : '';
    })
    .join('');
}

/** Custom properties used through var() in a stylesheet. @param {string} css */
export const usedVariables = (css) =>
  new Set([...css.matchAll(/var\((--ds-[\w-]+)/g)].map((m) => /** @type {string} */ (m[1])));
