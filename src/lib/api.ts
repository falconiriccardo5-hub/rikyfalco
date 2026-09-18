import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError, OrchestratorError } from './errors';
import { logger } from './logger';

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/** One error shape for every route, with secrets kept out of the body. */
export function fail(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request body is invalid.',
          issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: { code: 'HTTP_ERROR', message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof OrchestratorError) {
    const status = error.code === 'AUTH_FAILED' ? 401 : error.code === 'BUDGET_EXCEEDED' ? 409 : 500;
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status },
    );
  }

  logger.error('Unhandled API error', { error: (error as Error).message });
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } },
    { status: 500 },
  );
}
