import { describe, expect, it } from 'vitest';
import {
  AMOUNT,
  amountTone,
  BASE_CHOICE,
  BASE_FEE,
  type Choice,
  type FeeCut,
  fee,
  feeTone,
  formatPaymentChip,
  formatPercent,
  formatRub,
  formatRubKopecks,
  monthlyPayment,
  paymentTone,
  totalAmount,
} from '../src/calc';

const NBSP = ' ';
const choice = (over: Partial<Choice> = {}): Choice => ({ ...BASE_CHOICE, ...over });

describe('defaults', () => {
  it('nothing is selected except the package (owner, Q6)', () => {
    expect(BASE_CHOICE).toEqual({
      pledge: false,
      check: false,
      statement: false,
      package: true,
      feeCuts: [],
    });
  });

  it('#/ shows 4 000 000 ₽, 2,9% and the formula payment at 4 млн (owner, Q1)', () => {
    expect(totalAmount(BASE_CHOICE)).toBe(AMOUNT.initial);
    expect(formatRub(AMOUNT.initial)).toBe(`4${NBSP}000${NBSP}000${NBSP}₽`);
    expect(formatPercent(BASE_FEE)).toBe('2,9%');
    expect(monthlyPayment(BASE_CHOICE)).toBe(10_121.74);
    expect(formatRub(monthlyPayment(BASE_CHOICE))).toBe(`10${NBSP}122${NBSP}₽`);
  });
});

describe('total amount', () => {
  it('pledge adds 3 000 000 ₽, «Проверить данные» 2 000 000 ₽, the statement nothing', () => {
    expect(totalAmount(choice({ pledge: true }))).toBe(7_000_000);
    expect(totalAmount(choice({ check: true }))).toBe(6_000_000);
    expect(totalAmount(choice({ pledge: true, check: true }))).toBe(9_000_000);
    expect(totalAmount(choice({ statement: true }))).toBe(AMOUNT.initial);
    expect(formatRub(totalAmount(choice({ pledge: true, check: true })))).toBe(
      `9${NBSP}000${NBSP}000${NBSP}₽`,
    );
  });

  it('options on #/light change no amount', () => {
    for (const feeCuts of [[], ['one'], ['half'], ['one', 'half']] as FeeCut[][]) {
      for (const pkg of [true, false]) {
        expect(totalAmount(choice({ pledge: true, feeCuts, package: pkg }))).toBe(7_000_000);
      }
    }
  });
});

describe('monthly payment', () => {
  it('is 17 713,05 ₽ at 7 000 000 ₽ (pledge only), whatever the statement and the fee cards', () => {
    for (const statement of [true, false]) {
      for (const feeCuts of [[], ['one'], ['half'], ['one', 'half']] as FeeCut[][]) {
        expect(monthlyPayment(choice({ pledge: true, statement, feeCuts }))).toBe(17_713.05);
      }
    }
    const c = choice({ pledge: true });
    expect(formatRubKopecks(monthlyPayment(c))).toBe(`17${NBSP}713,05${NBSP}₽`);
    expect(formatPaymentChip(monthlyPayment(c))).toBe(`17${NBSP}713${NBSP}₽${NBSP}/${NBSP}мес`);
  });

  it('follows the total amount', () => {
    expect(monthlyPayment(choice({ check: true }))).toBe(15_182.61);
    expect(monthlyPayment(choice({ pledge: true, check: true }))).toBe(22_773.92);
  });

  it('turning the package off raises it by 15 %', () => {
    expect(monthlyPayment(choice({ pledge: true, package: false }))).toBe(20_370.01);
    for (const over of [{}, { check: true }, { pledge: true, check: true }]) {
      const on = monthlyPayment(choice(over));
      expect(monthlyPayment(choice({ ...over, package: false }))).toBeCloseTo(on * 1.15, 1);
    }
  });
});

describe('fee', () => {
  it('base 2,9 %, pledge 2,5 %, «Снизим комиссию» −1 and/or −0,5 pp', () => {
    expect(fee(choice())).toBe(2.9);
    expect(fee(choice({ pledge: true }))).toBe(2.5);
    expect(fee(choice({ feeCuts: ['one'] }))).toBe(1.9);
    expect(fee(choice({ feeCuts: ['half'] }))).toBe(2.4);
    expect(fee(choice({ pledge: true, feeCuts: ['one'] }))).toBe(1.5);
    expect(fee(choice({ pledge: true, feeCuts: ['half'] }))).toBe(2.0);
    expect(formatPercent(fee(choice({ pledge: true, feeCuts: ['half'] })))).toBe('2,0%');
    expect(formatPercent(fee(choice({ pledge: true })))).toBe('2,5%');
  });

  it('both «Снизим комиссию» cards add up: −1,5 pp (owner, 2026-10-20)', () => {
    expect(fee(choice({ feeCuts: ['one', 'half'] }))).toBe(1.4);
    expect(fee(choice({ pledge: true, feeCuts: ['half', 'one'] }))).toBe(1.0);
    expect(formatPercent(fee(choice({ pledge: true, feeCuts: ['one', 'half'] })))).toBe('1,0%');
  });

  it('the other options change no fee', () => {
    expect(fee(choice({ check: true, statement: true, package: false }))).toBe(BASE_FEE);
  });
});

describe('chip tones', () => {
  it('amount: positive above 4 000 000 ₽ or with «Предоставить выписку»', () => {
    expect(amountTone(choice())).toBe('neutral');
    expect(amountTone(choice({ pledge: true }))).toBe('positive');
    expect(amountTone(choice({ check: true }))).toBe('positive');
    expect(amountTone(choice({ statement: true }))).toBe('positive');
    expect(amountTone(choice({ feeCuts: ['one'], package: false }))).toBe('neutral');
  });

  it('payment: positive only on #/light while the package is on (owner, Q2)', () => {
    expect(paymentTone(choice(), 'light')).toBe('positive');
    expect(paymentTone(choice({ package: false }), 'light')).toBe('neutral');
    expect(paymentTone(choice(), 'heavy')).toBe('neutral');
    expect(paymentTone(choice({ pledge: true }), 'heavy')).toBe('neutral');
  });

  it('fee: positive below 2,9 %', () => {
    expect(feeTone(choice())).toBe('neutral');
    expect(feeTone(choice({ pledge: true }))).toBe('positive');
    expect(feeTone(choice({ feeCuts: ['half'] }))).toBe('positive');
    expect(feeTone(choice({ check: true, statement: true }))).toBe('neutral');
  });

  it('drawn #/heavy (pledge on) and #/light (package + «До −0,5%», pledge on) states', () => {
    const heavyDrawn = choice({ pledge: true });
    expect([amountTone(heavyDrawn), paymentTone(heavyDrawn, 'heavy'), feeTone(heavyDrawn)]).toEqual([
      'positive',
      'neutral',
      'positive',
    ]);
    const lightDrawn = choice({ feeCuts: ['half'] });
    expect([amountTone(lightDrawn), paymentTone(lightDrawn, 'light'), feeTone(lightDrawn)]).toEqual([
      'neutral',
      'positive',
      'positive',
    ]);
  });
});
