/**
 * @file src/app/manage/[lineage]/[edition]/schedule/page.tsx
 * @desc The edition's schedule for lineage members: every match that is or was to be played,
 *       each linking to its result editor.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScheduleTable } from "@/components/manage/ScheduleTable";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listTeams } from "@/services/teams";

type Props = { params: Promise<{ lineage: string; edition: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}/schedule`,
    title: "Schedule",
    index: false,
  });
}

/**
 * @function SchedulePage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the schedule table
 */
export default async function SchedulePage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/schedule`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  await connectDb();
  const names = new Map((await listTeams(edition.id)).map((t) => [t.id, t.name]));
  const matches = await collections(getDb())
    .matches.find({ editionId: edition.id, status: { $ne: "cancelled" } })
    .sort({ scheduledAt: 1, bracketCode: 1 })
    .toArray();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Schedule" lead={edition.name} />
      <ScheduleTable
        lineage={lineage.slug}
        edition={edition.slug}
        rows={matches.map((m) => ({
          code: m.bracketCode ?? "",
          round: m.round,
          a: m.a ? (names.get(m.a) ?? null) : null,
          b: m.b ? (names.get(m.b) ?? null) : null,
          scheduledAt: m.scheduledAt,
        }))}
      />
    </div>
  );
}
