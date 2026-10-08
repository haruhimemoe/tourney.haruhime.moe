/**
 * @file src/utils/side-format.ts
 * @desc Short labels for an edition's side rules and rank range: "1v1", "2v2", "#1,000 to #50,000".
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { SideRules } from "@haruhimemoe/tourney";

/**
 * @function sidesLabel
 * @param sides {SideRules} the side rules
 * @returns {string} "1v1" for solo, else "<lineup>v<lineup>"
 */
export const sidesLabel = (sides: SideRules): string =>
  sides.kind === "solo" ? "1v1" : `${sides.lineup}v${sides.lineup}`;

/**
 * @function rankLabel
 * @param rank {{ min: number; max: number } | null} the rank range
 * @returns {string} like "#1,000 to #50,000", or "Any rank"
 */
export const rankLabel = (rank: { min: number; max: number } | null): string =>
  rank
    ? `#${rank.min.toLocaleString("en-US")} to #${rank.max.toLocaleString("en-US")}`
    : "Any rank";
