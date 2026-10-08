/**
 * @file src/constants/api.ts
 * @desc Rate limits, counted in rate_limits (src/lib/rate-limit.ts): per user on manage
 *       writes, and the osu! API budget (a global window and each caller's share). Later plans
 *       add registration and mp-fill limits here.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

/** A fixed-window limit: its scope, how many hits, and the window in seconds. */
export type RateLimitRule = { scope: string; limit: number; windowSeconds: number };

/** Every rate limit tourney counts, per IP or per account. */
export const RATE_LIMITS = {
  /** Every /api/manage write, per user. */
  manageWrite: { scope: "manage-write", limit: 120, windowSeconds: 60 },
  /** Registration submits per IP (an IPv6 address by its /64), signed in or not. */
  registerIp: { scope: "register-ip", limit: 10, windowSeconds: 3600 },
  /** Registration submits per account. */
  registerUser: { scope: "register-user", limit: 5, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

/** osu! API calls across every instance: 50 a minute. */
export const OSU_API_BUDGET = {
  scope: "osu-api",
  subject: "global",
  limit: 50,
  windowSeconds: 60,
} as const;

/** Each caller's share of those calls (an IP, IPv6 by its /64, or an account). */
export const OSU_API_BUDGET_PER_SUBJECT = {
  scope: "osu-api-subject",
  limit: 20,
  windowSeconds: 60,
} as const;
