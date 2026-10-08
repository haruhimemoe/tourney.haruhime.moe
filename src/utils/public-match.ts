/**
 * @file src/utils/public-match.ts
 * @desc Lookups over a public edition payload: a match by its code (null for an unknown code, a
 *       bye or a cancelled match, so the page answers 404) and team names by id.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { Bracket } from "@haruhimemoe/tourney";
import type { PublicMatch, PublicTeam } from "@/services/public-view";

/**
 * @function findPublicMatch
 * @param payload {{ bracket: Pick<Bracket, "matches"> | null; matches: PublicMatch[] }} the payload
 * @param code {string} the match code in the URL
 * @returns {PublicMatch | null} the match, or null
 */
export const findPublicMatch = (
  payload: { bracket: Pick<Bracket, "matches"> | null; matches: readonly PublicMatch[] },
  code: string,
): PublicMatch | null => {
  if (payload.bracket?.matches.find((m) => m.code === code)?.status === "bye") return null;
  const match = payload.matches.find((m) => m.bracketCode === code);
  return match && match.status !== "cancelled" ? match : null;
};

/**
 * @function teamNames
 * @param teams {readonly PublicTeam[]} the teams
 * @returns {Record<string, string>} each team's name by id
 */
export const teamNames = (teams: readonly PublicTeam[]): Record<string, string> =>
  Object.fromEntries(teams.map((t) => [t.id, t.name]));
