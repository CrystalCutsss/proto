// Shared flow state: the chosen amount travels from the offer to the review and success screens.

export const AMOUNT = { min: 4_000_000, max: 9_000_000, step: 100_000, initial: 8_000_000 } as const;

export interface FlowState {
  amount: number;
  /** Index of the selected plan on #/conditions. */
  plan: number;
  /** Option switches on the offer screen. */
  options: boolean[];
  /** Names of the files chosen on #/documents. */
  files: string[];
}

const initial = (): FlowState => ({
  amount: AMOUNT.initial,
  plan: 0,
  options: [false, false, false],
  files: [],
});

export const state: FlowState = initial();

export function resetState(): void {
  Object.assign(state, initial());
}

const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 8000000 → «8 000 000 ₽» with non-breaking spaces. */
export function formatRub(value: number): string {
  return `${money.format(value).replace(/\s/g, '\u00a0')}\u00a0₽`;
}
