/**
 * @file tests/components/edition/fixtures.ts
 * @desc Shared rows for the public edition component tests.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { PublicMatch, PublicTeam } from "@/services/public-view";

export const TEAMS: PublicTeam[] = [
  {
    id: "t1",
    name: "Haruhi",
    tag: "SOS",
    seed: 1,
    status: "active",
    captainId: 101,
    players: [
      { osuId: 101, username: "Kyon" },
      { osuId: 102, username: null },
    ],
    subs: [],
  },
  {
    id: "t2",
    name: "<b>Bold</b>",
    tag: null,
    seed: 2,
    status: "eliminated",
    captainId: 201,
    players: [{ osuId: 201, username: "Mikuru" }],
    subs: [{ osuId: 202, username: "Yuki" }],
  },
];

export const NAMES = { t1: "Haruhi", t2: "<b>Bold</b>" };

/** A finished SF match: pick/bans, a warmup, then four maps. */
export const MATCH: PublicMatch = {
  id: "m1",
  editionId: "e1",
  roundId: "r1",
  bracketCode: "M1",
  round: "SF",
  a: "t1",
  b: "t2",
  bestOf: 5,
  status: "done",
  scheduledAt: "2026-11-02T18:00:00.000Z",
  scoreA: 3,
  scoreB: 1,
  winner: "a",
  mpLinks: ["https://osu.ppy.sh/mp/111"],
  streamUrl: "https://twitch.tv/egc",
  vodUrl: null,
  refereeIds: [],
  streamerIds: [],
  commentatorIds: [],
  pickBans: [
    { side: "a", action: "ban", slot: "b:NM#1" },
    { side: "b", action: "ban", slot: "b:HD#1" },
    { side: "b", action: "pick", slot: "b:HR#1" },
  ],
  maps: [
    {
      slot: "b:NM#2",
      winner: "a",
      warmup: true,
      aborted: false,
      lineupA: [],
      lineupB: [],
      scores: [],
    },
    {
      slot: "b:HR#1",
      winner: "b",
      warmup: false,
      aborted: false,
      lineupA: [],
      lineupB: [],
      scores: [],
    },
    {
      slot: "b:DT#1",
      winner: "a",
      warmup: false,
      aborted: false,
      lineupA: [],
      lineupB: [],
      scores: [],
    },
  ],
};
