// Import of the Figma Variables export (Proto/DS/tokens/*.tokens.json, ADR-0013) into DTCG 2025.10 trees.
//
// The export is DTCG-like: every variable has $type/$value plus $extensions.<vendor>.{collection, scopes,
// valuesByMode}. References ("{Color.Yellow.Yellow}") omit the collection name; variable paths are unique
// across collections, so collections are merged into one tree and references stay valid as they are.
//
// Modes: one tree per selected mode of every multi-mode collection (Theme: Day/Night, Platform:
// iOS/Android/Desktop). Interaction states (State collection) are expanded into sibling tokens
// (…/background/hover) because a state is not a context the whole page switches into.

/** Collection settings. Unknown collections use their first mode. */
export const COLLECTIONS = {
  Theme: { default: 'Day', variants: { night: 'Night' }, attribute: 'data-ds-theme' },
  Platform: {
    default: 'Desktop',
    variants: { ios: 'iOS', android: 'Android' },
    attribute: 'data-ds-platform',
  },
  State: { expand: true },
};

/** Fallback font stacks: TUI fonts are commercial and not shipped with the DS export. */
const FALLBACK = {
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  sans: ['Inter Variable', 'system-ui', 'sans-serif'],
  // SF Pro is never embedded (Apple license); on Apple devices the system font is SF Pro.
  apple: ['-apple-system', 'BlinkMacSystemFont', 'Inter Variable', 'system-ui', 'sans-serif'],
};

/** @typedef {{ path: string[], collection: string, type: string, scopes: string[], description?: string, valuesByMode: Record<string, unknown> }} FigmaVariable */

/**
 * Flatten one export file into variables.
 * @param {Record<string, any>} json
 * @returns {FigmaVariable[]}
 */
export function readFigmaExport(json) {
  /** @type {FigmaVariable[]} */
  const out = [];
  /** @param {any} node @param {string[]} path */
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      const ext = Object.values(node.$extensions ?? {}).find(
        (e) => e && typeof e === 'object' && 'valuesByMode' in e,
      );
      if (!ext)
        throw new Error(`${path.join('/')}: no valuesByMode in $extensions — not a Figma Variables export`);
      const [collection, ...rest] = path;
      out.push({
        path: rest,
        collection: ext.collection ?? collection ?? '',
        type: node.$type,
        scopes: ext.scopes ?? [],
        ...(node.$description ? { description: node.$description } : {}),
        valuesByMode: ext.valuesByMode,
      });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k]);
  };
  walk(json, []);
  return out;
}

/** "Hover (Desktop)" → "hover", "Mode 1" → "mode-1" */
export const modeSlug = (mode) =>
  mode
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** DTCG forbids "." "{" "}" in names. */
const cleanName = (name) => name.replace(/[.{}]/g, '-');

const round = (n, digits = 4) => Number(n.toFixed(digits));

/** "#rrggbb" / "#rrggbbaa" → DTCG 2025.10 color. */
export function hexToColor(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`unsupported color "${hex}"`);
  const rgb = m[1];
  const components = [0, 2, 4].map((i) => round(parseInt(rgb.slice(i, i + 2), 16) / 255));
  const color = { colorSpace: 'srgb', components, hex: `#${rgb.toLowerCase()}` };
  if (m[2]) color.alpha = round(parseInt(m[2], 16) / 255);
  return color;
}

/**
 * DTCG type of a variable, from Figma type, scopes and path. Aliases get the same type as their target
 * in practice (Figma scopes are consistent), so it is computed per variable.
 * @param {FigmaVariable} v
 */
