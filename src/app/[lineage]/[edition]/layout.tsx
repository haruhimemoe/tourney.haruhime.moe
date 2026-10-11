/**
 * @file src/app/[lineage]/[edition]/layout.tsx
 * @desc The public edition's frame: its name, who runs it, the tabs, and for lineage members a
 *       notice when the public can't see the page yet.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { Notice, PageHeader, TextLink } from "@haruhimemoe/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { EditionTabs } from "@/components/edition/EditionTabs";
import { requirePublic } from "@/lib/public-page";

type Props = { children: ReactNode; params: Promise<{ lineage: string; edition: string }> };

/**
 * @function EditionLayout
 * @param props {Props} the page and slugs
 * @returns {Promise<JSX.Element>} the frame around a tab
 */
export default async function EditionLayout({ children, params }: Props) {
  const t = await getTranslations("tourney.pages.lineageEditionLayout");
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const { lineage, edition } = await requirePublic(lineageSlug, editionSlug);
  const base = `/${lineage.slug}/${edition.slug}`;
  const hiddenFromPublic =
    edition.siteMode === "hidden" || (edition.siteMode === "auto" && edition.phase === "setup");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={edition.name}
        lead={<TextLink href={`/${lineage.slug}`}>{lineage.name}</TextLink>}
      />
      {hiddenFromPublic ? <Notice tone="info">{t("hiddenOnlyThisLineage")}</Notice> : null}
      <EditionTabs base={base} />
      {children}
    </div>
  );
}
