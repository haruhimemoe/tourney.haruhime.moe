/**
 * @file src/constants/errors.ts
 * @desc One plain sentence per error code, the library's and the app's (hyphenated like the
 *       library's), and the JSON error response every route sends. The `satisfies` makes a code
 *       without a message a type error.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { TourneyErrorCode } from "@haruhimemoe/tourney";

/** Errors the app adds on top of the library's. */
export type AppErrorCode =
  | "slug-taken"
  | "slug-reserved"
  | "edition-limit"
  | "forbidden"
  | "owns-active-edition"
  | "osu-user-unavailable"
  | "osu-unavailable";

/** Every error code a service can return. */
export type ErrorCode = TourneyErrorCode | AppErrorCode;

/** One human sentence per error code. */
export const ERROR_MESSAGES = {
  "bad-input": "Something in that form isn't right. Check it and try again.",
  "bad-state": "The tournament isn't at the right stage for that.",
  "bad-side": "That player or team isn't in this match.",
  "bad-score": "That score doesn't fit the match's best-of.",
  "bad-slot": "That map isn't in the round's pool.",
  "out-of-order": "That has to wait until an earlier step is done or undone.",
  limit: "That's over the limit for this tournament.",
  "not-found": "That doesn't exist, or it was removed.",
  closed: "Registration is closed.",
  "slug-taken": "That address is taken. Pick another.",
  "slug-reserved": "That address is reserved. Pick another.",
  "edition-limit":
    "You already run an active edition. Finish it first, or ask to become a verified host.",
  forbidden: "You can't change this tournament.",
  "owns-active-edition":
    "You own a lineage with an edition still running. Finish it or transfer the lineage first.",
  "osu-user-unavailable": "osu! has no account by that id. It may be restricted or deleted.",
  "osu-unavailable":
    "osu! isn't answering right now. Nothing was saved. Try again in a few minutes.",
} as const satisfies Record<ErrorCode, string>;

const FALLBACK = "Something went wrong. Try again.";

/**
 * @function errorMessage
 * @param code {string} an error code
 * @returns {string} its message, or a generic one
 */
export const errorMessage = (code: string): string =>
  (ERROR_MESSAGES as Record<string, string>)[code] ?? FALLBACK;

/** HTTP status per code; everything else is 422. */
const STATUS: Partial<Record<ErrorCode, number>> = {
  "not-found": 404,
  forbidden: 403,
  "slug-taken": 409,
  "edition-limit": 409,
  "osu-unavailable": 503,
};

/**
 * @function errorStatus
 * @param code {string} an error code
 * @returns {number} the HTTP status a route answers it with
 */
export const errorStatus = (code: string): number => STATUS[code as ErrorCode] ?? 422;

/**
 * @function errorResponse
 * @param error {{ code: string }} the error
 * @param status {number} HTTP status, errorStatus's by default
 * @returns {Response} JSON `{ error: { code, message } }`
 */
export const errorResponse = (
  error: { code: string },
  status = errorStatus(error.code),
): Response =>
  Response.json({ error: { code: error.code, message: errorMessage(error.code) } }, { status });
