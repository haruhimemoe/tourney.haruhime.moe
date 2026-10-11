/**
 * @file src/app/manage/[lineage]/[edition]/settings/page.tsx
 * @desc General settings for lineage members: name, acronym, dates, rules, banner, hue, site
 *       visibility.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeneralSettingsForm } from "@/components/manage/GeneralSettingsForm";
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
    path: `/manage/${lineage}/${edition}/settings`,
    title: "Edition settings",
    index: false,
  });
}

/**
 * @function GeneralSettingsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the general settings form
 */
export default async function GeneralSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  return (
    <GeneralSettingsForm
      lineage={lineage.slug}
      edition={edition.slug}
      initial={{
        name: edition.name,
        acronym: edition.acronym,
        dates: edition.dates,
        rulesText: edition.rulesText,
        bannerUrl: edition.bannerUrl,
        hue: edition.hue,
        siteMode: edition.siteMode,
      }}
    />
  );
}
