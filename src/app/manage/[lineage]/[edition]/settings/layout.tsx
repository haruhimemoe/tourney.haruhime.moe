/**
 * @file src/app/manage/[lineage]/[edition]/settings/layout.tsx
 * @desc The edition settings section's frame: its header and tabs (General, Socials, Contact,
 *       Registration, Modules). Gated the same way the manage pages already are: a signed-in
 *       lineage member (any role, same as the registration settings page today); the PATCH
 *       routes underneath still need the admin role, so a non-admin sees the forms read-only in
 *       that a save answers 403.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { PageHeader } from "@haruhimemoe/ui";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SettingsTabs } from "@/components/manage/SettingsTabs";
import { requireUser } from "@/lib/auth-session";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";

type Props = { children: ReactNode; params: Promise<{ lineage: string; edition: string }> };

/**
 * @function EditionSettingsLayout
 * @param props {Props} the tab and slugs
 * @returns {Promise<JSX.Element>} the header, tabs and the tab's content
 */
export default async function EditionSettingsLayout({ children, params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  const base = `/manage/${lineage.slug}/${edition.slug}/settings`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edition settings" lead={edition.name} />
      <SettingsTabs base={base} />
      {children}
    </div>
  );
}
