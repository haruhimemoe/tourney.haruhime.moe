/**
 * @file src/components/registration/RegisterForm.tsx
 * @desc A player's registration: the edition's questions, and in team editions the captain's
 *       team. Required answers are checked before posting; a refusal keeps every answer and
 *       shows the field errors the route sent. Once registered, the same form edits the answers
 *       and offers a withdraw while registration is open.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import type { RegistrationStatus } from "@haruhimemoe/tourney";
import { Button, Notice } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { Question } from "@/schemas/question";
import { QuestionField } from "./QuestionField";
import { parseMembers, type TeamDraft, TeamFields } from "./TeamFields";

/** RegisterForm's props: where to post, the questions, team mode and the player's own row. */
export type RegisterFormProps = {
  lineage: string;
  edition: string;
  questions: readonly Question[];
  teamMode: boolean;
  existing: { status: RegistrationStatus; answers: Record<string, unknown> } | null;
};

const STATUS_TEXT: Record<RegistrationStatus, string> = {
  pending: "You're registered. The hosts haven't reviewed it yet.",
  approved: "You're registered and approved.",
  waitlisted: "You're on the waitlist. The hosts will move you up if a place opens.",
  rejected: "The hosts declined this registration.",
  withdrawn: "You withdrew. You can register again while registration is open.",
};

const REQUIRED = "This question needs an answer.";

const missing = (q: Question, value: unknown): boolean => {
  if (!q.required) return false;
  if (q.type === "checkbox") return value !== true;
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
};

/**
 * @function RegisterForm
 * @param props {RegisterFormProps} the edition and the player's registration, if any
 * @returns {JSX.Element} the form, or the registered state with edit and withdraw
 */
export function RegisterForm({
  lineage,
  edition,
  questions,
  teamMode,
  existing,
}: RegisterFormProps) {
  const router = useRouter();
  const live = existing && existing.status !== "withdrawn" ? existing : null;
  const [status, setStatus] = useState<RegistrationStatus | null>(live?.status ?? null);
  const [answers, setAnswers] = useState<Record<string, unknown>>(live?.answers ?? {});
  const [team, setTeam] = useState<TeamDraft>({ name: "", tag: "", members: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/editions/${lineage}/${edition}/registration`;
  const registered = status !== null && status !== "withdrawn";
  const closedOut = status === "rejected";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const blank = Object.fromEntries(
      questions.filter((q) => missing(q, answers[q.id])).map((q) => [q.id, REQUIRED]),
    );
    setErrors(blank);
    if (Object.keys(blank).length > 0) return setMessage(null);
    setBusy(true);
    const body = registered
      ? { answers }
      : {
          answers,
          ...(teamMode
            ? {
                team: {
                  name: team.name,
                  tag: team.tag.trim() || null,
                  members: parseMembers(team.members),
                },
              }
            : {}),
        };
    const result = await postJson<{ registration: { status: RegistrationStatus } }>(
      url,
      body,
      registered ? "PATCH" : "POST",
    );
    setBusy(false);
    if (result.ok) {
      setStatus(result.data.registration.status);
      setMessage(null);
      router.refresh();
      return;
    }
    if (result.code === "already-registered") {
      const found = (result.error?.existing as { status?: RegistrationStatus } | undefined)?.status;
      setStatus(found ?? "pending");
      setMessage("You're already registered for this edition.");
      router.refresh();
      return;
    }
    setErrors((result.error?.errors as Record<string, string> | undefined) ?? {});
    const detail = typeof result.error?.message === "string" ? result.error.message : null;
    setMessage(
      result.code === "ineligible" || result.code === "player-on-team"
        ? (detail ?? result.message)
        : result.message,
    );
  };

  const withdraw = async () => {
    setBusy(true);
    const result = await postJson<{ registration: { status: RegistrationStatus } }>(
      url,
      {},
      "DELETE",
    );
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setStatus("withdrawn");
    setAnswers({});
    setMessage(null);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4" noValidate>
      {status ? <Notice tone="info">{STATUS_TEXT[status]}</Notice> : null}
      {teamMode && !registered ? (
        <TeamFields value={team} onChange={setTeam} disabled={busy} />
      ) : null}
      {questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
          error={errors[q.id]}
          disabled={busy || closedOut}
        />
      ))}
      {message ? (
        <Notice tone="error" live>
          {message}
        </Notice>
      ) : null}
      <div className="flex gap-2">
        {closedOut ? null : registered ? (
          <>
            {questions.length > 0 ? (
              <Button type="submit" disabled={busy}>
                Save answers
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={withdraw} disabled={busy}>
              Withdraw
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={busy}>
            Register
          </Button>
        )}
      </div>
    </form>
  );
}
