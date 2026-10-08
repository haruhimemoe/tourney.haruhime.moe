/**
 * @file tests/unit/schemas/edition.test.ts
 * @desc The edition fixture parses, 31 questions are refused, and a rank range must be in order.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { EditionSchema } from "@/schemas/edition";
import { makeEdition } from "../../helpers/records";

describe("EditionSchema", () => {
  it("parses the fixture", () => expect(EditionSchema.safeParse(makeEdition()).success).toBe(true));
  it("refuses 31 questions", () => {
    const q = { id: "q", type: "text" as const, label: "x", help: "", required: false };
    const questions = Array.from({ length: 31 }, (_, i) => ({ ...q, id: `q${i}` }));
    expect(EditionSchema.safeParse(makeEdition({ questions })).success).toBe(false);
  });
  it("refuses a rank range upside down", () => {
    const eligibility = { rank: { min: 500, max: 100 }, countries: null, regions: null };
    expect(EditionSchema.safeParse(makeEdition({ eligibility })).success).toBe(false);
  });
});
