export type Result<T> = { ok: true; data: T } | { ok: false; code?: string; message?: string }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<T = never>(message: string, code?: string): Result<T> {
  return { ok: false, message, code }
}
