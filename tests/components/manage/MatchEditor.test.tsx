/**
 * @file tests/components/manage/MatchEditor.test.tsx
 * @desc The match editor holds Save back while an mp fill shows an unknown player or an off-pool
 *       map, until the host ticks each one; other problems don't block.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchEditor } from "@/components/manage/MatchEditor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

const MATCH = {
  code: "M1",
  bestOf: 9,
  scoreA: null,
  scoreB: null,
  maps: [],
  pickBans: [],
  mpLinks: [],
  streamUrl: null,
  vodUrl: null,
};

const renderWithFill = async (problems: { code: string; gameId: number; message: string }[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json(200, { maps: [], score: { a: 5, b: 2 }, problems })),
  );
  render(
    <MatchEditor
      lineage="egc"
      edition="egc2026"
      match={MATCH}
      names={{ a: "Team 1", b: "Team 4" }}
      slots={[]}
      pickBans={false}
    />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("mp link"), "https://osu.ppy.sh/mp/1");
  await user.click(screen.getByRole("button", { name: "Fill" }));
  await screen.findByText(/From the mp/);
  return user;
};

describe("MatchEditor", () => {
  it("blocks Save until each unknown player and off-pool map is checked", async () => {
    const user = await renderWithFill([
      { code: "unknown-player", gameId: 1, message: "Player 99 isn't on either side." },
      { code: "off-pool", gameId: 2, message: "Beatmap 777 isn't in the pool." },
    ]);
    const save = screen.getByRole("button", { name: "Save result" });
    expect(save).toHaveProperty("disabled", true);
    const boxes = screen.getAllByLabelText("I checked this, save anyway");
    await user.click(boxes[0] as HTMLElement);
    expect(save).toHaveProperty("disabled", true);
    await user.click(boxes[1] as HTMLElement);
    expect(save).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Team 1 maps")).toHaveProperty("value", "5");
  });

  it("doesn't block on other problems", async () => {
    await renderWithFill([{ code: "aborted", gameId: 3, message: "Game 3 was aborted." }]);
    expect(screen.getByRole("button", { name: "Save result" })).toHaveProperty("disabled", false);
    expect(screen.queryByLabelText("I checked this, save anyway")).toBeNull();
  });
});
