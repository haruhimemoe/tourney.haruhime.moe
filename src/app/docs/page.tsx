/**
 * @file src/app/docs/page.tsx
 * @desc /docs: every docs page with its description, from the registry. Static.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { ContentSearch, PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { CONTENT } from "@/constants/content";
import { SEO_SITE } from "@/constants/seo";
import { toNavItem } from "@/utils/content-nav";

/** The page's title, description, canonical URL and link preview. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/docs",
  title: "tourney docs",
  description:
    "How to host an osu! tournament on tourney.haruhime.moe: lineages and editions, registration, the bracket, the schedule and results.",
});

const ITEMS = CONTENT.entries.docs.map(toNavItem("docs"));

/**
 * @function DocsIndexPage
 * @returns {JSX.Element} the section's header and its pages
 */
export default function DocsIndexPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Docs" lead="How to host and play in tournaments on tourney." />
      <ContentSearch items={ITEMS} label="Search the docs" countNoun={["doc", "docs"]} />
    </div>
  );
}
