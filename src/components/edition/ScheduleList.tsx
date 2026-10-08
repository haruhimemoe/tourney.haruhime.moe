/**
 * @file src/components/edition/ScheduleList.tsx
 * @desc The public schedule: matches grouped by day in the viewer's zone (UTC until the browser
 *       says, unless the server knows it), earliest first, unscheduled matches last. Each match
 *       links to its page.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { SectionHeading, TextLink } from "@haruhimemoe/ui";
import { formatDay, formatTime } from "@/utils/zoned-time";
import { useViewerZone } from "./LocalTime";

/** One match row: names are null while a side is unknown. */
export type ScheduleListRow = {
  code: string;
  round: string;
  a: string | null;
  b: string | null;
  scheduledAt: string | null;
  scoreA: number | null;
  scoreB: number | null;
};

/** ScheduleList's props: the rows, the edition's base path, the viewer's zone when known. */
export type ScheduleListProps = {
  rows: readonly ScheduleListRow[];
  base: string;
  zone?: string | null | undefined;
};

const UNSCHEDULED = "Not scheduled yet";

/**
 * @function ScheduleList
 * @param props {ScheduleListProps} the rows
 * @returns {JSX.Element} one section per day
 */
export function ScheduleList({ rows, base, zone }: ScheduleListProps) {
  const viewer = useViewerZone(zone);
  const sorted = [...rows].sort(
    (x, y) =>
      (x.scheduledAt ? Date.parse(x.scheduledAt) : Number.POSITIVE_INFINITY) -
        (y.scheduledAt ? Date.parse(y.scheduledAt) : Number.POSITIVE_INFINITY) ||
      x.code.localeCompare(y.code, "en", { numeric: true }),
  );
  const days = new Map<string, ScheduleListRow[]>();
  for (const row of sorted) {
    const day = row.scheduledAt ? formatDay(row.scheduledAt, viewer) : UNSCHEDULED;
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  if (!rows.length) return <p className="text-c3">No matches yet.</p>;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-c3 text-sm">Times in {viewer}.</p>
      {[...days].map(([day, list]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-2">
          <SectionHeading>{day}</SectionHeading>
          <ul className="flex flex-col gap-1">
            {list.map((r) => (
              <li key={r.code} className="flex flex-wrap items-baseline gap-x-3">
                <span className="w-14 text-c3 tabular-nums">
                  {r.scheduledAt ? formatTime(r.scheduledAt, viewer).split(", ").at(-1) : "-"}
                </span>
                <TextLink href={`${base}/m/${r.code}`} variant="plain">
                  {r.code}
                </TextLink>
                <span className="text-c3 text-sm">{r.round}</span>
                <span className="min-w-0 truncate">
                  {r.a ?? "TBD"} vs {r.b ?? "TBD"}
                </span>
                {r.scoreA !== null && r.scoreB !== null ? (
                  <span className="tabular-nums">
                    {r.scoreA} - {r.scoreB}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
