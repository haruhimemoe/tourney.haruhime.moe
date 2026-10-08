/**
 * @file src/utils/eligibility.ts
 * @desc Checks a player's osu! snapshot against an edition's eligibility rules. Every failed
 *       rule is listed, in the order rank, country, region. BWS is out of v0.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { regionOfCountry } from "@haruhimemoe/time/region";
import type { Eligibility } from "@/schemas/edition";

/** Why a player isn't eligible. rank-high: the rank number is above max; rank-low: below min. */
export type EligibilityReason = "unranked" | "rank-high" | "rank-low" | "country" | "region";

/** The snapshot fields eligibility reads. */
export interface EligibilitySnapshot {
  rank: number | null;
  country: string | null;
}

/**
 * @function checkEligibility
 * @param rules {Eligibility} the edition's rules (null fields are open)
 * @param snapshot {EligibilitySnapshot} the player's rank and country
 * @returns {{ ok: true } | { ok: false; reasons: EligibilityReason[] }} every failed rule
 */
export const checkEligibility = (
  rules: Eligibility,
  snapshot: EligibilitySnapshot,
): { ok: true } | { ok: false; reasons: EligibilityReason[] } => {
  const reasons: EligibilityReason[] = [];
  if (rules.rank) {
    if (snapshot.rank === null) reasons.push("unranked");
    else if (snapshot.rank > rules.rank.max) reasons.push("rank-high");
    else if (snapshot.rank < rules.rank.min) reasons.push("rank-low");
  }
  if (rules.countries && !(snapshot.country && rules.countries.includes(snapshot.country))) {
    reasons.push("country");
  }
  if (rules.regions) {
    const region = regionOfCountry(snapshot.country);
    if (!(region && rules.regions.includes(region.id))) reasons.push("region");
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
};
