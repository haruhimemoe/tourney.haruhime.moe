/**
 * @file tests/unit/schemas/edition.test.ts
 * @desc The edition fixture parses, 31 questions are refused, a rank range must be in order, and
 *       an old row missing the social/contact/hue fields still parses with their defaults.
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
