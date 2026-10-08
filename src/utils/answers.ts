/**
 * @file src/utils/answers.ts
 * @desc Checks registration answers against an edition's questions, and shows a stored answer
 *       even after the host edited or removed its question.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { answerSchemaFor, type Question } from "@/schemas/question";

/**
 * @function checkAnswers
 * @param questions {readonly Question[]} the edition's questions
 * @param raw {Record<string, unknown>} the submitted answers by question id
 * @returns {{ ok: true; answers: Record<string, unknown> } | { ok: false; errors: Record<string, string> }}
 *          the parsed answers (unknown keys and empty optional answers dropped), or an error per question id
 */
export const checkAnswers = (
  questions: readonly Question[],
  raw: Record<string, unknown>,
):
  | { ok: true; answers: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> } => {
  const answers: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const parsed = answerSchemaFor(q).safeParse(raw[q.id]);
    if (!parsed.success) errors[q.id] = parsed.error.issues[0]?.message ?? "Invalid answer.";
    else if (parsed.data !== undefined) answers[q.id] = parsed.data;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers };
};

const show = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length === 0 ? "-" : value.map(String).join(", ");
  return String(value);
};

/**
 * @function displayAnswer
 * @param question {Question | undefined} the question now, undefined when the host removed it
 * @param value {unknown} the stored answer
 * @returns {string} the answer as text, marked when its question or option is gone
 */
export const displayAnswer = (question: Question | undefined, value: unknown): string => {
  const text = show(value);
  if (!question) return text === "-" ? text : `${text} (question removed)`;
  if (question.type === "choice" || question.type === "multi") {
    const picked = Array.isArray(value) ? value : value === undefined ? [] : [value];
    if (picked.some((v) => !question.options.includes(String(v))))
      return `${text} (no longer an option)`;
  }
  return text;
};
