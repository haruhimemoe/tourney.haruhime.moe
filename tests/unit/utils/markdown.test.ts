/**
 * @file tests/unit/utils/markdown.test.ts
 * @desc The host rules Markdown subset: headings, lists, paragraphs with line breaks, bold,
 *       italic, code and https links; HTML stays text, and a javascript: or http: link stays
 *       its source text.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "@/utils/markdown";

describe("parseMarkdown", () => {
  it("reads headings, lists and paragraphs with line breaks", () => {
    expect(parseMarkdown("# Rules\n\nline one\nline two\n\n- a\n- b\n### Small")).toEqual([
      { kind: "heading", level: 1, content: [{ kind: "text", text: "Rules" }] },
      {
        kind: "paragraph",
        lines: [[{ kind: "text", text: "line one" }], [{ kind: "text", text: "line two" }]],
      },
      { kind: "list", items: [[{ kind: "text", text: "a" }], [{ kind: "text", text: "b" }]] },
      { kind: "heading", level: 3, content: [{ kind: "text", text: "Small" }] },
    ]);
  });

  it("keeps a script tag as plain text", () => {
    expect(parseMarkdown("<script>alert(1)</script>")).toEqual([
      { kind: "paragraph", lines: [[{ kind: "text", text: "<script>alert(1)</script>" }]] },
    ]);
  });

  it("treats four hashes or more as text", () => {
    expect(parseMarkdown("#### no")[0]).toMatchObject({ kind: "paragraph" });
  });

  it("is empty for blank text", () => {
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("reads bold, italic and code", () => {
    expect(parseInline("a **b** *c* `d`")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " " },
      { kind: "italic", text: "c" },
      { kind: "text", text: " " },
      { kind: "code", text: "d" },
    ]);
  });

  it("links https only", () => {
    expect(parseInline("[osu](https://osu.ppy.sh)")).toEqual([
      { kind: "link", text: "osu", href: "https://osu.ppy.sh" },
    ]);
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { kind: "text", text: "[x](javascript:alert(1))" },
    ]);
    expect(parseInline("[x](http://a.b)")).toEqual([{ kind: "text", text: "[x](http://a.b)" }]);
  });

  it("leaves an unclosed marker as text", () => {
    expect(parseInline("**open")).toEqual([{ kind: "text", text: "**open" }]);
  });
});
