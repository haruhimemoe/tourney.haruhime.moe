/**
 * @file tests/unit/utils/edition-meta.test.ts
 * @desc Public edition titles and descriptions: "<name> · tourney.haruhime.moe" (the site's suffix) for the overview, the tab
 *       first on other tabs, a description within 160 characters.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { describe, expect, it } from "vitest";
import { SEO_SITE } from "@/constants/seo";
import { editionMeta } from "@/utils/edition-meta";

const EDITION = { name: "EGC 2026", mode: "osu" as const, phase: "bracket" as const };

describe("editionMeta", () => {
  it("titles the overview with the edition name", () => {
    const meta = pageMetadata(SEO_SITE, editionMeta("egc", "egc2026", EDITION, "Evergreen Cup"));
    expect(meta.title).toEqual({ absolute: "EGC 2026 · tourney.haruhime.moe" });
    expect(meta.alternates?.canonical).toContain("/egc/egc2026");
  });

  it("puts the tab first on other tabs", () => {
    expect(editionMeta("egc", "egc2026", EDITION, "Evergreen Cup", "Bracket")).toMatchObject({
      title: "Bracket · EGC 2026",
      path: "/egc/egc2026/bracket",
    });
  });

  it("describes the edition in 160 characters or fewer", () => {
    const { description } = editionMeta(
      "egc",
      "egc2026",
      { ...EDITION, name: "x".repeat(128) },
      "y".repeat(80),
    );
    expect(description.length).toBeLessThanOrEqual(160);
    expect(editionMeta("egc", "egc2026", EDITION, "Evergreen Cup").description).toContain(
      "Evergreen Cup",
    );
  });
});
