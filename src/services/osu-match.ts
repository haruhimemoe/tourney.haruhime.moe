/**
 * @file src/services/osu-match.ts
 * @desc Reading a multiplayer match from an mp link a host pastes: the link parsed by
 *       @haruhimemoe/osu's parseMatchId, the match read with the osu! client through the caller's
 *       budget. Never throws.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { type OsuMatch, parseMatchId } from "@haruhimemoe/osu/shapes";
import { getOsuClient } from "@/lib/osu";
import { type AppResult, fail, ok } from "@/utils/result";

/**
 * @function fetchMatch
 * @param mpLink {string} an mp link or match id
 * @param beforeCall {() => Promise<boolean>} the osu! budget gate
 * @returns {Promise<AppResult<OsuMatch>>} the match; bad-input for a link that isn't one,
 *          not-found when osu! has no such match, osu-unavailable when osu! fails
 */
export const fetchMatch = async (
  mpLink: string,
  beforeCall?: () => Promise<boolean>,
): Promise<AppResult<OsuMatch>> => {
  const id = parseMatchId(mpLink.trim());
  if (id === null) return fail("bad-input", "That isn't an osu! match link.");
  try {
    const found = await getOsuClient().getMatch(id, { beforeCall });
    if (!found) return fail("not-found", "osu! has no match at that link.");
    return ok(found.match);
  } catch {
    return fail("osu-unavailable");
  }
};
