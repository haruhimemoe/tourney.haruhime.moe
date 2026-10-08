/**
 * @file src/components/manage/QualifierScores.tsx
 * @desc The qualifier score sheet: one row per team, one column per pool slot. Scores are typed
 *       in, or read from a lobby's mp link: the preview fills the sheet's cells for the teams it
 *       found and lists what it left out; nothing saves until the host presses Save.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice, Table, TBody, Td, TextInput, THead, Th } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";

/** QualifierScores' props: the slugs, the teams, the slot columns and the saved scores. */
export type QualifierScoresProps = {
  lineage: string;
  edition: string;
  teams: readonly { id: string; name: string }[];
  slots: readonly { slotKey: string; label: string }[];
  saved: readonly { teamId: string; slotKey: string; score: number }[];
};

type Problem = { code: string; gameId: number; message: string };

const cell = (teamId: string, slotKey: string) => `${teamId} ${slotKey}`;

/**
 * @function QualifierScores
 * @param props {QualifierScoresProps} the sheet
 * @returns {JSX.Element} the mp fill box, the sheet and Save
 */
export function QualifierScores({ lineage, edition, teams, slots, saved }: QualifierScoresProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(saved.map((s) => [cell(s.teamId, s.slotKey), String(s.score)])),
  );
  const [mpLink, setMpLink] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const base = `/api/manage/${lineage}/${edition}/qualifiers`;

  const fill = async () => {
    setBusy(true);
    const result = await postJson<{
      rows: { teamId: string; slotKey: string; score: number }[];
      problems: Problem[];
    }>(`${base}/fill`, { mpLink });
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setValues((prev) => ({
      ...prev,
      ...Object.fromEntries(
        result.data.rows.map((r) => [cell(r.teamId, r.slotKey), String(r.score)]),
      ),
    }));
    setProblems(result.data.problems);
    setNotice({
      tone: "info",
      text: `Filled ${result.data.rows.length} scores. Check them, then save.`,
    });
  };

  const save = async () => {
    const rows = teams.flatMap((t) =>
      slots.flatMap((s) => {
        const text = (values[cell(t.id, s.slotKey)] ?? "").trim();
        return /^\d+$/.test(text)
          ? [{ teamId: t.id, slotKey: s.slotKey, score: Number(text) }]
          : [];
      }),
    );
    setBusy(true);
    const result = await postJson<{ saved: number }>(`${base}/scores`, { rows }, "PUT");
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setProblems([]);
    setNotice({ tone: "info", text: `Saved ${result.data.saved} scores.` });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <TextInput
          id="qualifier-mp"
          label="Lobby mp link"
          hint="Fills the sheet for the teams in that lobby. Nothing saves until you press Save."
          value={mpLink}
          onChange={(e) => setMpLink(e.target.value)}
          maxLength={200}
          wrapperClassName="min-w-72 flex-1"
          disabled={busy}
        />
        <Button type="button" variant="ghost" onClick={fill} disabled={busy || !mpLink.trim()}>
          Fill from mp
        </Button>
      </div>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      {problems.length > 0 ? (
        <Notice tone="error">
          <p>Left out of the fill:</p>
          <ul className="list-disc pl-5">
            {problems.map((p) => (
              <li key={`${p.gameId} ${p.message}`}>{p.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <Table caption="Qualifier scores" hideCaption>
        <THead>
          <tr>
            <Th>Team</Th>
            {slots.map((s) => (
              <Th key={s.slotKey}>{s.label}</Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {teams.map((t) => (
            <tr key={t.id}>
              <Td>{t.name}</Td>
              {slots.map((s) => {
                const key = cell(t.id, s.slotKey);
                return (
                  <Td key={s.slotKey}>
                    <TextInput
                      id={`q-${t.id}-${s.slotKey}`}
                      label={`${t.name} on ${s.label}`}
                      hideLabel
                      inputMode="numeric"
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      disabled={busy}
                    />
                  </Td>
                );
              })}
            </tr>
          ))}
        </TBody>
      </Table>
      <div>
        <Button type="button" onClick={save} disabled={busy}>
          Save scores
        </Button>
      </div>
    </div>
  );
}
