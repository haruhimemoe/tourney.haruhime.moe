/**
 * @file src/components/manage/ScheduleTable.tsx
 * @desc The edition's matches with their times shown in the viewer's zone (the `zone` prop, else
 *       the browser's). A host sets a time by hand (typed in their own time), asks for
 *       suggestions from both rosters' availability and picks one, or fills a whole round.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice, Table, TBody, Td, TextInput, TextLink, THead, Th } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/manage-client";
import { fromLocalInput, toLocalInput } from "@/utils/local-time";

/** One row: a match code, its round, both sides' names (null while unknown) and its time. */
export type ScheduleRow = {
  code: string;
  round: string;
  a: string | null;
  b: string | null;
  scheduledAt: string | null;
};

/** ScheduleTable's props: the slugs, the rows and the zone to show times in. */
export type ScheduleTableProps = {
  lineage: string;
  edition: string;
  rows: readonly ScheduleRow[];
  zone?: string;
};

/**
 * @function formatIn
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @returns {string} like "Tue, Nov 3, 03:00"
 */
const formatIn = (iso: string, zone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  }).format(new Date(iso));

/**
 * @function ScheduleTable
 * @param props {ScheduleTableProps} the matches
 * @returns {JSX.Element} the table with its scheduling actions
 */
export function ScheduleTable({ lineage, edition, rows, zone }: ScheduleTableProps) {
  const router = useRouter();
  // The server doesn't know the viewer's zone: UTC until the browser says, so hydration matches.
  const [viewerZone, setViewerZone] = useState(zone ?? "UTC");
  useEffect(() => {
    if (!zone) setViewerZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [zone]);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.code, toLocalInput(r.scheduledAt)])),
  );
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const base = `/api/manage/${lineage}/${edition}`;
  const rounds = [...new Set(rows.map((r) => r.round))];

  const run = async <T,>(
    work: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>,
    done: (data: T) => string,
  ) => {
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({ tone: "info", text: done(result.data) });
    router.refresh();
  };

  const setTime = (code: string, at: string | null) =>
    run(
      () => postJson(`${base}/matches/${code}/time`, { at }, "PUT"),
      () => (at ? `${code} set.` : `${code} cleared.`),
    );

  const suggest = (code: string) =>
    run(
      () => postJson<{ suggestions: { start: string }[] }>(`${base}/schedule/suggest`, { code }),
      (data) => {
        setOptions((prev) => ({ ...prev, [code]: data.suggestions.map((s) => s.start) }));
        return data.suggestions.length
          ? `${data.suggestions.length} times for ${code}.`
          : `No time in the window suits both sides of ${code}.`;
      },
    );

  const fill = (round: string) =>
    run(
      () => postJson<{ filled: number; skipped: string[] }>(`${base}/schedule/suggest`, { round }),
      (data) =>
        `Filled ${data.filled} in ${round}.${data.skipped.length ? ` Left: ${data.skipped.join(", ")}.` : ""}`,
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-c3 text-sm">Times in {viewerZone}.</p>
      <div className="flex flex-wrap gap-2">
        {rounds.map((r) => (
          <Button
            key={r}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fill(r)}
            disabled={busy}
          >
            Fill {r}
          </Button>
        ))}
      </div>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <Table caption="Schedule" hideCaption>
        <THead>
          <tr>
            <Th>Match</Th>
            <Th>Round</Th>
            <Th>Sides</Th>
            <Th>Time</Th>
            <Th>Set time</Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => (
            <tr key={r.code} aria-label={r.code}>
              <Td>
                <TextLink href={`/manage/${lineage}/${edition}/matches/${r.code}`}>
                  {r.code}
                </TextLink>
              </Td>
              <Td>{r.round}</Td>
              <Td>
                {r.a ?? "TBD"} vs {r.b ?? "TBD"}
              </Td>
              <Td>{r.scheduledAt ? formatIn(r.scheduledAt, viewerZone) : "Not set"}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <TextInput
                    id={`time-${r.code}`}
                    label={`Time of ${r.code}`}
                    hideLabel
                    type="datetime-local"
                    value={drafts[r.code] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [r.code]: e.target.value }))}
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setTime(r.code, fromLocalInput(drafts[r.code] ?? ""))}
                    disabled={busy}
                  >
                    Save
                  </Button>
                  {r.a && r.b ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => suggest(r.code)}
                      disabled={busy}
                    >
                      Suggest
                    </Button>
                  ) : null}
                  {(options[r.code] ?? []).map((start) => (
                    <Button
                      key={start}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTime(r.code, start)}
                      disabled={busy}
                    >
                      {formatIn(start, viewerZone)}
                    </Button>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
