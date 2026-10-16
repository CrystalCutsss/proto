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
  it('КН reference state (7 млн, pledge on, package on) gives 17 713,05 ₽', () => {
    expect(monthlyPayment(choice())).toBe(17_713.05);
    expect(formatRubKopecks(monthlyPayment(choice()))).toBe(`17${NBSP}713,05${NBSP}₽`);
  });

  it('ОК at 7 млн gives 17 713,05 ₽ with any pledge and options', () => {
    for (const pledge of [true, false]) {
      for (const turnover of [true, false]) {
        expect(monthlyPayment(choice({ product: 'ok', pledge, turnover, package: false }))).toBe(17_713.05);
      }
    }
  });

  it('turning the КН package off raises the payment', () => {
    expect(monthlyPayment(choice({ package: false }))).toBeGreaterThan(monthlyPayment(choice()));
  });

  it('КН pledge and turnover lower the payment', () => {
    expect(monthlyPayment(choice({ pledge: false }))).toBeGreaterThan(monthlyPayment(choice()));
    expect(monthlyPayment(choice({ turnover: true }))).toBeLessThan(monthlyPayment(choice()));
  });

  it('«Проверить данные» raises the amount and the payment', () => {
    expect(monthlyPayment(choice({ check: true }))).toBeGreaterThan(monthlyPayment(choice()));
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

  it('tapping a card moves the slider to 7 млн and back by the bonus, not below the minimum', () => {
    expect(sliderAfterPledgeTap(AMOUNT.initial, true)).toBe(7_000_000);
    expect(sliderAfterPledgeTap(5_500_000, true)).toBe(7_000_000);
    expect(sliderAfterPledgeTap(7_000_000, false)).toBe(4_000_000);
    expect(sliderAfterPledgeTap(9_000_000, false)).toBe(6_000_000);
    expect(sliderAfterPledgeTap(7_000_000, false)).toBeGreaterThanOrEqual(AMOUNT.min);
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

  it('payment chip follows the КН package; ОК stays neutral', () => {
    expect(paymentTone(choice())).toBe('positive');
    expect(paymentTone(choice({ package: false }))).toBe('neutral');
    expect(paymentTone(choice({ product: 'ok', package: false }))).toBe('neutral');
  });

  it('«Проверка без опций» only when nothing is on', () => {
    const none = choice({ pledge: false, package: false });
    expect(hasConditions(none)).toBe(false);
    expect(hasConditions({ ...none, package: true })).toBe(true);
    expect(hasConditions({ ...none, statement: true })).toBe(true);
  });
});
