/**
 * @file src/services/match-results.ts
 * @desc Entering a match's result. By hand: a score (or map rows the score is counted from) with
 *       optional pick/bans, checked by the library (checkPickBans against the round's pool and the
 *       edition's rules, checkScore against the best-of) before the bracket moves. From an mp
 *       link: a preview built by the library's fromOsuMatch with each side's players from the team
 *       rosters; it never saves, the host does. A round with no pool, or pools.haruhime.moe
 *       down, still takes a typed score.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import {
  type Bracket,
  checkPickBans,
  checkScore,
  type FirstTurns,
  type MapResult,
  type PickBanEntry,
  scoreFromMaps,
} from "@haruhimemoe/tourney";
import { type FromOsuResult, fromOsuMatch, type MpSides } from "@haruhimemoe/tourney/mp";
import { collections, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { getPool, type LinkedPool } from "@/lib/pools-client";
import type { StoredMatch } from "@/schemas/match";
import { applyResult } from "@/services/brackets";
import { getEditionById } from "@/services/editions";
import { fetchMatch } from "@/services/osu-match";
import { listRounds } from "@/services/rounds";
import { groupResult } from "@/services/stages";
import { listTeams } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

/** What a host saves for a match. Either `score` or counted `maps` gives the result. */
export type ResultInput = {
  score?: { a: number; b: number };
  maps: MapResult[];
  pickBans: PickBanEntry[];
  first?: FirstTurns;
  mpLinks: string[];
  streamUrl: string | null;
  vodUrl: string | null;
};

/** Options for reading an mp link: warmups to skip, games to leave out, team colours. */
export type FillOptions = {
  warmups: number;
  skip: number[];
  colours?: { a: "red" | "blue" };
};

const STAGE_ROUND = /^(GS|SW)\d+$/;

const findMatch = async (editionId: string, code: string) => {
  await connectDb();
  return collections(getDb()).matches.findOne({ editionId, bracketCode: code });
};

/**
 * @function poolFor
 * @param editionId {string} the edition
 * @param round {string} the match's round code
 * @returns {Promise<AppResult<LinkedPool>>} the round's pool; bad-state when none is linked,
 *          else the pool reader's error
 */
const poolFor = async (editionId: string, round: string): Promise<AppResult<LinkedPool>> => {
  const poolId = (await listRounds(editionId)).find((r) => r.code === round)?.poolId;
  if (!poolId)
    return fail("bad-state", "This round has no pool linked. Link one on the rounds page.");
  return getPool(poolId);
};

/**
 * @function sidesOf
 * @param editionId {string} the edition
 * @param match {{ a: string | null; b: string | null }} the match's teams
 * @param colours {FillOptions["colours"]} the colour side a played as in a team-vs lobby
 * @returns {Promise<AppResult<MpSides>>} each side's players (roster and subs); bad-state while a
 *          side is unknown (fromOsuMatch checks the sides themselves)
 */
const sidesOf = async (
  editionId: string,
  match: { a: string | null; b: string | null },
  colours?: FillOptions["colours"],
): Promise<AppResult<MpSides>> => {
  if (!match.a || !match.b) return fail("bad-state", "Both sides have to be known first.");
  const teams = new Map((await listTeams(editionId)).map((t) => [t.id, t]));
  const a = teams.get(match.a);
  const b = teams.get(match.b);
  if (!a || !b) return fail("not-found");
  const other = colours?.a === "red" ? "blue" : "red";
  return ok({
    a: { players: [...a.roster, ...a.subs], ...(colours ? { team: colours.a } : {}) },
    b: { players: [...b.roster, ...b.subs], ...(colours ? { team: other } : {}) },
  });
};

