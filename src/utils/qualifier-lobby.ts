/**
 * @file src/utils/qualifier-lobby.ts
 * @desc A qualifier lobby read into team scores: many teams share one mp, so each score goes to
 *       the team whose roster or subs hold its player, and a team's score on a map is the sum of
 *       its players'. A map played twice keeps the later game. Unknown players, maps outside the
 *       pool and unfinished games are listed as problems (the library's MatchProblem shape) and
 *       left out; nothing here saves.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { OsuMatch } from "@haruhimemoe/osu/shapes";
import type { MatchProblem } from "@haruhimemoe/tourney/mp";

/** One team's score on one pool slot. */
export type QualifierScoreRow = { teamId: string; slotKey: string; score: number };

/** A team as the lobby needs it. */
export type LobbyTeam = { id: string; roster: readonly number[]; subs: readonly number[] };

/**
 * @function qualifierLobby
 * @param osu {OsuMatch} the lobby
 * @param pool {{ slots: readonly { beatmapId: number; slotKey: string }[] }} the round's pool
 * @param teams {readonly LobbyTeam[]} the edition's teams
 * @returns {{ rows: QualifierScoreRow[]; problems: MatchProblem[] }} scores by team then slot
 *          order of first appearance, and what was left out
 */
export const qualifierLobby = (
  osu: OsuMatch,
  pool: { slots: readonly { beatmapId: number; slotKey: string }[] },
  teams: readonly LobbyTeam[],
): { rows: QualifierScoreRow[]; problems: MatchProblem[] } => {
  const slotOf = new Map(pool.slots.map((s) => [s.beatmapId, s.slotKey]));
  const teamOf = new Map<number, string>();
  for (const t of teams) for (const id of [...t.roster, ...t.subs]) teamOf.set(id, t.id);
  const problems: MatchProblem[] = [];
  const totals = new Map<string, Map<string, number>>();
  for (const event of osu.events) {
    const game = event.game;
    if (!game) continue;
    if (game.endTime === null) {
      problems.push({
        code: "in-progress",
        gameId: game.id,
        message: "This map is still being played.",
      });
      continue;
    }
    const key = slotOf.get(game.beatmapId);
    if (!key) {
      problems.push({
        code: "off-pool",
        gameId: game.id,
        message: `Beatmap ${game.beatmapId} isn't in this round's pool.`,
      });
      continue;
    }
    const sums = new Map<string, number>();
    for (const s of game.scores) {
      const teamId = teamOf.get(s.userId);
      if (!teamId) {
        problems.push({
          code: "unknown-player",
          gameId: game.id,
          message: `Player ${s.userId} isn't on any team in this edition.`,
        });
        continue;
      }
      sums.set(teamId, (sums.get(teamId) ?? 0) + s.score);
    }
    for (const [teamId, score] of sums) {
      const byTeam = totals.get(teamId) ?? new Map<string, number>();
      byTeam.set(key, score);
      totals.set(teamId, byTeam);
    }
  }
  const rows = teams.flatMap((t) =>
    [...(totals.get(t.id) ?? new Map<string, number>())].map(([slotKey, score]) => ({
      teamId: t.id,
      slotKey,
      score,
    })),
  );
  return { rows, problems };
};
