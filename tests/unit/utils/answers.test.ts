/**
 * @file tests/unit/utils/answers.test.ts
 * @desc checkAnswers and displayAnswer, including answers to edited or removed questions.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import type { Question } from "@/schemas/question";
import { checkAnswers, displayAnswer } from "@/utils/answers";

const name: Question = { id: "name", label: "Name", help: "", required: true, type: "text" };
const days: Question = {
  id: "days",
  label: "Days",
  help: "",
  required: false,
  type: "multi",
  options: ["Sat", "Sun"],
};
const rules: Question = { id: "rules", label: "Rules", help: "", required: true, type: "checkbox" };

describe("checkAnswers", () => {
  it("accepts valid answers and drops unknown keys", () =>
    expect(checkAnswers([name, days], { name: "Ann", days: ["Sat"], extra: 1 })).toEqual({
      ok: true,
      answers: { name: "Ann", days: ["Sat"] },
    }));
  it("gives an error on a missing required answer", () => {
    const result = checkAnswers([name, days], { days: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(["name"]);
  });
  it("leaves out empty optional answers", () =>
    expect(checkAnswers([days], {})).toEqual({ ok: true, answers: {} }));
});

describe("displayAnswer", () => {
  it("shows text and checkbox answers", () => {
    expect(displayAnswer(name, "Ann")).toBe("Ann");
    expect(displayAnswer(rules, true)).toBe("Yes");
  });
  it("marks a choice that is no longer an option", () =>
    expect(displayAnswer(days, ["Sat", "Fri"])).toBe("Sat, Fri (no longer an option)"));
  it("marks a removed question", () =>
    expect(displayAnswer(undefined, "x")).toBe("x (question removed)"));
  it("shows an empty answer as a dash", () => expect(displayAnswer(days, undefined)).toBe("-"));
});
