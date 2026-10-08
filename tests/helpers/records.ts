/**
 * @file tests/helpers/records.ts
 * @desc Valid stored rows to build tests from: a lineage and a solo 1v1 edition in setup.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { Edition } from "@/schemas/edition";
import type { Lineage } from "@/schemas/lineage";
import type { StoredRegistration } from "@/schemas/registration";

/** A fixed instant every record uses. */
export const T0 = "2026-10-07T00:00:00.000Z";

/**
 * @function makeLineage
 * @param overrides {Partial<Lineage>} fields to change
 * @returns {Lineage} a valid lineage owned by user "u1"
 */
export const makeLineage = (overrides: Partial<Lineage> = {}): Lineage => ({
  id: "l1",
  slug: "egc",
  name: "Evergreen Cup",
  description: "",
  members: [{ userId: "u1", role: "owner" }],
  orphaned: false,
  defaults: {
    mode: "osu",
    sides: { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 },
    rulesText: "",
  },
  createdAt: T0,
  updatedAt: T0,
  ...overrides,
});

/**
 * @function makeEdition
 * @param overrides {Partial<Edition>} fields to change
 * @returns {Edition} a valid solo 1v1 edition in setup, with no registration window
 */
export const makeEdition = (overrides: Partial<Edition> = {}): Edition => ({
  id: "e1",
  lineageId: "l1",
  name: "Evergreen Cup 2026",
  code: "EGC2026",
  slug: "egc2026",
  year: 2026,
  mode: "osu",
  phase: "setup",
  sides: { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 },
  registration: { opensAt: null, closesAt: null, playerCap: null, staffCap: null },
  dates: { start: null, end: null },
  rulesText: "",
  siteMode: "auto",
  qualifiers: { enabled: false, method: "sum" },
  bracket: null,
  eligibility: { rank: null, countries: null, regions: null },
  questions: [],
  pickBanRules: null,
  archived: false,
  createdAt: T0,
  updatedAt: T0,
  ...overrides,
});

/**
 * @function makeRegistration
 * @param overrides {Partial<StoredRegistration>} fields to change
 * @returns {StoredRegistration} a pending solo player registration for edition "e1", osu! id 1001
 */
export const makeRegistration = (
  overrides: Partial<StoredRegistration> = {},
): StoredRegistration => ({
  id: "r1",
  editionId: "e1",
  userId: "u1001",
  osuId: 1001,
  kind: "player",
  status: "pending",
  appliedRoles: [],
  approvedRoles: [],
  availability: null,
  answers: {},
  snapshot: { rank: 5000, country: "US", username: "ranked", takenAt: T0 },
  team: null,
  reviewNote: null,
  createdAt: T0,
  ...overrides,
});
