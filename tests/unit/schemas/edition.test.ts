/**
 * @file tests/unit/schemas/edition.test.ts
 * @desc The edition fixture parses, 31 questions are refused, a rank range must be in order, an
 *       end date before a start date is refused on ["dates","end"], and an old row missing the
 *       social/contact/hue fields still parses with their defaults.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
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
  it("refuses an end date before the start date, on dates.end", () => {
    const dates = { start: "2026-06-10T00:00:00.000Z", end: "2026-06-01T00:00:00.000Z" };
    const parsed = EditionSchema.safeParse(makeEdition({ dates }));
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["dates", "end"] })]),
      );
  });
  it("allows dates with only one side set, or end on or after start", () => {
    expect(
      EditionSchema.safeParse(
        makeEdition({ dates: { start: "2026-06-10T00:00:00.000Z", end: null } }),
      ).success,
    ).toBe(true);
    expect(
      EditionSchema.safeParse(
        makeEdition({
          dates: { start: "2026-06-10T00:00:00.000Z", end: "2026-06-10T00:00:00.000Z" },
        }),
      ).success,
    ).toBe(true);
  });
  it("parses an old row with no acronym, bannerUrl, hue, socials or contact", () => {
    const old = makeEdition() as Record<string, unknown>;
    delete old.acronym;
    delete old.bannerUrl;
    delete old.hue;
    delete old.socials;
    delete old.contact;
    const parsed = EditionSchema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.acronym).toBeNull();
      expect(parsed.data.bannerUrl).toBeNull();
      expect(parsed.data.hue).toBeNull();
      expect(parsed.data.socials).toEqual([]);
      expect(parsed.data.contact).toEqual({ email: null, discord: null });
    }
  });
});
