/**
 * @file src/lib/mp-fill.ts
 * @desc The guard every mp link fill route shares: 20 fills an hour per account, then the
 *       osu! API budget gate for the calls the fill makes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { userSubject } from "@haruhimemoe/next-kit/server";
import { RATE_LIMITS } from "@/constants/api";
import { getDb } from "@/lib/db";
import { osuBudget } from "@/lib/osu";
import { refuseOverLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/schemas/session-user";

/**
 * @function mpFillGate
 * @param user {SessionUser} the host filling
 * @returns {Promise<Response | (() => Promise<boolean>)>} a 429 past the limit, or the osu!
 *          budget gate to hand the osu! client
 */
export const mpFillGate = async (
  user: SessionUser,
): Promise<Response | (() => Promise<boolean>)> => {
  const limited = await refuseOverLimit(RATE_LIMITS.mpFill, userSubject(user));
  if (limited) return limited;
  return osuBudget(getDb()).gate(userSubject(user));
};
