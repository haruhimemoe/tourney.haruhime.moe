/**
 * @file src/components/manage/RegistrationsTable.tsx
 * @desc The host's review table: each registration with its snapshot, team and answers (shown
 *       through displayAnswer, so edited or removed questions still read), row selection, and
 *       one review call for the selected rows with an optional note.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import type { RegistrationStatus } from "@haruhimemoe/tourney";
import { Button, Notice, Table, TBody, Td, TextInput, THead, Th } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_REVIEW_BATCH } from "@/constants/registration";
import { postJson } from "@/lib/manage-client";
import type { Question } from "@/schemas/question";
import type { StoredRegistration } from "@/schemas/registration";
import { displayAnswer } from "@/utils/answers";

/** RegistrationsTable's props: the edition's slugs, one page of rows and the questions now. */
export type RegistrationsTableProps = {
  lineage: string;
  edition: string;
  rows: readonly StoredRegistration[];
  questions: readonly Question[];
};

const ACTIONS: readonly { to: RegistrationStatus; label: string }[] = [
  { to: "approved", label: "Approve" },
  { to: "waitlisted", label: "Waitlist" },
  { to: "rejected", label: "Reject" },
];

/**
 * @function RegistrationsTable
 * @param props {RegistrationsTableProps} the rows and questions
 * @returns {JSX.Element} the table and its bulk actions
 */
export function RegistrationsTable({ lineage, edition, rows, questions }: RegistrationsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const known = new Set(questions.map((q) => q.id));
  const allOn = rows.length > 0 && selected.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) =>
      on
        ? rows.map((r) => r.id).filter((x) => x === id || prev.includes(x))
        : prev.filter((x) => x !== id),
    );

  const act = async (to: RegistrationStatus) => {
    setBusy(true);
    const result = await postJson(`/api/manage/${lineage}/${edition}/registrations/review`, {
      ids: selected,
      to,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    setSelected([]);
    setNote("");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <TextInput
          id="review-note"
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        {ACTIONS.map((a) => (
          <Button
            key={a.to}
            type="button"
            variant={a.to === "approved" ? "primary" : "ghost"}
            onClick={() => act(a.to)}
            disabled={busy || selected.length === 0 || selected.length > MAX_REVIEW_BATCH}
          >
            {`${a.label} ${selected.length}`}
          </Button>
        ))}
      </div>
      {error ? (
        <Notice tone="error" live>
          {error}
        </Notice>
      ) : null}
      <Table caption="Registrations" hideCaption>
        <THead>
          <tr>
            <Th>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allOn}
                onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
              />
            </Th>
            <Th>Player</Th>
            <Th>Status</Th>
            <Th>Team</Th>
            {questions.map((q) => (
              <Th key={q.id}>{q.label}</Th>
            ))}
            <Th>Other answers</Th>
            <Th>Note</Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => {
            const extra = Object.entries(r.answers).filter(([id]) => !known.has(id));
            return (
              <tr key={r.id}>
                <Td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.snapshot.username}`}
                    checked={selected.includes(r.id)}
                    onChange={(e) => toggle(r.id, e.target.checked)}
                  />
                </Td>
                <Td>
                  <div className="font-bold text-c1">{r.snapshot.username}</div>
                  <div className="text-c3 text-xs tabular-nums">
                    {r.osuId} · {r.snapshot.rank ? `#${r.snapshot.rank}` : "unranked"} ·{" "}
                    {r.snapshot.country ?? "-"}
                  </div>
                </Td>
                <Td>{r.status}</Td>
                <Td>
                  {r.team
                    ? `${r.team.name}${r.team.tag ? ` [${r.team.tag}]` : ""} (${r.team.members.join(", ") || "no teammates"})`
                    : "-"}
                </Td>
                {questions.map((q) => (
                  <Td key={q.id}>{displayAnswer(q, r.answers[q.id])}</Td>
                ))}
                <Td>
                  {extra.length === 0
                    ? "-"
                    : extra.map(([id, value]) => (
                        <div key={id}>{displayAnswer(undefined, value)}</div>
                      ))}
                </Td>
                <Td>{r.reviewNote ?? ""}</Td>
              </tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
