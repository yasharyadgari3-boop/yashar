/** Expected failures carry a stable code and a Persian message that is safe to show to users. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, "validation_error", 422, fields);
  }
}

/** Also used when the viewer may not know the resource exists (404 instead of 403). */
export class NotFoundError extends AppError {
  constructor(message = "موردی پیدا نشد.") {
    super(message, "not_found", 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "اجازه‌ی این کار را ندارید.") {
    super(message, "forbidden", 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "conflict", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید.") {
    super(message, "rate_limited", 429);
  }
}

export type FormResult = { ok?: boolean; message?: string; errors?: Record<string, string> };

/**
 * Turn an error into a form state. Expected errors show their own message; anything else is
 * logged on the server and the user sees a generic message (no internal details).
 */
export function toFormState(error: unknown): FormResult {
  if (error instanceof AppError) return { message: error.message, errors: error.fields };
  console.error("Unexpected error:", error);
  return { message: "مشکلی پیش آمد. لطفاً دوباره تلاش کنید." };
}

/** JSON envelope for route handlers: { error: { code, message, details? } }. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.fields ? { details: error.fields } : {}) } },
      { status: error.statusCode },
    );
  }
  console.error("Unexpected error:", error);
  return Response.json({ error: { code: "internal_error", message: "مشکلی پیش آمد." } }, { status: 500 });
}
