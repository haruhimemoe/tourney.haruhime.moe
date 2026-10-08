/**
 * @file tests/unit/utils/qualifier-lobby.test.ts
 * @desc qualifierLobby: team scores per map from a lobby with several teams, problems for
 *       unknown players, off-pool maps and unfinished games, and a replayed map keeping the
 *       later score.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { slotKey } from "@haruhimemoe/pool";
import { describe, expect, it } from "vitest";
import { qualifierLobby } from "@/utils/qualifier-lobby";
import { osuMatch } from "../../helpers/osu-match";

const slot = (mod: string, index: number, beatmapId: number) => ({
  mod,
  index,
  beatmapId,
  slotKey: slotKey({ mod, index }),
});
const POOL = { slots: [slot("NM", 1, 101), slot("HD", 1, 201)] };
const NM1 = slotKey({ mod: "NM", index: 1 });
const HD1 = slotKey({ mod: "HD", index: 1 });
const TEAMS = [
  { id: "ta", roster: [1, 2], subs: [] },
  { id: "tb", roster: [3, 4], subs: [5] },
];

describe("qualifierLobby", () => {
  it("sums each team's players per map", () => {
    const lobby = osuMatch(1, [
      {
        beatmapId: 101,
        scores: [
          { userId: 1, score: 100 },
          { userId: 2, score: 200 },
          { userId: 3, score: 50 },
          { userId: 5, score: 25 },
        ],
      },
      { beatmapId: 201, scores: [{ userId: 4, score: 70 }] },
    ]);
    const { rows, problems } = qualifierLobby(lobby, POOL, TEAMS);
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { teamId: "ta", slotKey: NM1, score: 300 },
      { teamId: "tb", slotKey: NM1, score: 75 },
      { teamId: "tb", slotKey: HD1, score: 70 },
    ]);
  });

  it("lists an unknown player and an off-pool map, and leaves them out", () => {
    const lobby = osuMatch(2, [
      {
        beatmapId: 101,
        scores: [
          { userId: 1, score: 100 },
          { userId: 99, score: 999 },
        ],
      },
      { beatmapId: 777, scores: [{ userId: 1, score: 5 }] },
    ]);
    const { rows, problems } = qualifierLobby(lobby, POOL, TEAMS);
    expect(rows).toEqual([{ teamId: "ta", slotKey: NM1, score: 100 }]);
    expect(problems.map((p) => p.code)).toEqual(["unknown-player", "off-pool"]);
    expect(problems[0]?.message).toContain("99");
  });

  it("keeps a replayed map's later score and flags an unfinished game", () => {
    const lobby = osuMatch(3, [
      { beatmapId: 101, scores: [{ userId: 1, score: 10 }] },
      { beatmapId: 101, scores: [{ userId: 1, score: 40 }] },
      { beatmapId: 201, scores: [{ userId: 1, score: 1 }], done: false },
    ]);
    const { rows, problems } = qualifierLobby(lobby, POOL, TEAMS);
    expect(rows).toEqual([{ teamId: "ta", slotKey: NM1, score: 40 }]);
    expect(problems.map((p) => p.code)).toEqual(["in-progress"]);
  });
});
