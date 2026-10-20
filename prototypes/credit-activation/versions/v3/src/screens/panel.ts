// Chips of the sticky panel on #/heavy and #/light (amount, payment, fee), recalculated on every toggle.
import {
  amountTone,
  fee,
  feeTone,
  formatPaymentChip,
  formatPercent,
  formatRub,
  monthlyPayment,
  type Panel,
  paymentTone,
  totalAmount,
} from '../calc';
import { chip, setCardChecked, setChip } from '../components';
import { choice } from '../state';

export function chips(panel: Panel): string {
  const c = choice();
  return [
    chip('amount', 'rub', formatRub(totalAmount(c)), amountTone(c)),
    chip('payment', 'arrow', formatPaymentChip(monthlyPayment(c)), paymentTone(c, panel)),
    chip('fee', 'percent', formatPercent(fee(c)), feeTone(c)),
  ].join('');
}

export function renderChips(root: HTMLElement, panel: Panel): void {
  const c = choice();
  setChip(root, 'amount', formatRub(totalAmount(c)), amountTone(c));
  setChip(root, 'payment', formatPaymentChip(monthlyPayment(c)), paymentTone(c, panel));
  setChip(root, 'fee', formatPercent(fee(c)), feeTone(c));
}

/** Reflect `isOn(choice)` on every card control of the page. */
export function renderCards(root: HTMLElement, isOn: (key: string) => boolean): void {
  root.querySelectorAll<HTMLElement>('.card-large__control').forEach((control) => {
    setCardChecked(control, isOn(control.dataset.choice!));
  });
}
