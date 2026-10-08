/**
 * @file tests/helpers/inputs.ts
 * @desc Valid create inputs for services: a 2v2 team lineage and its 2026 edition.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

/** A 2v2 team lineage. */
export const LINEAGE_INPUT = {
  slug: "evergreen-cup",
  name: "Evergreen Cup",
  description: "",
  defaults: {
    mode: "osu",
    sides: { kind: "team", lineup: 2, rosterMin: 2, rosterMax: 4, subsMax: 2 },
    rulesText: "",
  },
} as const;

/** Its 2026 edition. */
export const EDITION_INPUT = {
  name: "Evergreen Cup 2026",
  code: "EGC2026",
  mode: "osu",
  sides: LINEAGE_INPUT.defaults.sides,
  year: 2026,
  dates: { start: null, end: null },
} as const;
