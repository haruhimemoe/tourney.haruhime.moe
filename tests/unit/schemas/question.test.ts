/**
 * @file tests/unit/schemas/question.test.ts
 * @desc Questions need options when they offer a choice, and answers are checked by question type.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { answerSchemaFor, QuestionSchema } from "@/schemas/question";

const q = (fields: object) =>
  QuestionSchema.parse({ id: "q", label: "Q", help: "", required: true, ...fields });

describe("questions", () => {
  it("needs options on a choice", () => {
    expect(
      QuestionSchema.safeParse({
        id: "q1",
        type: "choice",
        label: "Pick",
        help: "",
        required: true,
        options: ["a"],
      }).success,
    ).toBe(false);
  });
  it("checks multi answers", () => {
    const multi = answerSchemaFor(q({ type: "multi", options: ["Sat", "Sun"] }));
    expect(multi.safeParse(["Sat"]).success).toBe(true);
    expect(multi.safeParse(["Mon"]).success).toBe(false);
    expect(multi.safeParse([]).success).toBe(false);
  });
  it.each([
    ["text", "hi", ""],
    ["longText", "a long answer", "   "],
    ["number", 3, "3"],
    ["url", "https://osu.ppy.sh", "not a url"],
    ["checkbox", true, false],
  ])("checks %s answers", (type, good, bad) => {
    const schema = answerSchemaFor(q({ type }));
    expect(schema.safeParse(good).success).toBe(true);
    expect(schema.safeParse(bad).success).toBe(false);
  });
  it("checks choice answers", () => {
    const choice = answerSchemaFor(q({ type: "choice", options: ["a", "b"] }));
    expect(choice.safeParse("a").success).toBe(true);
    expect(choice.safeParse("c").success).toBe(false);
  });
  it("lets an optional answer be missing", () => {
    expect(answerSchemaFor(q({ type: "text", required: false })).safeParse(undefined).success).toBe(
      true,
    );
    expect(answerSchemaFor(q({ type: "checkbox", required: false })).safeParse(false).success).toBe(
      true,
    );
  });
});
