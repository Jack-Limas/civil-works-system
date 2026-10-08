export class AppError extends Error {
  statusCode: number;
  /** Optional machine-readable fields merged into the error body (e.g. { existingId }). */
  extra?: Record<string, unknown>;

  constructor(statusCode: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
    this.extra = extra;
  }
}
