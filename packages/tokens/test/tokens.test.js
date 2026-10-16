import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildVariants,
  convertValue,
  dtcgType,
  hexToColor,
  modeSlug,
  readFigmaExport,
  toDtcg,
} from '../src/figma-import.js';
import { pickVariables, usedVariables } from '../src/pick.js';

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');

/** Minimal export in the shape of the TUI Figma Variables export. */
const v = (collection, path, type, scopes, valuesByMode) => ({
  path,
  collection,
  type,
  scopes,
  valuesByMode,
});
const sample = {
  Primitive: {
    Color: {
      Yellow: {
        Yellow: {
          $type: 'color',
          $value: '#ffdd2d',
          $extensions: {
            'com.tbank.figma': { collection: 'Primitive', scopes: [], valuesByMode: { 'Mode 1': '#ffdd2d' } },
          },
        },
      },
    },
  },
  Theme: {
    Background: {
      'Accent 1': {
        $type: 'color',
        $value: '{Color.Yellow.Yellow}',
        $extensions: {
          'com.tbank.figma': {
            collection: 'Theme',
            scopes: [],
            valuesByMode: { Day: '{Color.Yellow.Yellow}', Night: '#000000cc' },
          },
        },
      },
    },
  },
  State: {
    button: {
      background: {
        $type: 'color',
        $value: '{Background.Accent 1}',
        $extensions: {
          'com.tbank.figma': {
            collection: 'State',
            scopes: [],
            valuesByMode: { Normal: '{Background.Accent 1}', 'Hover (Desktop)': '#ffffff' },
          },
        },
      },
    },
  },
};

describe('figma-import', () => {
  it('reads the export, keeps references and converts colors to DTCG 2025.10', () => {
    const vars = readFigmaExport(sample);
    expect(vars.map((x) => `${x.collection}:${x.path.join('/')}`)).toEqual([
      'Primitive:Color/Yellow/Yellow',
      'Theme:Background/Accent 1',
      'State:button/background',
    ]);
    const { tree } = toDtcg(vars);
    expect(tree.Color.Yellow.Yellow.$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 0.8667, 0.1765],
      hex: '#ffdd2d',
    });
    expect(tree.Background['Accent 1'].$value).toBe('{Color.Yellow.Yellow}');
    expect(tree.button.background.normal.$value).toBe('{Background.Accent 1}');
    expect(tree.button.background.hover.$value.hex).toBe('#ffffff');
  });

  it('builds a variant per non-default mode', () => {
    const variants = buildVariants(readFigmaExport(sample));
    expect(variants.map((x) => [x.id, x.selector])).toEqual([
      ['default', ':root'],
      ['theme-night', '[data-ds-theme="night"]'],
    ]);
    expect(variants[1]?.tree.Background['Accent 1'].$value).toEqual({
      colorSpace: 'srgb',
      components: [0, 0, 0],
      hex: '#000000',
      alpha: 0.8,
    });
  });

  it('maps Figma scopes to DTCG types and units', () => {
    expect(dtcgType(v('Primitive', ['Font', 'Font Size', 'x4'], 'number', ['FONT_SIZE'], {}))).toBe(
      'dimension',
    );
    expect(dtcgType(v('Primitive', ['Font', 'Font Weight', 'Bold'], 'number', ['FONT_WEIGHT'], {}))).toBe(
      'fontWeight',
    );
    expect(dtcgType(v('Primitive', ['Animation', 'Duration', 'fast'], 'string', [], {}))).toBe('duration');
    expect(dtcgType(v('Theme', ['Figma Library', 'Theme'], 'string', [], {}))).toBeNull();
    const opacity = v('State', ['common', 'opacity'], 'number', ['OPACITY'], {});
    expect(convertValue(40, 'number', opacity)).toBe(0.4);
    expect(convertValue(0.15, 'duration', opacity)).toEqual({ value: 150, unit: 'ms' });
    const family = v('Primitive', ['Font Family', 'Code', 'Desktop Value'], 'string', ['FONT_FAMILY'], {});
    expect(convertValue('JetBrains Mono', 'fontFamily', family)[1]).toBe('JetBrains Mono');
    expect(convertValue('SF Pro', 'fontFamily', family)[1]).toBe('-apple-system');
    const text = v('Primitive', ['Font', 'Font Family', 'Text', 'iOS Value'], 'string', ['FONT_FAMILY'], {});
    const display = v('Primitive', ['Font', 'Font Family', 'Display', 'iOS Value'], 'string', ['FONT_FAMILY'], {});
    expect(convertValue('SF Pro', 'fontFamily', text).slice(0, 3)).toEqual(['SF Pro', 'SF Pro Text', '-apple-system']);
    expect(convertValue('SF Pro', 'fontFamily', display)[1]).toBe('SF Pro Display');
    expect(convertValue('SF Pro Rounded', 'fontFamily', display).slice(0, 3)).toEqual([
      'SF Pro Rounded',
      'ui-rounded',
      '-apple-system',
    ]);
    expect(hexToColor('#0000001f').alpha).toBe(0.1216);
    expect(modeSlug('Hover (Desktop)')).toBe('hover');
  });
});

describe('@proto/tokens build (TUI export)', () => {
  it('emits semantic TUI tokens with day/night and platform variants', () => {
    expect(css).toMatch(/:root \{/);
    expect(css).toMatch(/--ds-background-base: var\(--ds-color-background-base-day-value\);/);
    expect(css).toMatch(
      /\[data-ds-theme="night"\] \{[^}]*--ds-background-base: var\(--ds-color-background-base-night-value\);/,
    );
    expect(css).toMatch(/\[data-ds-platform="ios"\] \{/);
    expect(css).toMatch(/--ds-animation-duration-fast: 150ms;/);
    expect(css).toMatch(/--ds-space-4: 16px;/);
  });

  it('exports JS values', async () => {
    const tokens = await import('../dist/tokens.js');
    expect(tokens.AnimationCurveProductiveStandard).toEqual([0.2, 0, 0.4, 0.9]);
  });

  it('picks only the needed variables with their references', () => {
    const picked = pickVariables(css, usedVariables('a { color: var(--ds-text-primary); }'));
    expect(picked).toMatch(/--ds-text-primary: var\(--ds-color-text-primary-day-value\);/);
    expect(picked).toMatch(/--ds-color-text-primary-day-value:/);
    expect(picked).not.toMatch(/--ds-background-base:/);
  });
});
