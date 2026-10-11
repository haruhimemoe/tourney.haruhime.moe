/**
 * @file src/components/edition/ScheduleList.tsx
 * @desc The public schedule: matches grouped by day in the viewer's zone (UTC until the browser
 *       says, unless the server knows it), earliest first, unscheduled matches last. Each match
 *       links to its page. Times use the viewer's hub hour cycle, or formatInstant's pinned
 *       "en-US" default (12-hour, AM/PM) when it's null, never the browser's own locale.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { SectionHeading, TextLink } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";
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

/** ScheduleList's props: the rows, the edition's base path, the viewer's zone and hour cycle
 * when known. */
export type ScheduleListProps = {
  rows: readonly ScheduleListRow[];
  base: string;
  zone?: string | null | undefined;
  hourCycle?: "h12" | "h23" | null | undefined;
};

/**
 * @function ScheduleList
 * @param props {ScheduleListProps} the rows
 * @returns {JSX.Element} one section per day
 */
export function ScheduleList({ rows, base, zone, hourCycle }: ScheduleListProps) {
  const t = useTranslations("tourney.scheduleList");
  const viewer = useViewerZone(zone);
  const sorted = [...rows].sort(
    (x, y) =>
      (x.scheduledAt ? Date.parse(x.scheduledAt) : Number.POSITIVE_INFINITY) -
        (y.scheduledAt ? Date.parse(y.scheduledAt) : Number.POSITIVE_INFINITY) ||
      x.code.localeCompare(y.code, "en", { numeric: true }),
  );
  const days = new Map<string, ScheduleListRow[]>();
  for (const row of sorted) {
    const day = row.scheduledAt ? formatDay(row.scheduledAt, viewer) : t("unscheduled");
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  if (!rows.length) return <p className="text-c3">{t("noMatchesYet")}</p>;
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
                  {r.scheduledAt
                    ? formatTime(r.scheduledAt, viewer, hourCycle ?? null)
                        .split(", ")
                        .at(-1)
                    : "-"}
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
