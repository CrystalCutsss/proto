// Pure calculations of the offer (spec «Calculations»). No DOM, no state: unit-tested in test/calc.test.ts.
// v3 combines the v2 КН package (payment) with the v2 ОК fee; there is no slider and no product variant.

export const AMOUNT = { initial: 4_000_000 } as const;

/** Amount the pledge on #/heavy adds (badge «+3 000 000 ₽»). */
export const PLEDGE_BONUS = 3_000_000;
/** Amount «Проверить данные» adds (badge «+2 000 000 ₽»). */
export const CHECK_BONUS = 2_000_000;
/** Upper bound drawn on the «Предоставить выписку» badge («до +10 000 000 ₽»); it changes no number. */
export const STATEMENT_LIMIT = 10_000_000;

/** Monthly payment at the design's reference amount (owner, 2026-10-16): 17 713,05 ₽ for 7 000 000 ₽. */
const PAYMENT = { amount: 7_000_000, value: 17_713.05 } as const;
/** With «Все включено» off the payment is 15 % higher (owner, 2026-10-16). */
export const NO_PACKAGE_RAISE = 1.15;

/** «Снизим комиссию» cards on #/light: −1 pp and «До −0,5%». Independent checkboxes, the cuts add up
 *  (owner, 2026-10-20; was mutually exclusive, Q3). */
export type FeeCut = 'one' | 'half';

/** Fee in tenths of a percent, so 2,9 % is 29 (no floating point drift). */
const FEE = { base: 29, pledge: 25 } as const;
const FEE_CUT: Record<FeeCut, number> = { one: 10, half: 5 };

export interface Choice {
  /** «Оставить в залог авто» on #/heavy. */
  pledge: boolean;
  /** «Проверить данные» on #/heavy. */
  check: boolean;
  /** «Предоставить выписку» on #/heavy. */
  statement: boolean;
  /** «Пакет «Все включено»» on #/light (on by default). */
  package: boolean;
  /** Selected «Снизим комиссию» cards on #/light (any of them, none when empty). */
  feeCuts: readonly FeeCut[];
}

/** The offer before any choice (#/ shows these terms). */
export const BASE_CHOICE: Choice = {
  pledge: false,
  check: false,
  statement: false,
  package: true,
  feeCuts: [],
};

export function totalAmount(c: Pick<Choice, 'pledge' | 'check'>): number {
  return AMOUNT.initial + (c.pledge ? PLEDGE_BONUS : 0) + (c.check ? CHECK_BONUS : 0);
}

/**
 * Monthly payment in rubles, rounded to kopecks: proportional to the total amount (17 713,05 ₽ per 7 000 000 ₽),
 * +15 % without the package. The statement and the fee options change no rate.
 */
export function monthlyPayment(c: Pick<Choice, 'pledge' | 'check' | 'package'>): number {
  const base = (PAYMENT.value * totalAmount(c)) / PAYMENT.amount;
  const raised = c.package ? base : base * NO_PACKAGE_RAISE;
  return Math.round(raised * 100) / 100;
}

/** Fee in percent: 2,9 base, 2,5 with the pledge, minus 1,0 and/or 0,5 pp for the «Снизим комиссию» cards. */
export function fee(c: Pick<Choice, 'pledge' | 'feeCuts'>): number {
  const cuts = c.feeCuts.reduce((sum, cut) => sum + FEE_CUT[cut], 0);
  const tenths = (c.pledge ? FEE.pledge : FEE.base) - cuts;
  return tenths / 10;
}

export const BASE_FEE = FEE.base / 10;

export const feeLowered = (c: Pick<Choice, 'pledge' | 'feeCuts'>): boolean => fee(c) < BASE_FEE;

// ---------- chip tones (panels on #/heavy and #/light) ----------

export type Tone = 'neutral' | 'positive';

/** Panel the chips belong to: the payment chip turns positive only on #/light (owner, Q2). */
export type Panel = 'heavy' | 'light';

export const amountTone = (c: Choice): Tone =>
  totalAmount(c) > AMOUNT.initial || c.statement ? 'positive' : 'neutral';

export const paymentTone = (c: Choice, panel: Panel): Tone =>
  panel === 'light' && c.package ? 'positive' : 'neutral';

export const feeTone = (c: Choice): Tone => (feeLowered(c) ? 'positive' : 'neutral');

// ---------- formats (ru-RU, non-breaking spaces) ----------

const NBSP = ' ';
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

/** Chip label of the payment: «17 713 ₽ / мес». */
export const formatPaymentChip = (value: number): string => `${formatRub(value)}${NBSP}/${NBSP}мес`;
