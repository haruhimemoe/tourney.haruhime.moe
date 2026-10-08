/**
 * @file src/services/brackets.ts
 * @desc The main bracket, stored whole as the library's Bracket with a `version`. Every change is
 *       one library call (createBracket, reportResult, reportForfeit, clearResult) whose bracket
 *       is saved with the match documents it touched in one transaction, behind a version check
 *       (src/lib/transaction.ts retries a conflict). The bracket says who plays whom; a match
 *       document holds everything said about the game. Byes get no match document.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import {
  type Bracket,
  type BracketMatch,
  champion,
  clearResult,
  createBracket,
  hasResult,
  type Placement,
  placements,
  reportForfeit,
  reportResult,
  type Side,
} from "@haruhimemoe/tourney";
import { type ClientSession, ObjectId } from "mongodb";
import { collections, type Doc, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { inTransaction, VersionConflict } from "@/lib/transaction";
import type { StoredBracket } from "@/schemas/bracket";
import type { StoredMatch } from "@/schemas/match";
import { getEditionById } from "@/services/editions";
import { ladderOptions, syncRounds } from "@/services/rounds";
import { listTeams } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

/** Round codes of stages outside the main bracket (groups, swiss): their matches stay put. */
const OTHER_STAGE_ROUND = /^(GS|SW)\d/;

/** The match fields a bracket change sets. */
type BracketFields = Pick<
  StoredMatch,
  "a" | "b" | "bestOf" | "status" | "scoreA" | "scoreB" | "winner"
>;

const mainFilter = (editionId: string) => ({ editionId, stage: "main" as const });

/**
 * @function getBracket
 * @param editionId {string} the edition
 * @returns {Promise<StoredBracket | null>} its main bracket, or null before one is made
 */
export const getBracket = async (editionId: string): Promise<StoredBracket | null> => {
  await connectDb();
  const doc = await collections(getDb()).brackets.findOne(mainFilter(editionId));
  return doc ? toId(doc) : null;
};

/**
 * @function fieldsOf
 * @param m {BracketMatch} a bracket match
 * @returns {BracketFields} what its match document shows: the sides once known, the result,
 *          and the status (a skipped reset is cancelled; anything not decided is scheduled)
 */
const fieldsOf = (m: BracketMatch): BracketFields => ({
  a: m.a.entrant,
  b: m.b.entrant,
  bestOf: m.bestOf,
  status:
    m.status === "done" || m.status === "forfeit"
      ? m.status
      : m.status === "skipped"
        ? "cancelled"
        : "scheduled",
  scoreA: m.scoreA,
  scoreB: m.scoreB,
  winner: m.winner,
});

const sameFields = (x: BracketFields, y: BracketFields) =>
  (Object.keys(x) as (keyof BracketFields)[]).every((k) => x[k] === y[k]);

/**
 * @function generateBracket
 * @param editionId {string} the edition
 * @returns {Promise<AppResult<Bracket>>} the new bracket (version 1) with a match document per
 *          non-bye match; bad-state without a config, seeds-missing, bracket-has-results, or the
 *          library's error
 */
export const generateBracket = async (editionId: string): Promise<AppResult<Bracket>> => {
  const edition = await getEditionById(editionId);
  if (!edition) return fail("not-found");
  const config = edition.bracket;
  if (!config) return fail("bad-state", "Set the bracket's size and format first.");
  const teams = (await listTeams(editionId)).filter((t) => t.status === "active");
  if (teams.length < 2 || teams.some((t) => t.seed === null)) return fail("seeds-missing");
  const entrants = [...teams].sort((x, y) => (x.seed ?? 0) - (y.seed ?? 0)).map((t) => t.id);
  const rounds = await syncRounds({ ...edition, bracket: { ...config, size: entrants.length } });
  if (!rounds.ok) return rounds;
  const roundId = new Map(rounds.value.map((r) => [r.code, r.id]));
  const { bestOf, grandFinalReset, thirdPlace } = ladderOptions(
    { ...config, size: entrants.length },
    false,
  );
  const built = createBracket({
    entrants,
    format: config.format,
    bestOf,
    grandFinalReset,
    thirdPlace,
  });
  if (!built.ok) return fail(built.error.code, built.error.message);
  const bracket = built.value;
  return inTransaction(async (session) => {
    const db = getDb();
    const { brackets, matches } = collections(db);
    const played = await matches.countDocuments(
      { editionId, round: { $not: OTHER_STAGE_ROUND }, status: { $in: ["done", "forfeit"] } },
      { session },
    );
    const stored = await brackets.findOne(mainFilter(editionId), { session });
    if (played > 0 || stored?.bracket?.matches.some(hasResult)) return fail("bracket-has-results");
    await brackets.updateOne(
      mainFilter(editionId),
      {
        $set: { bracket, version: 1, state: null },
        $setOnInsert: { _id: new ObjectId() },
      },
      { upsert: true, session },
    );
    const kept = bracket.matches.filter((m) => m.status !== "bye");
    await matches.deleteMany(
      {
        editionId,
        round: { $not: OTHER_STAGE_ROUND },
        bracketCode: { $nin: kept.map((m) => m.code) },
      },
      { session },
    );
    for (const m of kept) {
      await matches.updateOne(
        { editionId, bracketCode: m.code },
        {
          $set: { ...fieldsOf(m), round: m.round, roundId: roundId.get(m.round) ?? "" },
          $setOnInsert: {
            _id: new ObjectId(),
            scheduledAt: null,
            mpLinks: [],
            streamUrl: null,
            vodUrl: null,
            refereeIds: [],
            streamerIds: [],
            commentatorIds: [],
            pickBans: [],
            maps: [],
            reschedules: [],
            notes: null,
          },
        },
        { upsert: true, session },
      );
    }
    return ok(bracket);
  });
};

