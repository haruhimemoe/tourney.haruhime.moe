/**
 * @file src/services/stages.ts
 * @desc Stages before the main bracket. Groups: seeded teams snaked into groups (the library's
 *       snakeGroups), a round robin each (roundRobin), match codes G<group><n> in rounds
 *       GS<round>; standings are derived from the match documents (groupStandings); the top
 *       `advance` per group become the main bracket's seeds (seedsFromGroups) and the rest are
 *       eliminated. Swiss: one round paired at a time (swissPairings) once the last is finished,
 *       codes SW<round>M<n> in rounds SW<round>. Group and swiss matches point their roundId at
 *       the stage's bracket document, since the ladder has no rounds for them.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import {
  checkScore,
  DEFAULT_STANDINGS_RULES,
  type Group,
  groupStandings,
  roundRobin,
  type Standing,
  type StandingsRules,
  StandingsRulesSchema,
  seedsFromGroups,
  snakeGroups,
  swissPairings,
} from "@haruhimemoe/tourney";
import { type ObjectId as MongoId, ObjectId } from "mongodb";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { StoredMatch } from "@/schemas/match";
import { getEditionById } from "@/services/editions";
import { DEFAULT_BEST_OF } from "@/services/rounds";
import { listTeams, setSeeds } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

/** What the groups stage stores. */
export type GroupsState = { groups: Group[]; rules: StandingsRules };

/** What the swiss stage stores: the round last paired, how many, who had a bye, the field. */
export type SwissState = {
  round: number;
  rounds: number;
  byes: string[];
  entrants: string[];
  rules: StandingsRules;
};

const GROUP_ROUND = /^GS\d+$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const db = async () => {
  await connectDb();
  return collections(getDb());
};

/**
 * @function stageBestOf
 * @param editionId {string} the edition
 * @param key {string} "GS" or "SW"
 * @returns {Promise<number>} the config's best-of for that key, else its default
 */
const stageBestOf = async (editionId: string, key: string): Promise<number> => {
  const config = (await getEditionById(editionId))?.bracket;
  return config?.bestOf[key] ?? config?.bestOf.default ?? DEFAULT_BEST_OF;
};

/**
 * @function seededEntrants
 * @param editionId {string} the edition
 * @returns {Promise<AppResult<string[]>>} active team ids by seed, or seeds-missing
 */
const seededEntrants = async (editionId: string): Promise<AppResult<string[]>> => {
  const teams = (await listTeams(editionId)).filter((t) => t.status === "active");
  if (teams.length < 2 || teams.some((t) => t.seed === null)) return fail("seeds-missing");
  return ok([...teams].sort((x, y) => (x.seed ?? 0) - (y.seed ?? 0)).map((t) => t.id));
};

/** A new stage match document. */
const newMatch = (
  editionId: string,
  roundId: MongoId,
  fields: {
    bracketCode: string;
    round: string;
    a: string | null;
    b: string | null;
    bestOf: number;
  },
) => ({
  _id: new ObjectId(),
  editionId,
  roundId: roundId.toHexString(),
  ...fields,
  status: "scheduled" as const,
  scheduledAt: null,
  scoreA: null,
  scoreB: null,
  winner: null,
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
});

/**
 * @function saveStage
 * @param editionId {string} the edition
 * @param stage {"groups" | "swiss"} the stage
 * @param state {unknown} its state
 * @param rounds {RegExp} its round codes, whose matches are replaced
 * @returns {Promise<AppResult<MongoId>>} the stage document's id, or bracket-has-results when a
 *          match of the stage already has one
 */
const saveStage = async (
  editionId: string,
  stage: "groups" | "swiss",
  state: unknown,
  rounds: RegExp,
): Promise<AppResult<MongoId>> => {
  const { brackets, matches } = await db();
  const played = await matches.countDocuments({
    editionId,
    round: { $regex: rounds },
    status: { $in: ["done", "forfeit"] },
  });
  if (played) return fail("bracket-has-results");
  await matches.deleteMany({ editionId, round: { $regex: rounds } });
  const saved = await brackets.findOneAndUpdate(
    { editionId, stage },
    { $set: { bracket: null, state, version: 1 }, $setOnInsert: { _id: new ObjectId() } },
    { upsert: true, returnDocument: "after" },
  );
  return saved ? ok(saved._id) : fail("not-found");
};

/**
 * @function createGroups
 * @param editionId {string} the edition
 * @param options {{ groups: number; rules: StandingsRules }} how many groups and how to rank
 * @returns {Promise<AppResult<Group[]>>} the groups with their matches stored; seeds-missing,
 *          bracket-has-results, or the library's error
 */
