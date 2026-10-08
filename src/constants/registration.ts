/**
 * @file src/constants/registration.ts
 * @desc Registration limits and the words for each eligibility refusal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { EligibilityReason } from "@/utils/eligibility";

/** Most registrations one review call may change. */
export const MAX_REVIEW_BATCH = 200;

/** Registrations per page in the host's review table. */
export const REGISTRATIONS_PAGE_SIZE = 50;

/** One sentence per eligibility refusal. */
export const ELIGIBILITY_TEXT: Record<EligibilityReason, string> = {
  unranked: "You need a global rank in this mode.",
  "rank-high": "Your rank is outside this edition's range (rank number too high).",
  "rank-low": "Your rank is outside this edition's range (rank number too low).",
  country: "Your country isn't one this edition accepts.",
  region: "Your region isn't one this edition accepts.",
};
