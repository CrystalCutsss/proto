// Stylelint plugin: design values (colors, fonts, spacing, radii, shadows, motion) must come from
// design-system tokens, i.e. var(--ds-*). Literal values are allowed only for a short neutral list.
import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = 'proto/ds-tokens';

export const messages = ruleMessages(ruleName, {
  rejected: (prop, value) =>
    `"${prop}: ${value}" — use a design token: var(--ds-…). Hard-coded design values are not allowed.`,
});

const CHECKED = [
  /^color$/,
  /^background(-color)?$/,
  /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/,
  /^outline(-color)?$/,
  /^(text-decoration|caret|accent|column-rule)-color$/,
  /^fill$/,
  /^stroke$/,
  /^box-shadow$/,
  /^text-shadow$/,
  /^font(-family|-size|-weight)?$/,
  /^line-height$/,
  /^letter-spacing$/,
  /^(margin|padding)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$/,
  /^(row-|column-)?gap$/,
  /^border(-(top|bottom)-(left|right)|-(start|end)-(start|end))?-radius$/,
  /^(transition|animation)(-duration|-timing-function|-delay)?$/,
  /^outline-width$/,
  /^border(-(top|right|bottom|left))?-width$/,
];

// Keywords and units that carry no design decision.
const NEUTRAL_WORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'auto',
  'none',
  'normal',
  'transparent',
  'currentcolor',
  'solid',
  'dashed',
  'dotted',
  'double',
  'hidden',
  'inset',
  'all',
  'ease',
  'linear',
  'infinite',
  'alternate',
  'forwards',
  'backwards',
  'both',
  'bold',
  'italic',
]);

const IDENTIFIER_PROPS = /^(transition|animation)(-property|-name)?$/;

/** @param {string} value @param {string} [prop] */
export function isAllowed(value, prop = '') {
  // transition/animation shorthands name properties and keyframes; only their timings are design values.
  const identifiersOk = IDENTIFIER_PROPS.test(prop) && !/cubic-bezier\(|steps\(/.test(value);
  // Strip token references (with fallbacks) and harmless functions first.
  let rest = value.replace(/var\(--ds-[\w-]+\)/g, ' ');
  // Device safe areas are the device's values, not design values (ADR-0020).
  rest = rest.replace(/env\(safe-area-inset-(top|right|bottom|left)(,\s*0[a-z]*)?\)/g, ' ');
  if (/var\((?!--ds-)/.test(rest)) {
    // Local custom properties are allowed: they are checked where they are defined.
    rest = rest.replace(/var\(--[\w-]+\)/g, ' ');
  }
  rest = rest.replace(/\b(calc|min|max|clamp)\(/g, ' ').replace(/[(),*/+]/g, ' ');
  for (const word of rest.split(/\s+/).filter(Boolean)) {
    const w = word.toLowerCase();
    if (NEUTRAL_WORDS.has(w)) continue;
    if (identifiersOk && /^[a-z][a-z-]*$/.test(w)) continue;
    if (/^-?0(\.0+)?([a-z%]+)?$/.test(w)) continue; // zero in any unit
    if (/^-?(\d+(\.\d+)?|\.\d+)(%|vw|vh|svh|dvh|lvh|vmin|vmax|fr)?$/.test(w)) continue; // ratios, %, viewport
    if (/^-?1px$/.test(w)) continue; // hairlines
    return false;
  }
  return true;
}

/** @type {import('stylelint').Rule} */
const rule = (primary) => (root, result) => {
  if (!validateOptions(result, ruleName, { actual: primary })) return;
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (prop.startsWith('--')) return; // custom property definitions are the place for values
    if (!CHECKED.some((re) => re.test(prop))) return;
    if (isAllowed(decl.value, prop)) return;
    report({
      message: messages.rejected(decl.prop, decl.value),
      node: decl,
      result,
      ruleName,
      word: decl.value,
    });
  });
};
rule.ruleName = ruleName;
rule.messages = messages;

export default createPlugin(ruleName, rule);
