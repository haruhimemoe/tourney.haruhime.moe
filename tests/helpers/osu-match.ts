/**
 * @file tests/helpers/osu-match.ts
 * @desc Hand-built osu! multiplayer matches: a raw /matches/{id} page in osu!'s snake_case (for
 *       msw) and the same match as @haruhimemoe/osu's camelCase OsuMatch (for pure functions).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { type OsuMatch, toOsuMatch } from "@haruhimemoe/osu/shapes";
import { HttpResponse, http } from "msw";

/** One game: its map and each player's score (team "none" unless given). */
export type GameInput = {
  beatmapId: number;
  scores: { userId: number; score: number; team?: "red" | "blue" | "none" }[];
  done?: boolean;
};

/**
 * @function rawMatch
 * @param id {number} the match id
 * @param games {GameInput[]} the games in order
 * @returns {unknown} one GET /api/v2/matches/{id} page holding every event
 */
export const rawMatch = (id: number, games: GameInput[]) => {
  const events = games.map((g, i) => ({
    id: i + 1,
    detail: { type: "other", text: null },
    timestamp: "2026-10-10T18:00:00Z",
    user_id: null,
    game: {
      id: id * 100 + i + 1,
      beatmap_id: g.beatmapId,
      start_time: "2026-10-10T18:00:00Z",
      end_time: g.done === false ? null : "2026-10-10T18:05:00Z",
      mode: "osu",
      scoring_type: "scorev2",
      team_type: "head-to-head",
      mods: [],
      scores: g.scores.map((s, slot) => ({
        user_id: s.userId,
        score: s.score,
        accuracy: 0.98,
        max_combo: 500,
        mods: [],
        passed: true,
        statistics: { count_miss: 0 },
        match: { slot, team: s.team ?? "none", pass: true },
      })),
    },
  }));
  return {
    match: { id, name: "EGC: (A) vs (B)", start_time: "2026-10-10T18:00:00Z", end_time: null },
    events,
    users: [],
    first_event_id: 1,
    latest_event_id: events.length,
  };
};

/**
 * @function osuMatch
 * @param id {number} the match id
 * @param games {GameInput[]} the games in order
 * @returns {OsuMatch} the match as the osu! client returns it
 */
export const osuMatch = (id: number, games: GameInput[]): OsuMatch =>
  toOsuMatch(rawMatch(id, games));

/**
 * @function matchHandler
 * @param matches {Record<number, GameInput[]>} games by match id; any other id is a 404
 * @returns {ReturnType<typeof http.get>} the msw handler for osu!'s match endpoint
 */
export const matchHandler = (matches: Record<number, GameInput[]>) =>
  http.get("https://osu.ppy.sh/api/v2/matches/:id", ({ params }) => {
    const id = Number(params.id);
    const games = matches[id];
    return games
      ? HttpResponse.json(rawMatch(id, games))
      : HttpResponse.json({ error: null }, { status: 404 });
  });
