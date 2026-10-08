/**
 * @file src/services/qualifiers.ts
 * @desc Qualifiers: each team's score per pool slot (typed in, or previewed from a lobby's mp
 *       link and then saved by the host), seeds ranked from them by the library's rankQualifiers
 *       (sum or average rank, per the edition), and random seeds from a stored seed number. A
 *       preview never saves.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { type QualifierSeed, rankQualifiers } from "@haruhimemoe/tourney";
import type { MatchProblem } from "@haruhimemoe/tourney/mp";
import { ObjectId } from "mongodb";
import { collections, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { getPool } from "@/lib/pools-client";
import { MAX_QUALIFIER_ROWS, type QualifierScore } from "@/schemas/qualifier-score";
import { getEditionById, updateEdition } from "@/services/editions";
import { fetchMatch } from "@/services/osu-match";
import { listRounds } from "@/services/rounds";
import { listTeams, setSeeds } from "@/services/teams";
import { type QualifierScoreRow, qualifierLobby } from "@/utils/qualifier-lobby";
import { seededShuffle } from "@/utils/random";
import { type AppResult, fail, ok } from "@/utils/result";

/** A seed with the team it went to. */
export type TeamSeed = QualifierSeed & { teamName: string };

const scores = async () => {
  await connectDb();
  return collections(getDb()).qualifierScores;
};

const activeTeams = async (editionId: string) =>
  (await listTeams(editionId)).filter((t) => t.status === "active");

/**
 * @function qualifierRound
 * @param editionId {string} the edition
 * @returns {Promise<AppResult<{ id: string; poolId: string | null }>>} the Q round, or bad-state
 *          when the edition runs no qualifiers
 */
const qualifierRound = async (editionId: string) => {
  const round = (await listRounds(editionId)).find((r) => r.side === "qualifiers");
  return round ? ok(round) : fail("bad-state", "This edition has no qualifier round.");
};

/**
 * @function listQualifierScores
 * @param editionId {string} the edition
 * @returns {Promise<QualifierScore[]>} every saved qualifier score
 */
export const listQualifierScores = async (editionId: string): Promise<QualifierScore[]> =>
  (await (await scores()).find({ editionId }).toArray()).map(toId);

/**
 * @function saveQualifierScores
 * @param editionId {string} the edition
 * @param rows {readonly QualifierScoreRow[]} the round's whole score sheet (replaces it)
 * @returns {Promise<AppResult<{ saved: number }>>} how many rows, or bad-state, bad-input (a
 *          slot twice for one team, too many rows) or not-found (a team not active here)
 */
export const saveQualifierScores = async (
  editionId: string,
  rows: readonly QualifierScoreRow[],
): Promise<AppResult<{ saved: number }>> => {
  const round = await qualifierRound(editionId);
  if (!round.ok) return round;
  if (rows.length > MAX_QUALIFIER_ROWS) return fail("bad-input", "That's too many scores.");
  const pairs = new Set(rows.map((r) => `${r.teamId} ${r.slotKey}`));
  if (pairs.size !== rows.length)
    return fail("bad-input", "A team has two scores for the same map.");
  const teamIds = new Set((await activeTeams(editionId)).map((t) => t.id));
  if (rows.some((r) => !teamIds.has(r.teamId))) return fail("not-found");
  const col = await scores();
  await col.deleteMany({ editionId, roundId: round.value.id });
  if (rows.length) {
    await col.insertMany(
      rows.map((r) => ({ _id: new ObjectId(), editionId, roundId: round.value.id, ...r })),
    );
  }
  return ok({ saved: rows.length });
};

/**
 * @function qualifierPreview
 * @param editionId {string} the edition
 * @param mpLink {string} a qualifier lobby's mp link
 * @param beforeCall {() => Promise<boolean>} the osu! budget gate
 * @returns {Promise<AppResult<{ rows: QualifierScoreRow[]; problems: MatchProblem[] }>>} the
 *          lobby's team scores and what was left out; nothing is saved. bad-state without a
 *          qualifier round or its pool, the pool's and the match's errors otherwise
 */
export const qualifierPreview = async (
  editionId: string,
  mpLink: string,
  beforeCall?: () => Promise<boolean>,
): Promise<AppResult<{ rows: QualifierScoreRow[]; problems: MatchProblem[] }>> => {
  const round = await qualifierRound(editionId);
  if (!round.ok) return round;
  if (!round.value.poolId) return fail("bad-state", "Link the qualifier pool first.");
  const pool = await getPool(round.value.poolId);
  if (!pool.ok) return pool;
  const match = await fetchMatch(mpLink, beforeCall);
  if (!match.ok) return match;
  return ok(qualifierLobby(match.value, pool.value, await activeTeams(editionId)));
};

/**
 * @function seedFromQualifiers
 * @param editionId {string} the edition
 * @returns {Promise<AppResult<TeamSeed[]>>} every active team's seed by the edition's method
 *          (saved), with its value and tie flag; bad-state with no scores
 */
export const seedFromQualifiers = async (editionId: string): Promise<AppResult<TeamSeed[]>> => {
  const edition = await getEditionById(editionId);
  if (!edition) return fail("not-found");
  const teams = await activeTeams(editionId);
  const saved = await listQualifierScores(editionId);
  if (!saved.length) return fail("bad-state", "No qualifier scores are saved yet.");
  const slots = [...new Set(saved.map((s) => s.slotKey))].sort();
  const byTeam = new Map<string, Map<string, number>>();
  for (const s of saved) {
    const m = byTeam.get(s.teamId) ?? new Map<string, number>();
    m.set(s.slotKey, s.score);
    byTeam.set(s.teamId, m);
  }
  const ranked = rankQualifiers(
    teams.map((t) => ({
      entrantId: t.id,
      scores: slots.map((k) => byTeam.get(t.id)?.get(k) ?? null),
    })),
    edition.qualifiers.method,
  );
  const written = await setSeeds(
    editionId,
    ranked.map((r) => ({ teamId: r.entrantId, seed: r.seed })),
  );
  if (!written.ok) return written;
  const names = new Map(teams.map((t) => [t.id, t.name]));
  return ok(ranked.map((r) => ({ ...r, teamName: names.get(r.entrantId) ?? "" })));
};

/**
 * @function randomSeeds
 * @param editionId {string} the edition
 * @param seed {number} the seed number (stored on the bracket config, so the order can be shown
 *        to be fair and rebuilt)
 * @returns {Promise<AppResult<{ teamId: string; seed: number }[]>>} every active team's seed,
 *          the same for the same teams and number
 */
export const randomSeeds = async (
  editionId: string,
  seed: number,
): Promise<AppResult<{ teamId: string; seed: number }[]>> => {
  const edition = await getEditionById(editionId);
  if (!edition) return fail("not-found");
  if (!Number.isInteger(seed)) return fail("bad-input");
  const ids = (await activeTeams(editionId)).map((t) => t.id).sort();
  const seeds = seededShuffle(ids, seed).map((teamId, i) => ({ teamId, seed: i + 1 }));
  const written = await setSeeds(editionId, seeds);
  if (!written.ok) return written;
  if (edition.bracket) {
    const stored = await updateEdition(editionId, {
      bracket: { ...edition.bracket, randomSeed: seed },
    });
    if (!stored.ok) return stored;
  }
  return ok(seeds);
};
