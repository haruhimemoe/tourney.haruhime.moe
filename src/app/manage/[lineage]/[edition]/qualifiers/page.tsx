/**
 * @file src/app/manage/[lineage]/[edition]/qualifiers/page.tsx
 * @desc Qualifier scores and seeding, for lineage members. The sheet's columns come from the
 *       qualifier pool on pools.haruhime.moe; while that can't be read, the saved scores' slots
 *       stand in and a notice says why.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { Notice, PageHeader, SectionHeading } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GenerateBracketButton } from "@/components/manage/GenerateBracketButton";
import { QualifierScores } from "@/components/manage/QualifierScores";
import { SeedList } from "@/components/manage/SeedList";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { getPool } from "@/lib/pools-client";
import { getBracket } from "@/services/brackets";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listQualifierScores } from "@/services/qualifiers";
import { listRounds } from "@/services/rounds";
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
    path: `/manage/${lineage}/${edition}/qualifiers`,
    title: "Qualifiers and seeds",
    index: false,
  });
}

/**
 * @function QualifiersPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the score sheet and the seeds
 */
export default async function QualifiersPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/qualifiers`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  const teams = (await listTeams(edition.id)).filter((t) => t.status === "active");
  const round = (await listRounds(edition.id)).find((r) => r.side === "qualifiers");
  const saved = await listQualifierScores(edition.id);
  const pool = round?.poolId ? await getPool(round.poolId) : null;
  const slots =
    pool?.ok === true
      ? pool.value.slots.map((s) => ({ slotKey: s.slotKey, label: `${s.mod ?? ""}${s.index}` }))
      : [...new Set(saved.map((s) => s.slotKey))].sort().map((k) => ({ slotKey: k, label: k }));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Qualifiers and seeds" lead={edition.name} />
      {edition.qualifiers.enabled && round ? (
        <section className="flex flex-col gap-4">
          <SectionHeading>Qualifier scores</SectionHeading>
          {!round.poolId ? (
            <Notice tone="info">Link the qualifier pool on the rounds page to get its maps.</Notice>
          ) : pool && !pool.ok ? (
            <Notice tone="error">{pool.error.message}</Notice>
          ) : null}
          <QualifierScores
            lineage={lineage.slug}
            edition={edition.slug}
            teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            slots={slots}
            saved={saved.map(({ teamId, slotKey, score }) => ({ teamId, slotKey, score }))}
          />
        </section>
      ) : null}
      <section className="flex flex-col gap-4">
        <SectionHeading>Seeds</SectionHeading>
        <SeedList
          lineage={lineage.slug}
          edition={edition.slug}
          teams={teams.map((t) => ({ id: t.id, name: t.name, seed: t.seed }))}
          qualifiers={edition.qualifiers.enabled && Boolean(round)}
          randomSeed={edition.bracket?.randomSeed ?? null}
        />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>Bracket</SectionHeading>
        <GenerateBracketButton
          lineage={lineage.slug}
          edition={edition.slug}
          exists={Boolean((await getBracket(edition.id))?.bracket)}
        />
      </section>
    </div>
  );
}
