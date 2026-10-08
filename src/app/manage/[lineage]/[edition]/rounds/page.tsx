/**
 * @file src/app/manage/[lineage]/[edition]/rounds/page.tsx
 * @desc The bracket config and its rounds, for lineage members.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoundsEditor } from "@/components/manage/RoundsEditor";
import { SEO_SITE } from "@/constants/seo";
import { getPoolsUrl } from "@/env";
import { requireUser } from "@/lib/auth-session";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listRounds } from "@/services/rounds";

type Props = { params: Promise<{ lineage: string; edition: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}/rounds`,
    title: "Bracket and rounds",
    index: false,
  });
}

/**
 * @function RoundsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the config form and rounds table
 */
export default async function RoundsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/rounds`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bracket and rounds" lead={edition.name} />
      <RoundsEditor
        lineage={lineage.slug}
        edition={edition.slug}
        config={edition.bracket}
        qualifiers={edition.qualifiers}
        rounds={await listRounds(edition.id)}
        poolsUrl={getPoolsUrl()}
      />
    </div>
  );
}
