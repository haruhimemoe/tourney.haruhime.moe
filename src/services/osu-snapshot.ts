/**
 * @file src/services/osu-snapshot.ts
 * @desc A registrant's rank, country and username from osu!, taken once at submit and never
 *       refreshed in v0. A missing account (restricted and deleted both answer 404) and an osu!
 *       outage are separate refusals; an outage saves nothing.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import type { MODES } from "@haruhimemoe/tourney";
import { getOsuClient } from "@/lib/osu";
import { type AppResult, fail, ok } from "@/utils/result";

/** What a registration keeps from osu!. */
export interface OsuSnapshot {
  rank: number | null;
  country: string | null;
  username: string;
  takenAt: string;
}

/**
 * @function takeSnapshot
 * @param osuId {number} the player's osu! id
 * @param mode {(typeof MODES)[number]} the edition's mode (its statistics are read)
 * @param now {Date} when the snapshot is taken
 * @param beforeCall {() => Promise<boolean>} the osu! budget's gate, when the caller has one
 * @returns {Promise<AppResult<OsuSnapshot>>} the snapshot, or osu-user-unavailable / osu-unavailable
 */
export const takeSnapshot = async (
  osuId: number,
  mode: (typeof MODES)[number],
  now = new Date(),
  beforeCall?: () => Promise<boolean>,
): Promise<AppResult<OsuSnapshot>> => {
  try {
    const profile = await getOsuClient().getUserProfile(osuId, { ruleset: mode, beforeCall });
    if (!profile) return fail("osu-user-unavailable");
    return ok({
      rank: profile.statistics.globalRank,
      country: profile.countryCode,
      username: profile.username,
      takenAt: now.toISOString(),
    });
  } catch {
    return fail("osu-unavailable");
  }
};