export const createGroups = async (
  editionId: string,
  options: { groups: number; rules: StandingsRules },
): Promise<AppResult<Group[]>> => {
  const rules = StandingsRulesSchema.safeParse(options.rules);
  if (!rules.success) return fail("bad-input");
  const entrants = await seededEntrants(editionId);
  if (!entrants.ok) return entrants;
  if (options.groups > LETTERS.length) return fail("bad-input", "26 groups at most.");
  const snaked = snakeGroups(entrants.value, options.groups);
  if (!snaked.ok) return fail(snaked.error.code, snaked.error.message);
  const groups = snaked.value.map((ids, i) => ({
    id: LETTERS[i] as string,
    name: `Group ${LETTERS[i]}`,
    entrants: ids,
  }));
  const schedules = groups.map((g) => roundRobin(g.entrants));
  const broken = schedules.find((s) => !s.ok);
  if (broken && !broken.ok) return fail(broken.error.code, broken.error.message);
  const stageId = await saveStage(editionId, "groups", { groups, rules: rules.data }, GROUP_ROUND);
  if (!stageId.ok) return stageId;
  const bestOf = await stageBestOf(editionId, "GS");
  const docs = groups.flatMap((g, i) => {
    const schedule = schedules[i];
    if (!schedule?.ok) return [];
    let n = 0;
    return schedule.value.flatMap((r) =>
      r.matches.map((m) =>
        newMatch(editionId, stageId.value, {
          bracketCode: `G${g.id}${++n}`,
          round: `GS${r.round}`,
          a: m.a,
          b: m.b,
          bestOf,
        }),
      ),
    );
  });
  if (docs.length) await (await db()).matches.insertMany(docs);
  return ok(groups);
};

/**
 * @function groupResult
 * @param editionId {string} the edition
 * @param code {string} a group or swiss match code
 * @param score {{ scoreA: number; scoreB: number }} maps won per side
 * @returns {Promise<AppResult<StoredMatch>>} the match with its result; not-found, or the
 *          library's bad-score when it doesn't fit the best-of
 */
export const groupResult = async (
  editionId: string,
  code: string,
  score: { scoreA: number; scoreB: number },
): Promise<AppResult<StoredMatch>> => {
  const { matches } = await db();
  const doc = await matches.findOne({ editionId, bracketCode: code, round: /^(GS|SW)\d+$/ });
  if (!doc) return fail("not-found");
  const winner = checkScore(doc.bestOf, score.scoreA, score.scoreB);
  if (!winner.ok) return fail(winner.error.code, winner.error.message);
  const fields = { ...score, winner: winner.value, status: "done" as const };
  await matches.updateOne({ _id: doc._id }, { $set: fields });
  const { _id, ...rest } = doc;
  return ok({ id: _id.toHexString(), ...rest, ...fields });
};

/**
 * @function standings
 * @param editionId {string} the edition
 * @returns {Promise<Standing[][]>} each group's table, best first; [] before groups exist
 */
export const standings = async (editionId: string): Promise<Standing[][]> => {
  const { brackets, matches } = await db();
  const stage = await brackets.findOne({ editionId, stage: "groups" });
  const state = stage?.state as GroupsState | undefined;
  if (!state) return [];
  const all = await matches.find({ editionId, round: { $regex: GROUP_ROUND } }).toArray();
  return state.groups.map((g) => {
    const own = all.filter((m) => m.bracketCode?.startsWith(`G${g.id}`));
    const table = groupStandings(g.entrants, own, state.rules);
    return table.ok ? table.value : [];
  });
};

/**
 * @function seedAdvancing
 * @param editionId {string} the edition
 * @param advancing {string[]} team ids in main-bracket seed order
 * @returns {Promise<AppResult<{ teamId: string; seed: number }[]>>} the seeds; every other
 *          active team is eliminated with no seed
 */
const seedAdvancing = async (
  editionId: string,
  advancing: string[],
): Promise<AppResult<{ teamId: string; seed: number }[]>> => {
  const { teams } = await db();
  const keep = new Set(advancing);
  const out = (await listTeams(editionId)).filter((t) => t.status === "active" && !keep.has(t.id));
  await teams.updateMany(
    { _id: { $in: out.map((t) => new ObjectId(t.id)) } },
    { $set: { status: "eliminated", seed: null } },
  );
  const seeds = advancing.map((teamId, i) => ({ teamId, seed: i + 1 }));
  const written = await setSeeds(editionId, seeds);
  return written.ok ? ok(seeds) : written;
};

/**
 * @function seedMainFromGroups
 * @param editionId {string} the edition
 * @param options {{ advance: number }} how many per group go through
 * @returns {Promise<AppResult<{ teamId: string; seed: number }[]>>} the main bracket's seeds
 *          (first places, then second places, arranged so group mates meet late); the host
 *          then makes the main bracket
 */