/**
 * @function change
 * @param editionId {string} the edition
 * @param code {string} the bracket match changed
 * @param step {(bracket: Bracket, match: BracketMatch) => AppResult<Bracket>} the library calls
 * @param matchPatch {Partial<StoredMatch>} more to save on that match's document (maps, links)
 * @returns {Promise<AppResult<{ bracket: Bracket; match: StoredMatch }>>} the saved bracket and
 *          match, or the refusal; the bracket's version goes up by one
 */
const change = (
  editionId: string,
  code: string,
  step: (bracket: Bracket, match: BracketMatch) => AppResult<Bracket>,
  matchPatch: Partial<StoredMatch> = {},
): Promise<AppResult<{ bracket: Bracket; match: StoredMatch }>> =>
  inTransaction(async (session: ClientSession) => {
    const { brackets, matches } = collections(getDb());
    const stored = await brackets.findOne(mainFilter(editionId), { session });
    if (!stored?.bracket) return fail("bad-state", "Make the bracket first.");
    const before = stored.bracket;
    const target = before.matches.find((m) => m.code === code);
    if (!target) return fail("not-found");
    const next = step(before, target);
    if (!next.ok) return fail(next.error.code, next.error.message);
    const saved = await brackets.updateOne(
      { _id: stored._id, version: stored.version },
      { $set: { bracket: next.value, version: stored.version + 1 } },
      { session },
    );
    if (saved.matchedCount === 0) throw new VersionConflict();
    const old = new Map(before.matches.map((m) => [m.code, m]));
    for (const m of next.value.matches) {
      const prev = old.get(m.code);
      if (m.code !== code && prev && sameFields(fieldsOf(prev), fieldsOf(m))) continue;
      const {
        id: _id,
        editionId: _e,
        roundId: _r,
        bracketCode: _c,
        ...extra
      } = m.code === code ? matchPatch : {};
      await matches.updateOne(
        { editionId, bracketCode: m.code },
        { $set: { ...extra, ...fieldsOf(m) } },
        { session },
      );
    }
    const doc = await matches.findOne({ editionId, bracketCode: code }, { session });
    if (!doc) return fail("not-found");
    return ok({ bracket: next.value, match: toId(doc as Doc<StoredMatch>) });
  });

/** Clears a match's result first when it has one, so a correction is one change. */
const cleared = (bracket: Bracket, match: BracketMatch): AppResult<Bracket> =>
  hasResult(match) ? clearResult(bracket, match.code) : ok(bracket);

/**
 * @function applyResult
 * @param editionId {string} the edition
 * @param code {string} the bracket match
 * @param score {{ scoreA: number; scoreB: number }} the maps each side won
 * @param matchPatch {Partial<StoredMatch>} the rest to save on the match (maps, pick/bans, links)
 * @returns {Promise<AppResult<{ bracket: Bracket; match: StoredMatch }>>} both saved; a match that
 *          already has a result is corrected (refused out-of-order once a later match is played)
 */
export const applyResult = (
  editionId: string,
  code: string,
  score: { scoreA: number; scoreB: number },
  matchPatch: Partial<StoredMatch>,
) =>
  change(
    editionId,
    code,
    (bracket, match) => {
      const base = cleared(bracket, match);
      return base.ok ? reportResult(base.value, code, score) : base;
    },
    matchPatch,
  );

/**
 * @function applyForfeit
 * @param editionId {string} the edition
 * @param code {string} the bracket match
 * @param winner {Side} the side that advances
 * @returns {Promise<AppResult<{ bracket: Bracket; match: StoredMatch }>>} both saved
 */
export const applyForfeit = (editionId: string, code: string, winner: Side) =>
  change(editionId, code, (bracket, match) => {
    const base = cleared(bracket, match);
    return base.ok ? reportForfeit(base.value, code, winner) : base;
  });

/**
 * @function undoResult
 * @param editionId {string} the edition
 * @param code {string} the bracket match
 * @returns {Promise<AppResult<{ bracket: Bracket; match: StoredMatch }>>} both saved with the
 *          result gone and the sides it fed reset; out-of-order ("clear M3 first") once a later
 *          match is played
 */
export const undoResult = (editionId: string, code: string) =>
  change(editionId, code, (bracket) => clearResult(bracket, code), {
    maps: [],
    pickBans: [],
  });

/**
 * @function editionResults
 * @param editionId {string} the edition
 * @returns {Promise<{ champion: string | null; placements: Placement[] }>} the winner's team id
 *          once the bracket is decided, and every entrant's place so far
 */
export const editionResults = async (
  editionId: string,
): Promise<{ champion: string | null; placements: Placement[] }> => {
  const stored = await getBracket(editionId);
  if (!stored?.bracket) return { champion: null, placements: [] };
  return { champion: champion(stored.bracket), placements: placements(stored.bracket) };
};
