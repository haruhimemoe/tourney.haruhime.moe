/**
 * @file src/app/manage/[lineage]/[edition]/settings/registration/page.tsx
 * @desc Registration settings for lineage members: window, cap, questions and eligibility. The
 *       settings section's layout already renders the header and tabs, so this page is the form
 *       alone.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegistrationSettingsForm } from "@/components/manage/RegistrationSettingsForm";
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
    path: `/manage/${lineage}/${edition}/settings/registration`,
    title: "Registration settings",
    index: false,
  });
}

/**
 * @function RegistrationSettingsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the settings form
 */
export default async function RegistrationSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings/registration`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  return (
    <RegistrationSettingsForm
      lineage={lineage.slug}
      edition={edition.slug}
      initial={{
        registration: edition.registration,
        questions: edition.questions,
        eligibility: edition.eligibility,
      }}
    />
  );
}
