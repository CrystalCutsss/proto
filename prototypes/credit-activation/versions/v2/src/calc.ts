// Pure calculations of the offer (spec «Calculations»). No DOM, no state: unit-tested in test/calc.test.ts.
import type { Product } from './config';

export const AMOUNT = { min: 4_000_000, max: 9_000_000, step: 100_000, initial: 4_000_000 } as const;

/** Amount a pledge adds (badge «+3 000 000 ₽»). */
export const PLEDGE_BONUS = 3_000_000;
/** Amount «Проверить данные» adds (badge «+2 000 000 ₽»). */
export const CHECK_BONUS = 2_000_000;
/** From this slider value the pledge card is on. */
export const PLEDGE_THRESHOLD = AMOUNT.min + PLEDGE_BONUS;

const MONTHS = 60;
const BASE_RATE = 0.2;
const RATE_STEP = 0.005; // −0,5 pp
const PACKAGE_FACTOR = 0.85; // «Ставка ниже на 15%»
const REFERENCE = { amount: 7_000_000, payment: 17_713.05 } as const;

/** Fee in tenths of a percent, so 2,9 % is 29 (no floating point drift). */
const FEE = { base: 29, pledge: 25, turnoverStep: 5 } as const;

export interface Choice {
  product: Product;
  /** Slider value. */
  slider: number;
  pledge: boolean;
  /** «Пакет «Все включено»» (КН only). */
  package: boolean;
  /** «Проверить данные». */
  check: boolean;
  /** «Поддерживать оборот». */
  turnover: boolean;
  /** «Предоставить выписку». */
  statement: boolean;
}

export const clampAmount = (value: number): number =>
  Math.min(AMOUNT.max, Math.max(AMOUNT.min, Math.round(value / AMOUNT.step) * AMOUNT.step));

/** Whether a slider value switches the pledge card on. */
export const pledgeOnAt = (slider: number): boolean => slider >= PLEDGE_THRESHOLD;

/** Slider value after tapping a pledge card: on → min + bonus, off → back by the bonus (not below min). */
export function sliderAfterPledgeTap(slider: number, on: boolean): number {
  return on ? clampAmount(AMOUNT.min + PLEDGE_BONUS) : clampAmount(slider - PLEDGE_BONUS);
}

export function totalAmount(c: Pick<Choice, 'slider' | 'check'>): number {
  return c.slider + (c.check ? CHECK_BONUS : 0);
}

/** Annual rate. ОК payment depends on the amount only, so its rate is always the base one. */
export function annualRate(c: Pick<Choice, 'product' | 'pledge' | 'turnover' | 'package'>): number {
  if (c.product === 'ok') return BASE_RATE;
  const rate = BASE_RATE - (c.pledge ? RATE_STEP : 0) - (c.turnover ? RATE_STEP : 0);
  return c.package ? rate * PACKAGE_FACTOR : rate;
}

/** Monthly annuity payment over 60 months. */
export function annuity(amount: number, rate: number): number {
  const r = rate / 12;
  return (amount * r) / (1 - (1 + r) ** -MONTHS);
}

/** Scale so that the reference state of each product gives the design's 17 713,05 ₽. */
const SCALE: Record<Product, number> = {
  kn:
    REFERENCE.payment /
    annuity(REFERENCE.amount, annualRate({ product: 'kn', pledge: true, turnover: false, package: true })),
  ok: REFERENCE.payment / annuity(REFERENCE.amount, BASE_RATE),
};

/** Monthly payment in rubles, rounded to kopecks. */
export function monthlyPayment(c: Choice): number {
  const value = SCALE[c.product] * annuity(totalAmount(c), annualRate(c));
  return Math.round(value * 100) / 100;
}

/** ОК fee in percent (2.9, 2.5, 2.4, 2.0). */
export function fee(c: Pick<Choice, 'pledge' | 'turnover'>): number {
  const tenths = (c.pledge ? FEE.pledge : FEE.base) - (c.turnover ? FEE.turnoverStep : 0);
  return tenths / 10;
}

export const BASE_FEE = FEE.base / 10;

export const feeLowered = (c: Pick<Choice, 'pledge' | 'turnover'>): boolean => fee(c) < BASE_FEE;

// ---------- chip tones (panel on #/options) ----------

export type Tone = 'neutral' | 'positive';

export const amountTone = (c: Choice): Tone =>
  totalAmount(c) > c.slider || c.statement ? 'positive' : 'neutral';

export const paymentTone = (c: Choice): Tone => (c.product === 'kn' && c.package ? 'positive' : 'neutral');

export const feeTone = (c: Choice): Tone => (feeLowered(c) ? 'positive' : 'neutral');

/** «Проверка без опций»: nothing on, the package included. */
export const hasConditions = (c: Choice): boolean =>
  c.pledge || c.package || c.check || c.turnover || c.statement;

// ---------- formats (ru-RU, non-breaking spaces) ----------

const NBSP = '\u00a0';
const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const kopecks = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nbsp = (s: string) => s.replace(/\s/g, NBSP);

/** 7000000 → «7 000 000 ₽». */
export const formatRub = (value: number): string => `${nbsp(rubles.format(Math.round(value)))}${NBSP}₽`;

/** 17713.05 → «17 713,05 ₽». */
export const formatRubKopecks = (value: number): string => `${nbsp(kopecks.format(value))}${NBSP}₽`;

/** 2.5 → «2,5%». */
export const formatPercent = (value: number): string => `${percent.format(value)}%`;
