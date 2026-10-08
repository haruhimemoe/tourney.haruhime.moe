/**
 * @file src/app/sitemap.ts
 * @desc sitemap.xml: the static pages, the docs and legal sections (next-kit's contentSitemap,
 *       by lastUpdated), and every public edition's tabs and its lineage page. Hidden editions
 *       and editions still in setup are left out. Built on request from the database.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { contentSitemap } from "@haruhimemoe/next-kit/docs";
import { sitemapEntries } from "@haruhimemoe/next-kit/seo";
import type { MetadataRoute } from "next";
import { EDITION_TABS } from "@/components/edition/EditionTabs";
import { CONTENT } from "@/constants/content";
import { SEO_SITE } from "@/constants/seo";
import { listPublicEditions } from "@/services/public-view";

/** Read from the database on request (the build has none). */
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/browse", "/credits", "/brand"] as const;

/** How many editions the sitemap lists, newest first. */
const SITEMAP_EDITIONS = 5000;

/**
 * @function sitemap
 * @returns {Promise<MetadataRoute.Sitemap>} the static, docs and legal pages and the public
 *          editions
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const editions = await listPublicEditions(SITEMAP_EDITIONS);
  const lineages = [...new Set(editions.map((e) => `/${e.lineageSlug}`))];
  return sitemapEntries(SEO_SITE, [
    STATIC_PATHS,
    contentSitemap(CONTENT),
    lineages,
    editions.flatMap((e) => {
      const base = `/${e.lineageSlug}/${e.slug}`;
      return [base, ...EDITION_TABS.map(([segment]) => `${base}/${segment}`)];
    }),
  ]);
}
