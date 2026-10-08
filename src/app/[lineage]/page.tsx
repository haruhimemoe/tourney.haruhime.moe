/**
 * @file src/app/[lineage]/page.tsx
 * @desc A lineage's page: its description and every edition the viewer may see, newest first,
 *       with phase and year.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { Badge, LinkCard, PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SEO_SITE } from "@/constants/seo";
import { getCurrentUser } from "@/lib/auth-session";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { getLineageBySlug } from "@/services/lineages";
import { isVisible } from "@/services/public-view";

type Props = { params: Promise<{ lineage: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slug
 * @returns {Promise<Metadata>} the lineage's title and description
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage: slug } = await params;
  const lineage = await getLineageBySlug(slug);
  if (!lineage) notFound();
  return pageMetadata(SEO_SITE, {
    path: `/${slug}`,
    title: lineage.name,
    description: (lineage.description || `${lineage.name}'s osu! tournaments on tourney.`).slice(
      0,
      160,
    ),
  });
}

/**
 * @function LineagePage
 * @param props {Props} the slug
 * @returns {Promise<JSX.Element>} the edition list
 */
export default async function LineagePage({ params }: Props) {
  const { lineage: slug } = await params;
  const lineage = await getLineageBySlug(slug);
  if (!lineage) notFound();
  const viewerId = (await getCurrentUser())?.id ?? null;
  await connectDb();
  const editions = (
    await collections(getDb())
      .editions.find({ lineageId: lineage.id, archived: { $ne: true } })
      .sort({ year: -1, createdAt: -1 })
      .toArray()
  ).filter((e) => isVisible(e, lineage, viewerId));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={lineage.name} lead={lineage.description || undefined} />
      {editions.length ? (
        <ul className="flex flex-col gap-3">
          {editions.map((e) => (
            <li key={e.slug}>
              <LinkCard href={`/${lineage.slug}/${e.slug}`} title={e.name}>
                <span className="flex gap-2">
                  <Badge>{e.year}</Badge>
                  <Badge>{e.phase}</Badge>
                </span>
              </LinkCard>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-c3">No editions to show yet.</p>
      )}
    </div>
  );
}
