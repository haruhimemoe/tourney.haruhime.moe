/**
 * @file tests/components/manage/CreateEditionForm.test.tsx
 * @desc The create form: the slug preview follows the code, a submit into an existing lineage
 *       posts the edition's JSON and goes to its page, a new lineage is posted first, and a
 *       refusal shows the error map's message.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateEditionForm } from "@/components/manage/CreateEditionForm";
import { ERROR_MESSAGES } from "@/constants/errors";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

const fill = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Edition name"), "Evergreen Cup 2026");
  await user.type(screen.getByLabelText("Code"), "EGC 2026");
  await user.click(screen.getByRole("radio", { name: "2v2" }));
  return user;
};

describe("CreateEditionForm", () => {
  it("previews the slug and posts the edition", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      json(201, { edition: { slug: "egc-2026" } }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<CreateEditionForm lineages={[{ slug: "egc", name: "Evergreen Cup" }]} year={2026} />);
    const user = await fill();
    expect(screen.getByText("/egc/egc-2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create edition" }));
    expect(fetch).toHaveBeenCalledWith("/api/manage/egc/editions", expect.anything());
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      name: "Evergreen Cup 2026",
      code: "EGC 2026",
      mode: "osu",
      sides: { kind: "team", lineup: 2, rosterMin: 2, rosterMax: 4, subsMax: 2 },
      year: 2026,
      dates: { start: null, end: null },
    });
    expect(push).toHaveBeenCalledWith("/manage/egc/egc-2026");
  });

  it("posts a new lineage first", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(201, { lineage: { slug: "new-cup" } }))
      .mockResolvedValueOnce(json(201, { edition: { slug: "egc-2026" } }));
    vi.stubGlobal("fetch", fetch);
    render(<CreateEditionForm lineages={[]} year={2026} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Series name"), "New Cup");
    await user.type(screen.getByLabelText("Series address"), "new-cup");
    await fill();
    await user.click(screen.getByRole("button", { name: "Create edition" }));
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/manage/lineages");
    expect(fetch.mock.calls[1]?.[0]).toBe("/api/manage/new-cup/editions");
  });

  it("shows the error map's message on a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(409, { error: { code: "slug-taken", message: ERROR_MESSAGES["slug-taken"] } }),
      ),
    );
    render(<CreateEditionForm lineages={[{ slug: "egc", name: "Evergreen Cup" }]} year={2026} />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Create edition" }));
    expect(await screen.findByText(ERROR_MESSAGES["slug-taken"])).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
