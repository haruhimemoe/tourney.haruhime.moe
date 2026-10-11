/**
 * @file src/app/manage/[lineage]/[edition]/matches/[code]/page.tsx
 * @desc One match's result editor, for lineage members. The map and pick/ban slots come from the
 *       round's pool; while that can't be read, a notice says so and the score can still be
 *       typed in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { Notice, PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MatchEditor } from "@/components/manage/MatchEditor";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { getPool } from "@/lib/pools-client";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { getMatch } from "@/services/match-results";
import { listRounds } from "@/services/rounds";
import { listTeams } from "@/services/teams";

type Props = { params: Promise<{ lineage: string; edition: string; code: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slugs and match code
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition, code } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}/matches/${code}`,
    title: `Match ${code}`,
    index: false,
  });
}

/**
 * @function MatchPage
 * @param props {Props} the slugs and match code
 * @returns {Promise<JSX.Element>} the match editor
 */
export default async function MatchPage({ params }: Props) {
  const t = await getTranslations("tourney.pages.manageLineageEditionMatchesCode");
  const { lineage: lineageSlug, edition: editionSlug, code } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}/matches/${code}`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  const match = await getMatch(edition.id, code);
  if (!match) notFound();
  const names = new Map((await listTeams(edition.id)).map((t) => [t.id, t.name]));
  const round = (await listRounds(edition.id)).find((r) => r.code === match.round);
  const pool = round?.poolId ? await getPool(round.poolId) : null;
  const slots =
    pool?.ok === true
      ? pool.value.slots.map((s) => ({ slotKey: s.slotKey, label: `${s.mod ?? ""}${s.index}` }))
      : [];
  const tc = await getTranslations("tourney.common");
  const side = (id: string | null) => (id ? (names.get(id) ?? tc("unknownTeam")) : tc("tbd"));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${match.bracketCode ?? code}: ${tc("versus", { a: side(match.a), b: side(match.b) })}`}
        lead={`${edition.name}, ${round?.name ?? match.round}`}
        meta={t("statusStatus", { status: match.status })}
      />
      {!round?.poolId ? (
        <Notice tone="info">{t("thisRoundHasNo")}</Notice>
      ) : pool && !pool.ok ? (
        <Notice tone="error">{pool.error.message}</Notice>
      ) : null}
      {match.a && match.b ? (
        <MatchEditor
          lineage={lineage.slug}
          edition={edition.slug}
          match={{
            code: match.bracketCode ?? code,
            bestOf: match.bestOf,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            maps: match.maps,
            pickBans: match.pickBans,
            mpLinks: match.mpLinks,
            streamUrl: match.streamUrl,
            vodUrl: match.vodUrl,
          }}
          names={{ a: side(match.a), b: side(match.b) }}
          slots={slots}
          pickBans={edition.pickBanRules !== null}
        />
      ) : (
        <Notice tone="info">{t("bothSidesHaveTo")}</Notice>
      )}
    </div>
  );
}
