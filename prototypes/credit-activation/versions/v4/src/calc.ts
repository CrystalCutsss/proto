// Pure calculations of the offer (spec «Calculations»). No DOM, no state: unit-tested in test/calc.test.ts.
// v4 (Figma «V5»): the conditions on #/conditions add to the amount and cut the fee; in КН the tariff chosen
// on #/tariffs sets the monthly payment.

export const AMOUNT = { initial: 4_000_000 } as const;

/** Amount the pledge adds (badge «+200 000 ₽» on #/ and #/conditions). */
export const PLEDGE_BONUS = 200_000;
/** Amount «Проверить данные» adds (badge «+100 000 ₽»). */
export const CHECK_BONUS = 100_000;
/** Upper bound drawn on the «Предоставить выписку» badge («До +10 000 000 ₽»); it changes no number. */
export const STATEMENT_LIMIT = 10_000_000;

/** Monthly payment at the base amount: the header chip draws 17 713 ₽ / мес at 4 000 000 ₽. */
const PAYMENT = { amount: AMOUNT.initial, value: 17_713.05 } as const;

/** «Снизить комиссию» cards: −1 pp (salaries) and «До −0,5%» (turnover). Independent, the cuts add up (v3). */
export type FeeCut = 'one' | 'half';

/** Tariffs of #/tariffs (КН only); `custom` is «Ваши условия» → #/conditions. */
export type Tariff = 'universal' | 'minimal' | 'custom';

/** Payments drawn on the tariff cards at the base amount (33 500 and 17 500 ₽/мес); they scale with it. */
const TARIFF_PAYMENT: Record<Exclude<Tariff, 'custom'>, number> = { universal: 33_500, minimal: 17_500 };

/** Fee in tenths of a percent, so 2,5 % is 25 (no floating point drift). Badges: pledge −0,5%. */
const FEE = { base: 25, pledge: 5 } as const;
const FEE_CUT: Record<FeeCut, number> = { one: 10, half: 5 };

export interface Choice {
  /** «Залог авто» on #/ (КН) = «Залог авто» on #/conditions (ОК). */
  pledge: boolean;
  /** «Проверить данные» on #/conditions. */
  check: boolean;
  /** «Предоставить выписку» on #/conditions. */
  statement: boolean;
  /** Selected «Снизить комиссию» cards on #/conditions. */
  feeCuts: readonly FeeCut[];
  /** Tariff chosen on #/tariffs (КН); null until one is chosen. */
  tariff: Tariff | null;
}

/** The offer before any choice. */
export const BASE_CHOICE: Choice = {
  pledge: false,
  check: false,
  statement: false,
  feeCuts: [],
  tariff: null,
};

export function totalAmount(c: Pick<Choice, 'pledge' | 'check'>): number {
  return AMOUNT.initial + (c.pledge ? PLEDGE_BONUS : 0) + (c.check ? CHECK_BONUS : 0);
}

/**
 * Monthly payment in rubles, rounded to kopecks: 17 713,05 ₽ per 4 000 000 ₽ at the base fee 2,5 %, proportional
 * to the total amount and to (1 + fee): a lower fee lowers the payment (owner, 2026-10-25: the payment can go
 * down, its chip then turns positive). A chosen tariff's payment (33 500 / 17 500 ₽ per 4 000 000 ₽) follows the
 * amount only; «Ваши условия» keeps the formula.
 */
export function monthlyPayment(c: Pick<Choice, 'pledge' | 'check' | 'feeCuts' | 'tariff'>): number {
  const byAmount = totalAmount(c) / PAYMENT.amount;
  const value =
    c.tariff && c.tariff !== 'custom'
      ? TARIFF_PAYMENT[c.tariff] * byAmount
      : (PAYMENT.value * byAmount * (100 + fee(c))) / (100 + BASE_FEE);
  return Math.round(value * 100) / 100;
}

/** Fee in percent: 2,5 base, −0,5 pp with the pledge, −1,0 and/or −0,5 pp for the «Снизить комиссию» cards. */
export function fee(c: Pick<Choice, 'pledge' | 'feeCuts'>): number {
  const cuts = c.feeCuts.reduce((sum, cut) => sum + FEE_CUT[cut], 0) + (c.pledge ? FEE.pledge : 0);
  return (FEE.base - cuts) / 10;
}

export const BASE_FEE = FEE.base / 10;

export const feeLowered = (c: Pick<Choice, 'pledge' | 'feeCuts'>): boolean => fee(c) < BASE_FEE;

/** Header chips on #/conditions: the fee and the payment chips turn positive when lowered below the offer. */
export type Tone = 'neutral' | 'positive';

export const feeTone = (c: Choice): Tone => (feeLowered(c) ? 'positive' : 'neutral');

export const paymentTone = (c: Choice): Tone =>
  monthlyPayment(c) < monthlyPayment({ ...BASE_CHOICE, tariff: c.tariff }) ? 'positive' : 'neutral';

// ---------- formats (ru-RU, non-breaking spaces) ----------

const NBSP = ' ';
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

/** Tariff card title: «33 500 ₽/мес». */
export const formatPerMonth = (value: number): string => `${formatRub(value)}/мес`;

/** Tariff payment at the base amount (the number drawn on its card). */
export const tariffPayment = (t: Exclude<Tariff, 'custom'>): number => TARIFF_PAYMENT[t];