export function dtcgType(v) {
  const scopes = new Set(v.scopes);
  const path = v.path.join('/');
  if (v.type === 'color') return 'color';
  if (v.type === 'string') {
    if (scopes.has('FONT_FAMILY')) return 'fontFamily';
    if (/(^|\/)Curve\//.test(path)) return 'cubicBezier';
    if (/(^|\/)Duration\//.test(path)) return 'duration'; // exported as strings holding seconds
    return null; // descriptive strings (Figma Library meta): not design tokens
  }
  if (scopes.has('FONT_WEIGHT')) return 'fontWeight';
  if (scopes.has('OPACITY')) return 'number';
  if (/(^|\/)Duration\//.test(path)) return 'duration';
  if (/(^|\/)Curve\//.test(path)) return 'cubicBezier';
  if (
    [
      'FONT_SIZE',
      'LINE_HEIGHT',
      'LETTER_SPACING',
      'WIDTH_HEIGHT',
      'GAP',
      'CORNER_RADIUS',
      'STROKE_FLOAT',
    ].some((s) => scopes.has(s))
  ) {
    return 'dimension';
  }
  if (/Shadow|Spacing|Rounding/.test(path)) return 'dimension';
  return 'number';
}

/**
 * Convert one raw mode value. References stay as DTCG references.
 * @param {unknown} raw @param {string} type @param {FigmaVariable} v
 */
export function convertValue(raw, type, v) {
  if (typeof raw === 'string' && /^\{[^{}]+\}$/.test(raw)) {
    return `{${raw.slice(1, -1).split('.').map(cleanName).join('.')}}`;
  }
  const where = `${v.collection}/${v.path.join('/')}`;
  switch (type) {
    case 'color':
      return hexToColor(String(raw));
    case 'dimension':
      return { value: round(Number(raw)), unit: 'px' };
    case 'duration':
      return { value: Math.round(Number(raw) * 1000), unit: 'ms' };
    case 'fontWeight':
      return Number(raw);
    case 'number':
      // Figma opacity is 0–100.
      return v.scopes.includes('OPACITY') ? round(Number(raw) / 100) : Number(raw);
    case 'fontFamily': {
      const name = String(raw);
      const fallback = /^SF Pro/.test(name)
        ? FALLBACK.apple
        : /mono|code/i.test(v.path.join('/') + name)
          ? FALLBACK.mono
          : FALLBACK.sans;
      return [name, ...fallback];
    }
    case 'cubicBezier': {
      const b = /** @type {any} */ (raw)?.easingFunctionCubicBezier;
      if (!b) throw new Error(`${where}: unsupported easing ${JSON.stringify(raw)}`);
      return [b.x1, b.y1, b.x2, b.y2].map((n) => round(n, 3));
    }
    default:
      throw new Error(`${where}: unsupported type ${type}`);
  }
}

/** @param {Record<string, any>} tree @param {string[]} path @param {Record<string, unknown>} token */
function put(tree, path, token) {
  let node = tree;
  for (const key of path.slice(0, -1)) {
    node[key] ??= {};
    if ('$value' in node[key]) throw new Error(`${path.join('/')}: "${key}" is both a token and a group`);
    node = node[key];
  }
  const leaf = /** @type {string} */ (path.at(-1));
  if (node[leaf]) throw new Error(`${path.join('/')}: duplicate token`);
  node[leaf] = token;
}

/**
 * Build a DTCG tree for one combination of modes.
 * @param {FigmaVariable[]} vars
 * @param {Record<string, string>} [select] collection → mode name; default from COLLECTIONS
 * @returns {{ tree: Record<string, any>, skipped: string[] }}
 */
export function toDtcg(vars, select = {}) {
  /** @type {Record<string, any>} */
  const tree = {};
  const skipped = [];
  for (const v of vars) {
    const type = dtcgType(v);
    const name = v.path.map(cleanName);
    if (!type) {
      skipped.push(`${v.collection}/${v.path.join('/')}`);
      continue;
    }
    const cfg = /** @type {Record<string, any>} */ (COLLECTIONS)[v.collection] ?? {};
    const modes = Object.keys(v.valuesByMode);
    const ext = { 'proto.figma': { collection: v.collection } };
    const base = { $type: type, ...(v.description ? { $description: v.description } : {}), $extensions: ext };
    if (cfg.expand) {
      for (const mode of modes) {
        put(tree, [...name, modeSlug(mode)], {
          ...base,
          $value: convertValue(v.valuesByMode[mode], type, v),
        });
      }
      continue;
    }
    const mode = select[v.collection] ?? cfg.default ?? modes[0];
    if (!(mode in v.valuesByMode)) throw new Error(`${v.collection}/${v.path.join('/')}: no mode "${mode}"`);
    put(tree, name, { ...base, $value: convertValue(v.valuesByMode[mode], type, v) });
  }
  return { tree, skipped };
}

/** All references in a tree resolve to an existing token. Returns unresolved references. */
export function unresolvedReferences(tree) {
  const tokens = new Set();
  const refs = [];
  /** @param {any} node @param {string[]} path */
  const walk = (node, path) => {
    if (node && typeof node === 'object' && '$value' in node) {
      tokens.add(path.join('.'));
      const values = JSON.stringify(node.$value).match(/\{[^{}"]+\}/g) ?? [];
      for (const r of values) refs.push({ from: path.join('.'), to: r.slice(1, -1) });
      return;
    }
    if (node && typeof node === 'object')
      for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k]);
  };
  walk(tree, []);
  return refs.filter((r) => !tokens.has(r.to));
}

/**
 * Variants to build: the default tree plus one tree per non-default mode of Theme and Platform.
 * @param {FigmaVariable[]} vars
 */
export function buildVariants(vars) {
  const variants = [{ id: 'default', selector: ':root', collection: null, ...toDtcg(vars) }];
  for (const [collection, cfg] of Object.entries(COLLECTIONS)) {
    for (const [id, mode] of Object.entries(/** @type {any} */ (cfg).variants ?? {})) {
      if (!vars.some((v) => v.collection === collection && mode in v.valuesByMode)) continue;
      variants.push({
        id: `${collection.toLowerCase()}-${id}`,
        selector: `[${/** @type {any} */ (cfg).attribute}="${id}"]`,
        collection,
        ...toDtcg(vars, { [collection]: mode }),
      });
    }
  }
  return variants;
}