/**
 * @function previewFill
 * @param editionId {string} the edition
 * @param code {string} the match code
 * @param mpLink {string} the match's mp link
 * @param options {FillOptions} warmups, games to skip, colours
 * @param beforeCall {() => Promise<boolean>} the osu! budget gate
 * @returns {Promise<AppResult<FromOsuResult & { sides: MpSides }>>} the maps, score, winner and
 *          problems the library found, and the sides used; nothing is saved
 */
export const previewFill = async (
  editionId: string,
  code: string,
  mpLink: string,
  options: FillOptions,
  beforeCall?: () => Promise<boolean>,
): Promise<AppResult<FromOsuResult & { sides: MpSides }>> => {
  const doc = await findMatch(editionId, code);
  if (!doc) return fail("not-found");
  const sides = await sidesOf(editionId, doc, options.colours);
  if (!sides.ok) return sides;
  const pool = await poolFor(editionId, doc.round);
  if (!pool.ok) return pool;
  const osu = await fetchMatch(mpLink, beforeCall);
  if (!osu.ok) return osu;
  const read = fromOsuMatch(osu.value, {
    pool: pool.value,
    sides: sides.value,
    warmups: options.warmups,
    skip: options.skip,
    bestOf: doc.bestOf,
  });
  if (!read.ok) return fail(read.error.code, read.error.message);
  return ok({ ...read.value, sides: sides.value });
};

/**
 * @function saveResult
 * @param editionId {string} the edition
 * @param code {string} the match code
 * @param input {ResultInput} the score or maps, pick/bans, links
 * @returns {Promise<AppResult<{ bracket: Bracket | null; match: StoredMatch }>>} the saved match
 *          (and the main bracket after it moved; null for a group or swiss match); bad-input
 *          without a score, the library's pick/ban and score errors, pool-unavailable when
 *          pick/bans can't be checked, or the bracket's refusals
 */
export const saveResult = async (
  editionId: string,
  code: string,
  input: ResultInput,
): Promise<AppResult<{ bracket: Bracket | null; match: StoredMatch }>> => {
  const doc = await findMatch(editionId, code);
  if (!doc) return fail("not-found");
  const counted = input.maps.length ? scoreFromMaps(input.maps) : null;
  const score = counted ?? input.score;
  if (!score) return fail("bad-input", "Enter a score or the maps played.");
  const winner = checkScore(doc.bestOf, score.a, score.b);
  if (!winner.ok) return fail(winner.error.code, winner.error.message);
  const rules = (await getEditionById(editionId))?.pickBanRules;
  if (input.pickBans.length && rules) {
    if (!input.first) return fail("bad-input", "Say who banned and picked first.");
    const pool = await poolFor(editionId, doc.round);
    if (!pool.ok) return pool;
    const checked = checkPickBans(input.pickBans, {
      pool: pool.value,
      rules,
      bestOf: doc.bestOf,
      first: input.first,
      score,
    });
    if (!checked.ok) return fail(checked.error.code, checked.error.message);
  }
  const patch = {
    maps: input.maps,
    pickBans: input.pickBans,
    mpLinks: input.mpLinks,
    streamUrl: input.streamUrl,
    vodUrl: input.vodUrl,
  };
  if (STAGE_ROUND.test(doc.round)) {
    const saved = await groupResult(editionId, code, { scoreA: score.a, scoreB: score.b });
    if (!saved.ok) return saved;
    await collections(getDb()).matches.updateOne({ _id: doc._id }, { $set: patch });
    return ok({ bracket: null, match: { ...saved.value, ...patch } });
  }
  const applied = await applyResult(editionId, code, { scoreA: score.a, scoreB: score.b }, patch);
  return applied.ok ? ok(applied.value) : applied;
};

/**
 * @function getMatch
 * @param editionId {string} the edition
 * @param code {string} the match code
 * @returns {Promise<StoredMatch | null>} the match, or null
 */
export const getMatch = async (editionId: string, code: string): Promise<StoredMatch | null> => {
  const doc = await findMatch(editionId, code);
  return doc ? toId(doc) : null;
};
