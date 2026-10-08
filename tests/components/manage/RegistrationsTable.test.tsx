/**
 * @file tests/components/manage/RegistrationsTable.test.tsx
 * @desc The review table: answers shown through displayAnswer, selected rows posted as one review.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegistrationsTable } from "@/components/manage/RegistrationsTable";
import type { Question } from "@/schemas/question";
import { makeRegistration } from "../../helpers/records";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => vi.unstubAllGlobals());

const days: Question = {
  id: "days",
  label: "Days",
  help: "",
  required: false,
  type: "multi",
  options: ["Sat", "Sun"],
};
const rows = [
  makeRegistration({ id: "a".repeat(24), answers: { days: ["Sat", "Fri"], gone: "x" } }),
  makeRegistration({
    id: "b".repeat(24),
    osuId: 1002,
    snapshot: { rank: null, country: "DE", username: "other", takenAt: "2026-10-07T00:00:00.000Z" },
  }),
];

describe("RegistrationsTable", () => {
  it("shows answers, marking removed options and questions", () => {
    render(<RegistrationsTable lineage="egc" edition="egc2026" rows={rows} questions={[days]} />);
    expect(screen.getByText("Sat, Fri (no longer an option)")).toBeInTheDocument();
    expect(screen.getByText("x (question removed)")).toBeInTheDocument();
  });

  it("posts one review for the selected rows", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ changed: 2 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<RegistrationsTable lineage="egc" edition="egc2026" rows={rows} questions={[days]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Select ranked" }));
    await user.click(screen.getByRole("checkbox", { name: "Select other" }));
    await user.type(screen.getByLabelText("Note"), "welcome");
    await user.click(screen.getByRole("button", { name: "Approve 2" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/manage/egc/egc2026/registrations/review");
    expect(JSON.parse(init.body as string)).toEqual({
      ids: ["a".repeat(24), "b".repeat(24)],
      to: "approved",
      note: "welcome",
    });
    expect(refresh).toHaveBeenCalled();
  });
});
