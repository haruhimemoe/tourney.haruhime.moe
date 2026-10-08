/**
 * @file tests/unit/utils/content-helpers.test.ts
 * @desc The docs helpers: JSON-LD for a page (article, breadcrumbs, a how-to when the entry has
 *       steps), nav items from registry entries, and the Markdown mirror options.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { CONTENT } from "@/constants/content";
import { docJsonLd } from "@/utils/content-ld";
import { CONTENT_MARKDOWN, LEGAL_CONTENT_MARKDOWN } from "@/utils/content-markdown";
import { toNavItem } from "@/utils/content-nav";

const [entry] = CONTENT.entries.docs;
if (!entry) throw new Error("no docs entry");

describe("docJsonLd", () => {
  it("describes the page with breadcrumbs", () => {
    const text = JSON.stringify(docJsonLd("docs", entry));
    expect(text).toContain("TechArticle");
    expect(text).toContain("BreadcrumbList");
    expect(text).toContain(`/docs/${entry.slug}`);
    expect(text).not.toContain("HowTo");
  });

  it("adds a how-to when the entry has steps", () => {
    const steps = [{ name: "Sign in", text: "Sign in with osu!." }];
    expect(JSON.stringify(docJsonLd("docs", { ...entry, howTo: steps } as never))).toContain(
      "HowTo",
    );
  });
});

describe("toNavItem", () => {
  it("links the entry and keeps a nav title only when set", () => {
    expect(toNavItem("docs")(entry)).toEqual({
      href: `/docs/${entry.slug}`,
      title: entry.title,
      description: entry.description,
    });
    expect(toNavItem("docs")({ ...entry, navTitle: "Short" })).toMatchObject({ navTitle: "Short" });
  });
});

describe("content markdown options", () => {
  it("adds the legal transform for legal pages", () => {
    expect(LEGAL_CONTENT_MARKDOWN.transforms.length).toBe(CONTENT_MARKDOWN.transforms.length + 1);
    expect(CONTENT_MARKDOWN.siteUrl).toBe("https://tourney.haruhime.moe");
  });
});
