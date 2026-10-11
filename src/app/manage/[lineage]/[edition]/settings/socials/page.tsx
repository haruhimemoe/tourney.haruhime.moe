/**
 * @file src/app/manage/[lineage]/[edition]/settings/socials/page.tsx
 * @desc Social link settings for lineage members.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SocialsEditor } from "@/components/manage/SocialsEditor";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";

type Props = { params: Promise<{ lineage: string; edition: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}/settings/socials`,
    title: "Social link settings",
    index: false,
  });
}

/**
 * @function SocialsSettingsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the socials editor
 */
export default async function SocialsSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings/socials`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  return <SocialsEditor lineage={lineage.slug} edition={edition.slug} initial={edition.socials} />;
}
