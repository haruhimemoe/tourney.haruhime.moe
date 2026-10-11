/**
 * @file src/app/manage/[lineage]/[edition]/settings/modules/page.tsx
 * @desc Modules settings placeholder: the tab exists; what it configures lands in a later plan.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { EmptyState } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    path: `/manage/${lineage}/${edition}/settings/modules`,
    title: "Modules",
    index: false,
  });
}

/**
 * @function ModulesSettingsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} a placeholder, gated the same as the other settings tabs
 */
export default async function ModulesSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings/modules`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  return <EmptyState>No modules yet.</EmptyState>;
}
