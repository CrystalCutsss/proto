import { describe, expect, it } from 'vitest';
import {
  AMOUNT,
  amountTone,
  type Choice,
  fee,
  feeTone,
  formatPercent,
  formatRub,
  formatRubKopecks,
  hasConditions,
  monthlyPayment,
  paymentTone,
  PLEDGE_THRESHOLD,
  pledgeOnAt,
  rememberBelow,
  sliderAfterPledgeTap,
  totalAmount,
} from '../src/calc';

const NBSP = '\u00a0';
const choice = (over: Partial<Choice> = {}): Choice => ({
  product: 'kn',
  slider: 7_000_000,
  pledge: true,
  package: true,
  check: false,
  turnover: false,
  statement: false,
  ...over,
});

describe('monthly payment', () => {
  it('is 17 713,05 ₽ for any amount, pledge and option (package on in КН)', () => {
    for (const product of ['kn', 'ok'] as const) {
      for (const slider of [AMOUNT.min, 5_500_000, 7_000_000, AMOUNT.max]) {
        for (const pledge of [true, false]) {
          for (const check of [true, false]) {
            for (const turnover of [true, false]) {
              const c = choice({ product, slider, pledge, check, turnover, package: product === 'kn' });
              expect(monthlyPayment(c)).toBe(17_713.05);
            }
          }
        }
      }
    }
    expect(formatRubKopecks(monthlyPayment(choice()))).toBe(`17${NBSP}713,05${NBSP}₽`);
    expect(formatRub(monthlyPayment(choice()))).toBe(`17${NBSP}713${NBSP}₽`);
  });

  it('turning the КН package off raises it to a fixed 18 858,08 ₽', () => {
    for (const slider of [AMOUNT.min, AMOUNT.max]) {
      for (const pledge of [true, false]) {
        expect(monthlyPayment(choice({ slider, pledge, package: false }))).toBe(18_858.08);
      }
    }
    expect(monthlyPayment(choice({ package: false }))).toBeGreaterThan(monthlyPayment(choice()));
  });

  it('ОК ignores the package flag', () => {
    expect(monthlyPayment(choice({ product: 'ok', package: false }))).toBe(17_713.05);
  });
});

describe('ОК fee', () => {
  it('is 2,9 / 2,5 / 2,4 / 2,0 %', () => {
    expect(fee({ pledge: false, turnover: false })).toBe(2.9);
    expect(fee({ pledge: true, turnover: false })).toBe(2.5);
    expect(fee({ pledge: false, turnover: true })).toBe(2.4);
    expect(fee({ pledge: true, turnover: true })).toBe(2.0);
    expect(formatPercent(2.0)).toBe('2,0%');
    expect(formatPercent(2.5)).toBe('2,5%');
  });

  it('fee chip turns positive only below 2,9 %', () => {
    expect(feeTone(choice({ product: 'ok', pledge: false }))).toBe('neutral');
    expect(feeTone(choice({ product: 'ok', pledge: true }))).toBe('positive');
    expect(feeTone(choice({ product: 'ok', pledge: false, turnover: true }))).toBe('positive');
  });
});

describe('pledge threshold and slider', () => {
  it('switches on at 7 000 000 ₽', () => {
    expect(PLEDGE_THRESHOLD).toBe(7_000_000);
    expect(pledgeOnAt(6_900_000)).toBe(false);
    expect(pledgeOnAt(7_000_000)).toBe(true);
    expect(pledgeOnAt(AMOUNT.max)).toBe(true);
  });

  it('remembers the last slider value below 7 млн', () => {
    expect(rememberBelow(AMOUNT.initial, 5_500_000)).toBe(5_500_000);
    expect(rememberBelow(5_500_000, 6_900_000)).toBe(6_900_000);
    expect(rememberBelow(6_900_000, 7_000_000)).toBe(6_900_000);
    expect(rememberBelow(6_900_000, AMOUNT.max)).toBe(6_900_000);
  });

  it('tap on adds the pledge chip (+3 млн, at most 9 млн), tap off returns it to the remembered value', () => {
    expect(sliderAfterPledgeTap(true, AMOUNT.initial)).toBe(7_000_000);
    expect(sliderAfterPledgeTap(true, 5_500_000)).toBe(8_500_000);
    expect(sliderAfterPledgeTap(true, 6_800_000)).toBe(AMOUNT.max);
    expect(sliderAfterPledgeTap(false, 5_500_000)).toBe(5_500_000);
    expect(sliderAfterPledgeTap(false, AMOUNT.initial)).toBe(AMOUNT.initial);
    expect(sliderAfterPledgeTap(false, 6_900_000)).toBe(6_900_000);
  });

  it('drag 5,5 → 9 млн then tap off returns to the last value below 7 млн seen in the drag', () => {
    let below: number = AMOUNT.initial;
    for (const v of [5_500_000, 6_200_000, 6_800_000, 7_100_000, 9_000_000]) below = rememberBelow(below, v);
    expect(sliderAfterPledgeTap(false, below)).toBe(6_800_000);
  });

  it('tap off stays inside the range and below the threshold', () => {
    expect(sliderAfterPledgeTap(false, 1_000_000)).toBe(AMOUNT.min);
    expect(sliderAfterPledgeTap(false, 8_000_000)).toBeLessThan(PLEDGE_THRESHOLD);
  });
});

describe('total and chips', () => {
  it('«Проверить данные» adds 2 000 000 ₽', () => {
    expect(totalAmount({ slider: 7_000_000, check: true })).toBe(9_000_000);
    expect(totalAmount({ slider: 7_000_000, check: false })).toBe(7_000_000);
    expect(formatRub(totalAmount({ slider: 7_000_000, check: true }))).toBe(`9${NBSP}000${NBSP}000${NBSP}₽`);
  });

  it('amount chip is positive with «Проверить данные» or «Предоставить выписку»', () => {
    expect(amountTone(choice())).toBe('neutral');
    expect(amountTone(choice({ check: true }))).toBe('positive');
    expect(amountTone(choice({ statement: true }))).toBe('positive');
    expect(monthlyPayment(choice({ statement: true }))).toBe(monthlyPayment(choice()));
  });

  it('payment chip: КН green with the package, ОК green with a pledge', () => {
    expect(paymentTone(choice())).toBe('positive');
    expect(paymentTone(choice({ pledge: false }))).toBe('positive');
    expect(paymentTone(choice({ package: false }))).toBe('neutral');
    expect(paymentTone(choice({ product: 'ok', package: false, pledge: true }))).toBe('positive');
    expect(paymentTone(choice({ product: 'ok', package: false, pledge: false }))).toBe('neutral');
  });

  it('«Проверка без опций» only when nothing is on', () => {
    const none = choice({ pledge: false, package: false });
    expect(hasConditions(none)).toBe(false);
    expect(hasConditions({ ...none, package: true })).toBe(true);
    expect(hasConditions({ ...none, statement: true })).toBe(true);
  });
});
