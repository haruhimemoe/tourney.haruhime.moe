/**
 * @file tests/unit/utils/eligibility.test.ts
 * @desc checkEligibility: rank range, unranked, countries, regions, every reason listed.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { checkEligibility } from "@/utils/eligibility";

const open = { rank: null, countries: null, regions: null };
const snap = { rank: 5000, country: "US" };

describe("checkEligibility", () => {
  it("passes with no rules", () => expect(checkEligibility(open, snap)).toEqual({ ok: true }));
  it("checks rank range inclusive", () => {
    expect(checkEligibility({ ...open, rank: { min: 5000, max: 10000 } }, snap).ok).toBe(true);
    expect(checkEligibility({ ...open, rank: { min: 1, max: 4999 } }, snap)).toEqual({
      ok: false,
      reasons: ["rank-high"],
    });
    expect(checkEligibility({ ...open, rank: { min: 5001, max: 10000 } }, snap)).toEqual({
      ok: false,
      reasons: ["rank-low"],
    });
  });
  it("treats unranked as refused when a rank rule exists", () =>
    expect(
      checkEligibility({ ...open, rank: { min: 1, max: 10 } }, { ...snap, rank: null }),
    ).toEqual({ ok: false, reasons: ["unranked"] }));
  it("checks countries", () =>
    expect(checkEligibility({ ...open, countries: ["CA"] }, snap)).toEqual({
      ok: false,
      reasons: ["country"],
    }));
  it("checks regions by continent id", () => {
    expect(checkEligibility({ ...open, regions: ["NA"] }, snap).ok).toBe(true);
    expect(checkEligibility({ ...open, regions: ["EU"] }, snap)).toEqual({
      ok: false,
      reasons: ["region"],
    });
    expect(checkEligibility({ ...open, regions: ["EU"] }, { ...snap, country: null })).toEqual({
      ok: false,
      reasons: ["region"],
    });
  });
  it("lists every failed reason", () =>
    expect(
      checkEligibility({ ...open, rank: { min: 1, max: 10 }, countries: ["CA"] }, snap),
    ).toEqual({ ok: false, reasons: ["rank-high", "country"] }));
});
