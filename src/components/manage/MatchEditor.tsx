/**
 * @file src/components/manage/MatchEditor.tsx
 * @desc One match's result: fill from an mp link (a preview, nothing saved), or type the score
 *       and maps; pick/bans when the edition has rules; stream and VOD links. Save is held back
 *       while the fill shows an unknown player or an off-pool map the host hasn't checked.
 *       Forfeit and undo sit beside it.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import type { FirstTurns, MapResult, PickBanEntry } from "@haruhimemoe/tourney";
import type { MatchProblem } from "@haruhimemoe/tourney/mp";
import { Button, Notice, SectionHeading, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";
import { MapResultsEditor } from "./MapResultsEditor";
import { BLOCKING_PROBLEMS, MpFillPreview, problemKey } from "./MpFillPreview";
import { PickBanEditor } from "./PickBanEditor";

/** The match as the editor starts from it. */
export type EditableMatch = {
  code: string;
  bestOf: number;
  scoreA: number | null;
  scoreB: number | null;
  maps: MapResult[];
  pickBans: PickBanEntry[];
  mpLinks: string[];
  streamUrl: string | null;
  vodUrl: string | null;
};

/** MatchEditor's props: the slugs, the match, the sides' names, the pool and the rules. */
export type MatchEditorProps = {
  lineage: string;
  edition: string;
  match: EditableMatch;
  names: { a: string; b: string };
  slots: readonly { slotKey: string; label: string }[];
  pickBans: boolean;
};

type Fill = { score: { a: number; b: number }; problems: MatchProblem[] };

const digits = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null);

/**
 * @function MatchEditor
 * @param props {MatchEditorProps} the match
 * @returns {JSX.Element} the fill box, the result form and the match actions
 */
export function MatchEditor({ lineage, edition, match, names, slots, pickBans }: MatchEditorProps) {
  const router = useRouter();
  const [mpLink, setMpLink] = useState(match.mpLinks[0] ?? "");
  const [warmups, setWarmups] = useState("0");
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? "");
  const [maps, setMaps] = useState<MapResult[]>(match.maps);
  const [log, setLog] = useState<PickBanEntry[]>(match.pickBans);
  const [first, setFirst] = useState<FirstTurns>({ ban: "a", pick: "b" });
  const [streamUrl, setStreamUrl] = useState(match.streamUrl ?? "");
  const [vodUrl, setVodUrl] = useState(match.vodUrl ?? "");
  const [fill, setFill] = useState<Fill | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const base = `/api/manage/${lineage}/${edition}/matches/${match.code}`;
  const blocked = (fill?.problems ?? []).some(
    (p) => BLOCKING_PROBLEMS.includes(p.code) && !acknowledged.has(problemKey(p)),
  );

  const after = (ok: boolean, message: string) => {
    setNotice({ tone: ok ? "info" : "error", text: message });
    if (ok) router.refresh();
  };

  const runFill = async () => {
    setBusy(true);
    const result = await postJson<{
      maps: MapResult[];
      score: { a: number; b: number };
      problems: MatchProblem[];
    }>(`${base}/fill`, { mpLink, warmups: digits(warmups) ?? 0, skip: [] });
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setMaps(result.data.maps);
    setScoreA(String(result.data.score.a));
    setScoreB(String(result.data.score.b));
    setFill({ score: result.data.score, problems: result.data.problems });
    setAcknowledged(new Set());
    setNotice(null);
  };

  const save = async () => {
    const a = digits(scoreA);
    const b = digits(scoreB);
    setBusy(true);
    const result = await postJson(
      `${base}/result`,
      {
        ...(a !== null && b !== null ? { score: { a, b } } : {}),
        maps,
        pickBans: log,
        ...(log.length ? { first } : {}),
        mpLinks: mpLink.trim() ? [mpLink.trim()] : [],
        streamUrl: streamUrl.trim() || null,
        vodUrl: vodUrl.trim() || null,
      },
      "PUT",
    );
    setBusy(false);
    after(result.ok, result.ok ? "Result saved." : result.message);
    if (result.ok) setFill(null);
  };

  const forfeit = async (winner: "a" | "b") => {
    setBusy(true);
    const result = await postJson(`${base}/forfeit`, { winner });
    setBusy(false);
    after(result.ok, result.ok ? `${names[winner]} advance by forfeit.` : result.message);
  };

  const undo = async () => {
    setBusy(true);
    const result = await postJson(`${base}/result`, {}, "DELETE");
    setBusy(false);
    after(result.ok, result.ok ? "Result undone." : result.message);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionHeading>Fill from mp</SectionHeading>
        <div className="flex flex-wrap items-end gap-2">
          <TextInput
            id="mp-link"
            label="mp link"
            value={mpLink}
            onChange={(e) => setMpLink(e.target.value)}
            maxLength={200}
            wrapperClassName="min-w-72 flex-1"
            disabled={busy}
          />
          <TextInput
            id="warmups"
            label="Warmups"
            inputMode="numeric"
            value={warmups}
            onChange={(e) => setWarmups(e.target.value)}
            disabled={busy}
          />
          <Button type="button" variant="ghost" onClick={runFill} disabled={busy || !mpLink.trim()}>
            Fill
          </Button>
        </div>
        {fill ? (
          <MpFillPreview
            score={fill.score}
            names={names}
            problems={fill.problems}
            acknowledged={acknowledged}
            onAcknowledge={(key, on) =>
              setAcknowledged((prev) => {
                const next = new Set(prev);
                if (on) next.add(key);
                else next.delete(key);
                return next;
              })
            }
          />
        ) : null}
      </section>
      <section className="flex flex-col gap-3">
        <SectionHeading>Result (best of {match.bestOf})</SectionHeading>
        <div className="flex flex-wrap gap-2">
          <TextInput
            id="score-a"
            label={`${names.a} maps`}
            inputMode="numeric"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            disabled={busy}
          />
          <TextInput
            id="score-b"
            label={`${names.b} maps`}
            inputMode="numeric"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            disabled={busy}
          />
        </div>
        <p className="text-c3 text-sm">With maps listed, the score is counted from them.</p>
        <MapResultsEditor
          value={maps}
          onChange={setMaps}
          slots={slots}
          names={names}
          disabled={busy}
        />
      </section>
      {pickBans ? (
        <section className="flex flex-col gap-3">
          <SectionHeading>Picks and bans</SectionHeading>
          <PickBanEditor
            value={log}
            onChange={setLog}
            first={first}
            onFirstChange={setFirst}
            slots={slots}
            names={names}
            disabled={busy}
          />
        </section>
      ) : null}
      <section className="flex flex-wrap gap-2">
        <TextInput
          id="stream-url"
          label="Stream link"
          type="url"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          disabled={busy}
        />
        <TextInput
          id="vod-url"
          label="VOD link"
          type="url"
          value={vodUrl}
          onChange={(e) => setVodUrl(e.target.value)}
          disabled={busy}
        />
      </section>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={busy || blocked}>
          Save result
        </Button>
        <Button type="button" variant="ghost" onClick={() => forfeit("a")} disabled={busy}>
          {names.b} forfeit
        </Button>
        <Button type="button" variant="ghost" onClick={() => forfeit("b")} disabled={busy}>
          {names.a} forfeit
        </Button>
        <Button type="button" variant="ghost" onClick={undo} disabled={busy}>
          Undo result
        </Button>
      </div>
    </div>
  );
}
