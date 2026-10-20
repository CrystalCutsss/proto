// Shared flow state: slider, pledge, options and documents travel across the screens. «Закрыть» / «К счету»
// reset it to the initial values of the current variant (config).
import { AMOUNT, type Choice } from './calc';
import { config, type Config } from './config';

export type Pledge = 'auto' | 'realty';

export interface FlowState {
  /** Slider value on #/. */
  slider: number;
  /** Last slider value below 7 000 000 ₽; a pledge tap-off returns the slider to it. */
  sliderBelow: number;
  /** What the last pledge tap-on added to the slider (0 when a drag switched the pledge on). */
  pledgeAdded: number;
  /** Selected pledge card (one at a time), null when off. */
  pledge: Pledge | null;
  /** Options on #/options. */
  options: { package: boolean; check: boolean; turnover: boolean; statement: boolean };
  /** Both documents uploaded on #/upload (2 дока). */
  docsUploaded: boolean;
  /** Names of the files chosen in the file field. */
  files: string[];
}

/** Pledge cards of the variant in screen order (2 залога: realty first). */
export function pledgeCards(variant: Config['pledge'] = config.pledge): Pledge[] {
  return variant === 'both' ? ['realty', 'auto'] : [variant];
}

const initial = (): FlowState => ({
  slider: AMOUNT.initial,
  sliderBelow: AMOUNT.initial,
  pledgeAdded: 0,
  pledge: null,
  options: { package: config.product === 'kn', check: false, turnover: false, statement: false },
  docsUploaded: false,
  files: [],
});

export const state: FlowState = initial();

export function resetState(): void {
  Object.assign(state, initial());
}

/** Input of the pure calculations. */
export function choice(): Choice {
  return {
    product: config.product,
    slider: state.slider,
    pledge: state.pledge !== null,
    package: config.product === 'kn' && state.options.package,
    check: state.options.check,
    turnover: state.options.turnover,
    statement: state.options.statement,
  };
}
