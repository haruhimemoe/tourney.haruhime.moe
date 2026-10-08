/**
 * @file tests/components/manage/QuestionBuilder.test.tsx
 * @desc The question builder: add, reorder, remove, and no 31st question.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuestionBuilder } from "@/components/manage/QuestionBuilder";
import type { Question } from "@/schemas/question";

const text = (id: string, label: string): Question => ({
  id,
  label,
  help: "",
  required: false,
  type: "text",
});

let latest: Question[] = [];
function Harness({ initial }: { initial: Question[] }) {
  const [value, setValue] = useState(initial);
  latest = value;
  return <QuestionBuilder value={value} onChange={setValue} />;
}

describe("QuestionBuilder", () => {
  it("adds a question and edits its label", async () => {
    render(<Harness initial={[]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await user.type(screen.getByLabelText("Question 1"), "Discord");
    expect(latest).toMatchObject([{ label: "Discord", type: "text", required: false }]);
  });

  it("reorders with the move buttons and removes", async () => {
    render(<Harness initial={[text("a", "First"), text("b", "Second")]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Move First down" }));
    expect(latest.map((x) => x.id)).toEqual(["b", "a"]);
    await user.click(screen.getByRole("button", { name: "Remove Second" }));
    expect(latest.map((x) => x.id)).toEqual(["a"]);
  });

  it("gives choice questions options", async () => {
    render(<Harness initial={[text("a", "Day")]} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Type of Day"), "choice");
    await user.type(screen.getByLabelText("Options for Day"), "Sat{Enter}Sun");
    expect(latest[0]).toMatchObject({ type: "choice", options: ["Sat", "Sun"] });
  });

  it("refuses a 31st question", () => {
    render(<Harness initial={Array.from({ length: 30 }, (_, i) => text(`q${i}`, `Q${i}`))} />);
    expect(screen.getByRole("button", { name: "Add question" })).toBeDisabled();
    expect(screen.getByText(/30 questions at most/)).toBeInTheDocument();
  });
});
