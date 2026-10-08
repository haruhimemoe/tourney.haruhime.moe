/**
 * @file tests/components/registration/RegisterForm.test.tsx
 * @desc The registration form: every question type renders, a missing required answer blocks the
 *       submit, a refusal keeps the answers and shows the field's error, a 409 shows the
 *       registered state.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/registration/RegisterForm";
import type { Question } from "@/schemas/question";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

const q = (id: string, type: Question["type"], label: string, required = false): Question =>
  type === "choice" || type === "multi"
    ? { id, type, label, required, help: "", options: ["Sat", "Sun"] }
    : { id, type, label, required, help: "" };

const ALL: Question[] = [
  q("discord", "text", "Discord name", true),
  q("about", "longText", "About you"),
  q("age", "number", "Age"),
  q("link", "url", "Profile link"),
  q("rules", "checkbox", "I read the rules"),
  q("day", "choice", "Best day"),
  q("days", "multi", "Free days"),
];

const props = {
  lineage: "egc",
  edition: "egc2026",
  questions: ALL,
  teamMode: false,
  existing: null,
};

describe("RegisterForm", () => {
  it("renders every question type", () => {
    render(<RegisterForm {...props} />);
    for (const label of ["Discord name", "About you", "Age", "Profile link", "I read the rules"]) {
      expect(screen.getByLabelText(label, { exact: false })).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: /Best day/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Free days/ })).toBeInTheDocument();
  });

  it("blocks the submit when a required answer is missing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<RegisterForm {...props} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Register" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText("This question needs an answer.")).toBeInTheDocument();
  });

  it("keeps the answers and shows the field error after a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(422, { error: { code: "bad-input", message: "x", errors: { discord: "Too long." } } }),
      ),
    );
    render(<RegisterForm {...props} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Discord name", { exact: false }), "ann");
    await user.click(screen.getByRole("radio", { name: "Sun" }));
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByText("Too long.")).toBeInTheDocument();
    expect(screen.getByLabelText("Discord name", { exact: false })).toHaveValue("ann");
    expect(screen.getByRole("radio", { name: "Sun" })).toBeChecked();
  });

  it("posts the answers and the team in team editions", async () => {
    const fetch = vi.fn(async () => json(201, { registration: { status: "pending" } }));
    vi.stubGlobal("fetch", fetch);
    render(<RegisterForm {...props} questions={[]} teamMode />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Team name"), "Pines");
    await user.type(screen.getByLabelText("Teammates", { exact: false }), "2002, 2003");
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(fetch).toHaveBeenCalledWith(
      "/api/editions/egc/egc2026/registration",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      answers: {},
      team: { name: "Pines", tag: null, members: [2002, 2003] },
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the registered state on a 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(409, {
          error: { code: "already-registered", message: "x", existing: { status: "pending" } },
        }),
      ),
    );
    render(<RegisterForm {...props} questions={[]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
