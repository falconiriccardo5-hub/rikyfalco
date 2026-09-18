/** Error states surfaced in the dashboard (spec §22). */
export const ERROR_CODES = [
  'GENERATION_FAILED',
  'GENERATION_TIMEOUT',
  'QC_FAILED',
  'STORAGE_FAILED',
  'PUBLISH_FAILED',
  'AUTH_FAILED',
  'BUDGET_EXCEEDED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class OrchestratorError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class BudgetExceededError extends OrchestratorError {
  constructor(spent: number, budget: number) {
    super('BUDGET_EXCEEDED', `Budget exceeded: $${spent.toFixed(4)} of $${budget.toFixed(4)}`);
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
