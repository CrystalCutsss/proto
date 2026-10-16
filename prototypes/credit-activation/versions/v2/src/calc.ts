// Pure calculations of the offer (spec «Calculations»). No DOM, no state: unit-tested in test/calc.test.ts.
import type { Product } from './config';

export const AMOUNT = { min: 4_000_000, max: 9_000_000, step: 100_000, initial: 4_000_000 } as const;

/** Amount a pledge adds (badge «+3 000 000 ₽»). */
export const PLEDGE_BONUS = 3_000_000;
/** Amount «Проверить данные» adds (badge «+2 000 000 ₽»). */
export const CHECK_BONUS = 2_000_000;
/** From this slider value the pledge card is on. */
export const PLEDGE_THRESHOLD = AMOUNT.min + PLEDGE_BONUS;

/** Monthly payment at the design's reference amount (owner, 2026-10-16): 17 713,05 ₽ for 7 000 000 ₽. */
const PAYMENT = { amount: 7_000_000, value: 17_713.05 } as const;
/** КН with «Все включено» off pays 15 % more (owner, 2026-10-16). */
export const NO_PACKAGE_RAISE = 1.15;

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

/** Highest slider value with the pledge off. */
const BELOW_THRESHOLD = PLEDGE_THRESHOLD - AMOUNT.step;

/**
 * Tapping a pledge on adds its chip (+3 млн) to the current value, at most the slider maximum. Returns the new
 * value and how much was actually added (the tap-off takes exactly that back).
 */
export function sliderAfterPledgeOn(current: number): { slider: number; added: number } {
  const from = clampAmount(current);
  const slider = Math.min(AMOUNT.max, from + PLEDGE_BONUS);
  return { slider, added: slider - from };
}

/**
 * Tapping a pledge off. `added` > 0 when a tap switched it on: the slider gives that amount back from where it
 * is now (also after a drag above 7 млн). `added` = 0 when a drag switched it on: back to `remembered`, the last
 * value below 7 млн. Either way it ends below the threshold.
 */
export function sliderAfterPledgeOff(current: number, remembered: number, added: number): number {
  const target = added > 0 ? clampAmount(current - added) : clampAmount(remembered);
  return Math.min(target, BELOW_THRESHOLD);
}

export function totalAmount(c: Pick<Choice, 'slider' | 'check'>): number {
  return c.slider + (c.check ? CHECK_BONUS : 0);
}

/**
 * Monthly payment in rubles, rounded to kopecks: proportional to the total amount (17 713,05 ₽ per 7 000 000 ₽),
 * +15 % in КН without the package. Pledge and the other options change no rate.
 */
export function monthlyPayment(c: Pick<Choice, 'product' | 'package' | 'slider' | 'check'>): number {
  const base = (PAYMENT.value * totalAmount(c)) / PAYMENT.amount;
  const raised = c.product === 'kn' && !c.package ? base * NO_PACKAGE_RAISE : base;
  return Math.round(raised * 100) / 100;
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
