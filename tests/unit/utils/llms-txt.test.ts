/**
 * @file tests/unit/utils/llms-txt.test.ts
 * @desc /llms.txt: the title and summary, the docs and legal pages from the registry linking
 *       their .md mirrors, the public tournaments with escaped notes, the other haruhime tools,
 *       and no section when there are no tournaments.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { buildLlmsTxt, escapeLinkText } from "@/utils/llms-txt";

const EDITION = {
  name: "EGC 2026",
  lineageSlug: "egc",
  slug: "egc2026",
  lineageName: "Evergreen [Cup]",
  phase: "registration" as const,
  mode: "osu" as const,
};

describe("buildLlmsTxt", () => {
  it("lists docs, legal, tournaments and tools", () => {
    const text = buildLlmsTxt([EDITION]);
    expect(text.startsWith("# ")).toBe(true);
    expect(text).toContain("/docs/playing.md");
    expect(text).toContain("/legal/privacy.md");
    expect(text).toContain("## Tournaments");
    expect(text).toContain("https://tourney.haruhime.moe/egc/egc2026");
    expect(text).toContain("Evergreen \\[Cup\\]");
    expect(text).toContain("https://pools.haruhime.moe/llms.txt");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("leaves Tournaments out when there are none", () => {
    expect(buildLlmsTxt([])).not.toContain("## Tournaments");
  });
});

describe("escapeLinkText", () => {
  it("escapes link markdown and folds whitespace", () => {
    expect(escapeLinkText(" a\n[b](c) <d> ")).toBe("a \\[b\\]\\(c\\) \\<d\\>");
  });
});
