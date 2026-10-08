/**
 * @file src/utils/result.ts
 * @desc The app's Result: the library's shape with the app's error codes added, and ok and fail
 *       to build one (the library exports only the types). A library Result is an AppResult.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { type ErrorCode, errorMessage } from "@/constants/errors";

/** A refusal: a code to switch on and a message for people. */
export type AppError = { code: ErrorCode; message: string };

/** Either the value or the reason it was refused. */
export type AppResult<T> = { ok: true; value: T } | { ok: false; error: AppError };

/**
 * @function ok
 * @param value {T} the result
 * @returns {{ ok: true; value: T }} a success
 */
export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });

/**
 * @function fail
 * @param code {ErrorCode} why
 * @param message {string} for people; the code's message from the error map when left out
 * @returns {{ ok: false; error: AppError }} a refusal
 */
export const fail = (code: ErrorCode, message?: string): { ok: false; error: AppError } => ({
  ok: false,
  error: { code, message: message ?? errorMessage(code) },
});