export const seedMainFromGroups = async (
  editionId: string,
  options: { advance: number },
): Promise<AppResult<{ teamId: string; seed: number }[]>> => {
  const tables = await standings(editionId);
  if (!tables.length) return fail("bad-state", "Make the groups first.");
  const order = seedsFromGroups(
    tables.map((t) => t.map((s) => s.entrantId)),
    options.advance,
  );
  if (!order.ok) return fail(order.error.code, order.error.message);
  return seedAdvancing(editionId, order.value);
};

/**
 * @function createSwiss
 * @param editionId {string} the edition
 * @param options {{ rounds: number; rules?: StandingsRules }} how many rounds and how to rank
 * @returns {Promise<AppResult<SwissState>>} the stage, ready to pair round 1
 */
export const createSwiss = async (
  editionId: string,
  options: { rounds: number; rules?: StandingsRules },
): Promise<AppResult<SwissState>> => {
  const entrants = await seededEntrants(editionId);
  if (!entrants.ok) return entrants;
  if (!Number.isInteger(options.rounds) || options.rounds < 1 || options.rounds > 16)
    return fail("bad-input", "Swiss runs 1 to 16 rounds.");
  const state: SwissState = {
    round: 0,
    rounds: options.rounds,
    byes: [],
    entrants: entrants.value,
    rules: options.rules ?? DEFAULT_STANDINGS_RULES,
  };
  const saved = await saveStage(editionId, "swiss", state, /^SW\d+$/);
  return saved.ok ? ok(state) : saved;
};

/**
 * @function pairNextSwissRound
 * @param editionId {string} the edition
 * @returns {Promise<AppResult<SwissState>>} the stage after pairing the next round (its matches
 *          stored); out-of-order while a match of the current round has no result, bad-state
 *          once every round is paired
 */
export const pairNextSwissRound = async (editionId: string): Promise<AppResult<SwissState>> => {
  const { brackets, matches } = await db();
  const stage = await brackets.findOne({ editionId, stage: "swiss" });
  const state = stage?.state as SwissState | undefined;
  if (!stage || !state) return fail("bad-state", "Start swiss first.");
  if (state.round >= state.rounds) return fail("bad-state", "Every swiss round is paired.");
  const history = await matches.find({ editionId, round: { $regex: /^SW\d+$/ } }).toArray();
  const open = history.filter((m) => m.round === `SW${state.round}` && m.winner === null);
  if (open.length)
    return fail("out-of-order", `Finish round ${state.round} first (${open.length} to play).`);
  const round = state.round + 1;
  const paired = swissPairings(
    state.entrants,
    { matches: history, byes: state.byes },
    { round, rounds: state.rounds, rules: state.rules },
  );
  if (!paired.ok) return fail(paired.error.code, paired.error.message);
  const bestOf = await stageBestOf(editionId, "SW");
  const docs = paired.value.pairs.map((p, i) =>
    newMatch(editionId, stage._id, {
      bracketCode: `SW${round}M${i + 1}`,
      round: `SW${round}`,
      a: p.a,
      b: p.b,
      bestOf,
    }),
  );
  if (docs.length) await matches.insertMany(docs);
  const next: SwissState = {
    ...state,
    round,
    byes: paired.value.bye ? [...state.byes, paired.value.bye] : state.byes,
  };
  await brackets.updateOne(
    { _id: stage._id, version: stage.version },
    { $set: { state: next, version: stage.version + 1 } },
  );
  return ok(next);
};

/**
 * @function swissStandings
 * @param editionId {string} the edition
 * @returns {Promise<Standing[]>} the swiss table, best first; [] before swiss starts
 */
export const swissStandings = async (editionId: string): Promise<Standing[]> => {
  const { brackets, matches } = await db();
  const state = (await brackets.findOne({ editionId, stage: "swiss" }))?.state as
    | SwissState
    | undefined;
  if (!state) return [];
  const all = await matches.find({ editionId, round: { $regex: /^SW\d+$/ } }).toArray();
  const table = groupStandings(state.entrants, all, state.rules, { byes: state.byes });
  return table.ok ? table.value : [];
};

/**
 * @function seedMainFromSwiss
 * @param editionId {string} the edition
 * @param options {{ advance: number }} how many go through
 * @returns {Promise<AppResult<{ teamId: string; seed: number }[]>>} the top `advance` seeded in
 *          table order; the rest eliminated
 */
export const seedMainFromSwiss = async (
  editionId: string,
  options: { advance: number },
): Promise<AppResult<{ teamId: string; seed: number }[]>> => {
  const table = await swissStandings(editionId);
  if (!table.length) return fail("bad-state", "Start swiss first.");
  if (!Number.isInteger(options.advance) || options.advance < 2 || options.advance > table.length)
    return fail("bad-input");
  return seedAdvancing(
    editionId,
    table.slice(0, options.advance).map((s) => s.entrantId),
  );
};
