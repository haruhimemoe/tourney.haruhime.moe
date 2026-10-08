/**
 * @file src/app/[lineage]/[edition]/meta.ts
 * @desc generateMetadata for the public edition tabs: the edition's title and description,
 *       indexed unless the edition is hidden.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import type { Metadata } from "next";
import { SEO_SITE } from "@/constants/seo";
import { requirePublic } from "@/lib/public-page";
import { editionMeta } from "@/utils/edition-meta";

/** A public edition route's params. */
export type EditionParams = { params: Promise<{ lineage: string; edition: string }> };

/**
 * @function tabMetadata
 * @param tab {string | undefined} the tab's name; undefined on the overview
 * @returns {(props: EditionParams) => Promise<Metadata>} that tab's generateMetadata
 */
export const tabMetadata =
  (tab?: string) =>
  async ({ params }: EditionParams): Promise<Metadata> => {
    const { lineage, edition } = await params;
    const page = await requirePublic(lineage, edition);
    return pageMetadata(SEO_SITE, {
      ...editionMeta(lineage, edition, page.edition, page.lineage.name, tab),
      index: page.edition.siteMode !== "hidden",
    });
  };
