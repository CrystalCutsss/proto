// Shared flow state: the conditions, the tariff and the documents travel across the screens.
// «Закрыть» / «К счету» reset it to the initial values (nothing chosen).
import { BASE_CHOICE, type Choice, type FeeCut, type Tariff } from './calc';

export interface FlowState {
  /** «Залог авто» on #/ (КН) = «Залог авто» on #/conditions (ОК): one flag. */
  pledge: boolean;
  /** «Проверить данные» on #/conditions. */
  check: boolean;
  /** «Предоставить выписку» on #/conditions. */
  statement: boolean;
  /** Selected «Снизить комиссию» cards on #/conditions (replaced, never mutated). */
  feeCuts: readonly FeeCut[];
  /** Tariff chosen on #/tariffs (КН). */
  tariff: Tariff | null;
  /** Exact amount typed into «Сумма» on #/ (КН); null takes the whole limit. */
  requested: number | null;
  /** Both documents uploaded on #/upload. */
  docsUploaded: boolean;
  /** Names of the files chosen in the file field. */
  files: string[];
}

const initial = (): FlowState => ({ ...BASE_CHOICE, docsUploaded: false, files: [] });

export const state: FlowState = initial();

export function resetState(): void {
  Object.assign(state, initial());
}

/** Input of the pure calculations. */
export function choice(): Choice {
  return {
    pledge: state.pledge,
    check: state.check,
    statement: state.statement,
    feeCuts: state.feeCuts,
    tariff: state.tariff,
    requested: state.requested,
  };
}
