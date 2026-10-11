/**
 * @file src/app/manage/[lineage]/[edition]/settings/modules/page.tsx
 * @desc The Modules tab: one ModuleCard per MODULES entry, each showing whether the lineage has
 *       it on and a Settings link once it does and the module carries one. The registry is empty
 *       until a real module ships, so this reads "No modules available yet" in production.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { EmptyState } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleCard } from "@/components/manage/ModuleCard";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { moduleCardDto } from "@/lib/module-card-dto";
import { MODULES } from "@/modules/registry";
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
 * @returns {Promise<JSX.Element>} one card per registered module, or the empty state
 */
export default async function ModulesSettingsPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/settings/modules`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  if (MODULES.length === 0) return <EmptyState>No modules available yet.</EmptyState>;
  const base = `/manage/${lineage.slug}/${edition.slug}/settings/modules`;
  return (
    <div className="flex flex-col gap-4">
      {MODULES.map((mod) => (
        <ModuleCard
          key={mod.id}
          lineage={lineage.slug}
          card={moduleCardDto(mod, base, lineage.modules.includes(mod.id))}
        />
      ))}
    </div>
  );
}
