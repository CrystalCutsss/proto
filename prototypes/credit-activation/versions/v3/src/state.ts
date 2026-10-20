// Shared flow state: the choices on #/heavy and #/light and the documents travel across the screens.
// «Закрыть» / «К счету» reset it to the initial values (everything off except the package, owner Q6).
import { BASE_CHOICE, type Choice, type FeeCut } from './calc';

export interface FlowState {
  /** «Оставить в залог авто» on #/heavy. */
  pledge: boolean;
  /** «Проверить данные» on #/heavy. */
  check: boolean;
  /** «Предоставить выписку» on #/heavy. */
  statement: boolean;
  /** «Пакет «Все включено»» on #/light. */
  package: boolean;
  /** Selected «Снизим комиссию» card on #/light (one at a time), null when none. */
  feeCut: FeeCut | null;
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
    package: state.package,
    feeCut: state.feeCut,
  };
}
