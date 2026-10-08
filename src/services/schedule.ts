/**
 * @file src/services/schedule.ts
 * @desc Match times: set by hand (inside the round's window when it has one), suggested by the
 *       library's suggestMatchTimes from both rosters' availability (the higher seed's players
 *       break ties; a side is ready once as many players as the lineup are free), or filled for
 *       a whole round. A roster lists osu! ids; a player's
 *       availability is found through their registration's account (the edition's own grid,
 *       else their default). Players without one are skipped, as the library skips no data.
 *       Times are stored as UTC ISO instants.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import type { Member, SlotCandidate } from "@haruhimemoe/time/slots";
import { type ScheduleSide, suggestMatchTimes } from "@haruhimemoe/tourney";
import { collections, type Doc, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { StoredMatch } from "@/schemas/match";
import type { StoredRound } from "@/schemas/round";
import type { StoredTeam } from "@/schemas/team";
import { getAvailability } from "@/services/availability";
import { getEditionById } from "@/services/editions";
import { listRounds } from "@/services/rounds";
import { listTeams } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

/** How many suggestions a match gets by default. */
export const DEFAULT_SUGGESTIONS = 5;

/**
 * @function lengthMinutes
 * @param bestOf {number} the match's best-of
 * @returns {number} how long to keep free: 30 minutes plus 7 a map
 */
export const lengthMinutes = (bestOf: number): number => 30 + bestOf * 7;

const db = async () => {
  await connectDb();
  return collections(getDb());
};

const findMatch = async (editionId: string, code: string) =>
  (await db()).matches.findOne({ editionId, bracketCode: code });

const roundOf = async (editionId: string, code: string): Promise<StoredRound | undefined> =>
  (await listRounds(editionId)).find((r) => r.code === code);

const isOpen = (m: Doc<StoredMatch>) => m.status === "scheduled" || m.status === "live";

/**
 * @function setMatchTime
 * @param editionId {string} the edition
 * @param code {string} the match code
 * @param at {string | null} an ISO instant, or null to clear
 * @returns {Promise<AppResult<StoredMatch>>} the match; not-found, bad-input for a time that
 *          isn't one, outside-window when the round has a window and the time falls outside it
 */
export const setMatchTime = async (
  editionId: string,
  code: string,
  at: string | null,
): Promise<AppResult<StoredMatch>> => {
  const doc = await findMatch(editionId, code);
  if (!doc) return fail("not-found");
  let scheduledAt: string | null = null;
  if (at !== null) {
    const t = Date.parse(at);
    if (Number.isNaN(t)) return fail("bad-input", "That isn't a date and time.");
    const window = (await roundOf(editionId, doc.round))?.window;
    if (window && (t < Date.parse(window.start) || t >= Date.parse(window.end)))
      return fail("outside-window");
    scheduledAt = new Date(t).toISOString();
  }
  await (await db()).matches.updateOne({ _id: doc._id }, { $set: { scheduledAt } });
  return ok(toId({ ...doc, scheduledAt }));
};

/**
 * @function membersOf
 * @param editionId {string} the edition
 * @param team {StoredTeam} a team
 * @returns {Promise<Member[]>} its roster with each player's availability (null without an
 *          account or a grid)
 */
const membersOf = async (editionId: string, team: StoredTeam): Promise<Member[]> => {
  const regs = await (await db()).registrations
    .find({ editionId, osuId: { $in: team.roster } })
    .toArray();
  const account = new Map(regs.map((r) => [r.osuId, r.userId]));
  return Promise.all(
    team.roster.map(async (osuId) => {
      const userId = account.get(osuId);
      const row = userId
        ? ((await getAvailability(userId, editionId)) ?? (await getAvailability(userId, null)))
        : null;
      return { id: String(osuId), availability: row?.grid ?? null };
    }),
  );
};

/**
 * @function suggestFor
 * @param editionId {string} the edition
 * @param code {string} the match code
 * @param limit {number} how many suggestions
 * @returns {Promise<AppResult<SlotCandidate[]>>} start times, best first; not-found, bad-state
 *          while a side is unknown or the round has no window, or the library's error
 */
export const suggestFor = async (
  editionId: string,
  code: string,
  limit = DEFAULT_SUGGESTIONS,
): Promise<AppResult<SlotCandidate[]>> => {
  const doc = await findMatch(editionId, code);
  if (!doc) return fail("not-found");
  if (!doc.a || !doc.b) return fail("bad-state", "Both sides have to be known first.");
  const window = (await roundOf(editionId, doc.round))?.window;
  if (!window) return fail("bad-state", "Set the round's window first.");
  const edition = await getEditionById(editionId);
  const need = edition?.sides.lineup;
  const teams = new Map((await listTeams(editionId)).map((t) => [t.id, t]));
  const side = async (id: string): Promise<ScheduleSide | null> => {
    const team = teams.get(id);
    if (!team) return null;
    const members = await membersOf(editionId, team);
    const known = members.filter((m) => m.availability?.slots.length).length;
    // A lineup bigger than the players with a grid would leave the side never ready.
    return { id, seed: team.seed, members, need: Math.min(need ?? known, known) };
  };
  const [a, b] = await Promise.all([side(doc.a), side(doc.b)]);
  if (!a || !b) return fail("not-found");
  const result = suggestMatchTimes({
    a,
    b,
    window: { start: new Date(window.start), end: new Date(window.end) },
    lengthMinutes: lengthMinutes(doc.bestOf),
    limit,
  });
  return result.ok ? ok(result.value) : fail(result.error.code, result.error.message);
};

/**
 * @function fillRound
 * @param editionId {string} the edition
 * @param roundCode {string} the round
 * @returns {Promise<{ filled: number; skipped: string[] }>} how many untimed matches got their
 *          best suggestion, and the codes left untimed (a side unknown, or no time found).
 *          Timed and finished matches are left alone.
 */
export const fillRound = async (
  editionId: string,
  roundCode: string,
): Promise<{ filled: number; skipped: string[] }> => {
  const { matches } = await db();
  const open = (
    await matches
      .find({ editionId, round: roundCode, scheduledAt: null })
      .sort({ bracketCode: 1 })
      .toArray()
  ).filter(isOpen);
  let filled = 0;
  const skipped: string[] = [];
  for (const m of open) {
    const code = m.bracketCode ?? "";
    const best = await suggestFor(editionId, code, 1);
    const first = best.ok ? best.value[0] : undefined;
    if (!first) {
      skipped.push(code);
      continue;
    }
    await matches.updateOne({ _id: m._id }, { $set: { scheduledAt: first.start.toISOString() } });
    filled++;
  }
  return { filled, skipped };
};
