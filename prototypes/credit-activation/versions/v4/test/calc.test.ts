import { describe, expect, it } from 'vitest';
import {
  AMOUNT,
  BASE_CHOICE,
  clampAmount,
  BASE_FEE,
  type Choice,
  fee,
  feeTone,
  formatPaymentChip,
  formatPercent,
  formatPerMonth,
  formatRub,
  formatRubKopecks,
  monthlyPayment,
  paymentTone,
  tariffPayment,
  limitAmount,
  MIN_AMOUNT,
  totalAmount,
} from '../src/calc';
import { parseProduct } from '../src/config';

const NBSP = ' ';
const choice = (over: Partial<Choice> = {}): Choice => ({ ...BASE_CHOICE, ...over });

describe('defaults', () => {
  it('nothing is chosen', () => {
    expect(BASE_CHOICE).toEqual({
      pledge: false,
      check: false,
      statement: false,
      feeCuts: [],
      tariff: null,
      requested: null,
    });
  });

  it('the offer is 4 000 000 ₽, 2,5% and 17 713 ₽ / мес, as the header of #/conditions draws it', () => {
    expect(totalAmount(BASE_CHOICE)).toBe(AMOUNT.initial);
    expect(formatRub(AMOUNT.initial)).toBe(`4${NBSP}000${NBSP}000${NBSP}₽`);
    expect(formatPercent(BASE_FEE)).toBe('2,5%');
    expect(monthlyPayment(BASE_CHOICE)).toBe(17_713.05);
    expect(formatPaymentChip(monthlyPayment(BASE_CHOICE))).toBe(`17${NBSP}713${NBSP}₽${NBSP}/${NBSP}мес`);
  });
});

describe('amount', () => {
  it('the pledge adds 200 000 ₽ («Условия выбраны»: 4 200 000 ₽), the data check 100 000 ₽', () => {
    expect(totalAmount(choice({ pledge: true }))).toBe(4_200_000);
    expect(totalAmount(choice({ check: true }))).toBe(4_100_000);
    expect(totalAmount(choice({ pledge: true, check: true }))).toBe(4_300_000);
  });

  it('the statement and the fee cuts change no amount', () => {
    expect(totalAmount(choice({ statement: true, feeCuts: ['one', 'half'] }))).toBe(AMOUNT.initial);
  });

  it('an exact amount stays within [MIN_AMOUNT, limit] and the payment follows it', () => {
    expect(clampAmount(2_500_000, BASE_CHOICE)).toBe(2_500_000);
    expect(clampAmount(9_000_000, BASE_CHOICE)).toBe(AMOUNT.initial);
    expect(clampAmount(9_000_000, choice({ pledge: true }))).toBe(4_200_000);
    expect(clampAmount(5, BASE_CHOICE)).toBe(MIN_AMOUNT);
    expect(totalAmount(choice({ requested: 2_000_000 }))).toBe(2_000_000);
    expect(limitAmount(choice({ requested: 2_000_000 }))).toBe(AMOUNT.initial);
    expect(monthlyPayment(choice({ requested: 2_000_000 }))).toBe(8_856.53);
  });
});

describe('fee', () => {
  it('the pledge cuts 0,5 pp, the cards 1,0 and 0,5 pp; they add up', () => {
    expect(fee(choice({ pledge: true }))).toBe(2);
    expect(fee(choice({ feeCuts: ['one'] }))).toBe(1.5);
    expect(fee(choice({ feeCuts: ['half'] }))).toBe(2);
    expect(fee(choice({ pledge: true, feeCuts: ['one', 'half'] }))).toBe(0.5);
  });

  it('the fee chip turns positive only when the fee is lowered', () => {
    expect(feeTone(BASE_CHOICE)).toBe('neutral');
    expect(feeTone(choice({ check: true, statement: true }))).toBe('neutral');
    expect(feeTone(choice({ pledge: true }))).toBe('positive');
  });
});

describe('payment', () => {
  it('scales with the amount and with (1 + fee)', () => {
    expect(monthlyPayment(choice({ check: true }))).toBe(18_155.88);
    // 4 200 000 ₽ at 2,0 %: 18 598,70 × 102 / 102,5.
    expect(monthlyPayment(choice({ pledge: true }))).toBe(18_507.98);
    expect(formatRubKopecks(monthlyPayment(choice({ pledge: true })))).toBe(`18${NBSP}507,98${NBSP}₽`);
    expect(monthlyPayment(choice({ feeCuts: ['one'] }))).toBe(17_540.24);
  });

  it('the payment chip turns positive only when the payment goes below the offer', () => {
    expect(paymentTone(BASE_CHOICE)).toBe('neutral');
    expect(paymentTone(choice({ pledge: true }))).toBe('neutral');
    expect(paymentTone(choice({ feeCuts: ['one'] }))).toBe('positive');
    expect(paymentTone(choice({ feeCuts: ['half'] }))).toBe('positive');
    expect(paymentTone(choice({ check: true, feeCuts: ['one'] }))).toBe('neutral');
  });

  it('a КН tariff sets it: 17 713,05 / 33 500 ₽ at the base amount, scaled; «Ваши условия» keeps the formula', () => {
    expect(monthlyPayment(choice({ tariff: 'universal' }))).toBe(17_713.05);
    expect(monthlyPayment(choice({ tariff: 'minimal' }))).toBe(33_500);
    expect(monthlyPayment(choice({ tariff: 'minimal', check: true }))).toBe(34_337.5);
    expect(monthlyPayment(choice({ tariff: 'custom' }))).toBe(17_713.05);
    expect(monthlyPayment(choice({ tariff: 'universal', feeCuts: ['one'] }))).toBe(17_713.05);
    expect(formatPerMonth(tariffPayment('universal'))).toBe(`17${NBSP}713${NBSP}₽/мес`);
    expect(formatPerMonth(tariffPayment('minimal'))).toBe(`33${NBSP}500${NBSP}₽/мес`);
  });
});

describe('product axis', () => {
  it('reads ?product, КН by default and for unknown values', () => {
    expect(parseProduct('')).toBe('kn');
    expect(parseProduct('?product=ok')).toBe('ok');
    expect(parseProduct('?product=kn')).toBe('kn');
    expect(parseProduct('?product=x')).toBe('kn');
  });
});
