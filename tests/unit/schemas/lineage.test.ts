/**
 * @file tests/unit/schemas/lineage.test.ts
 * @desc Lineage slugs (length, characters, dashes, reserved route names) and edition slugs from codes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { editionSlug } from "@/schemas/edition";
import { LINEAGE_SLUG, LineageSchema, RESERVED_SLUGS } from "@/schemas/lineage";
import { makeLineage } from "../../helpers/records";

describe("slugs", () => {
  it.each(["egc", "evergreen-cup", "a1b"])("accepts %s", (s) =>
    expect(LINEAGE_SLUG.test(s)).toBe(true),
  );
  it.each(["ab", "-egc", "egc-", "EGC", "e_c", "a".repeat(41)])("refuses %s", (s) =>
    expect(LINEAGE_SLUG.test(s)).toBe(false),
  );
  it("reserves route names", () => {
    for (const s of ["manage", "api", "embed", "v1", "browse"])
      expect(RESERVED_SLUGS.has(s)).toBe(true);
  });
  it.each([
    ["EGC2026", "egc2026"],
    ["EGC 2026", "egc-2026"],
    ["egc_26!", "egc-26"],
    [" -EGC  26- ", "egc-26"],
  ])("edition %s", (code, slug) => expect(editionSlug(code)).toBe(slug));
  it("parses the fixture lineage", () =>
    expect(LineageSchema.safeParse(makeLineage()).success).toBe(true));
});
