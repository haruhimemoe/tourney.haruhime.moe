/**
 * @file src/app/manage/[lineage]/[edition]/settings/contact/page.tsx
 * @desc Contact settings for lineage members: how players reach the host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/manage/ContactForm";
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
    path: `/manage/${lineage}/${edition}/settings/contact`,
    title: "Contact settings",
    index: false,
  });
}

/**
 * @function ContactSettingsPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the contact form
 */
export default async function ContactSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings/contact`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  return <ContactForm lineage={lineage.slug} edition={edition.slug} initial={edition.contact} />;
}
