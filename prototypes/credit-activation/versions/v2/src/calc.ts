// Pure calculations of the offer (spec «Calculations»). No DOM, no state: unit-tested in test/calc.test.ts.
import type { Product } from './config';

export const AMOUNT = { min: 4_000_000, max: 9_000_000, step: 100_000, initial: 4_000_000 } as const;

/** Amount a pledge adds (badge «+3 000 000 ₽»). */
export const PLEDGE_BONUS = 3_000_000;
/** Amount «Проверить данные» adds (badge «+2 000 000 ₽»). */
export const CHECK_BONUS = 2_000_000;
/** From this slider value the pledge card is on. */
export const PLEDGE_THRESHOLD = AMOUNT.min + PLEDGE_BONUS;

/** Monthly payment fixed by the owner (2026-10-16): the same for any amount, pledge and option. */
const PAYMENT = 17_713.05;
/**
 * КН with «Все включено» off. Computed once from the old formula at its reference state (7 000 000 ₽, pledge on):
 * 17 713,05 × annuity(7 млн, 19,5 %) / annuity(7 млн, 19,5 % × 0,85) over 60 months = 18 858,08 ₽.
 */
const PAYMENT_NO_PACKAGE = 18_858.08;

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

/**
 * Last slider value below the pledge threshold, remembered while the pledge is off (initially AMOUNT.initial).
 * Called on every drag and before a pledge tap moves the slider to the threshold.
 */
export const rememberBelow = (remembered: number, slider: number): number =>
  slider < PLEDGE_THRESHOLD ? slider : remembered;

/**
 * Slider value after tapping a pledge card: on → the threshold (7 млн); off → the remembered value below the
 * threshold (clamped to the slider range and kept below the threshold).
 */
export function sliderAfterPledgeTap(on: boolean, remembered: number): number {
  if (on) return PLEDGE_THRESHOLD;
  return Math.min(clampAmount(remembered), PLEDGE_THRESHOLD - AMOUNT.step);
}

export function totalAmount(c: Pick<Choice, 'slider' | 'check'>): number {
  return c.slider + (c.check ? CHECK_BONUS : 0);
}

/** Monthly payment in rubles: fixed, only КН without the package pays more. */
export const monthlyPayment = (c: Pick<Choice, 'product' | 'package'>): number =>
  c.product === 'kn' && !c.package ? PAYMENT_NO_PACKAGE : PAYMENT;

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

/** КН: positive with the package; ОК: positive with a pledge. */
export const paymentTone = (c: Choice): Tone =>
  (c.product === 'kn' ? c.package : c.pledge) ? 'positive' : 'neutral';

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
