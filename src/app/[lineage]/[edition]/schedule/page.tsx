/**
 * @file src/app/[lineage]/[edition]/schedule/page.tsx
 * @desc Every match by day in the viewer's time zone.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { ScheduleList } from "@/components/edition/ScheduleList";
import { requirePublic } from "@/lib/public-page";
import { teamNames } from "@/utils/public-match";
import { type EditionParams, tabMetadata } from "../meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata("Schedule");

/**
 * @function SchedulePage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the schedule
 */
export default async function SchedulePage({ params }: EditionParams) {
  const { lineage, edition } = await params;
  const { matches, teams, zone } = await requirePublic(lineage, edition);
  const names = teamNames(teams);
  const rows = matches
    .filter((m) => m.status !== "cancelled" && m.bracketCode)
    .map((m) => ({
      code: m.bracketCode as string,
      round: m.round,
      a: m.a ? (names[m.a] ?? null) : null,
      b: m.b ? (names[m.b] ?? null) : null,
      scheduledAt: m.scheduledAt,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    }));
  return <ScheduleList rows={rows} base={`/${lineage}/${edition}`} zone={zone} />;
}
