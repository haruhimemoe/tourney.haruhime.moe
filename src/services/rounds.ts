/**
 * @file src/services/rounds.ts
 * @desc An edition's rounds, built from its bracket config by the library's buildLadder (with
 *       Q first when qualifiers are on). A resync keeps what the host set on each round (name,
 *       pool, reveal, star range, window) and drops rounds the ladder no longer has, unless a
 *       match is filed under one. A best-of edit is written to the bracket config too, so the
 *       next resync keeps it.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { buildLadder, type LadderOptions } from "@haruhimemoe/tourney";
import { ObjectId } from "mongodb";
import { collections, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { BracketConfig, Edition } from "@/schemas/edition";
import { type StoredRound, StoredRoundSchema } from "@/schemas/round";
import { getEditionById, updateEdition } from "@/services/editions";
import { type AppResult, fail, ok } from "@/utils/result";

/** The best-of a round gets when the config names neither it nor a default. */
export const DEFAULT_BEST_OF = 7;

/** What a host may change on a round. */
export type RoundPatch = Partial<
  Pick<StoredRound, "name" | "bestOf" | "poolId" | "poolRevealed" | "starRange" | "window">
>;

const rounds = async () => {
  await connectDb();
  return collections(getDb()).rounds;
};

/**
 * @function listRounds
 * @param editionId {string} the edition
 * @returns {Promise<StoredRound[]>} its rounds by order
 */
export const listRounds = async (editionId: string): Promise<StoredRound[]> => {
  const docs = await (await rounds()).find({ editionId }).sort({ order: 1 }).toArray();
  return docs.map(toId);
};

/**
 * @function ladderOptions
 * @param config {BracketConfig} the bracket config
 * @param qualifiers {boolean} whether the edition runs qualifiers
 * @returns {LadderOptions} buildLadder's input: the config's `default` best-of (or
 *          DEFAULT_BEST_OF) and every other best-of key the ladder has as a round code (keys from
 *          a bigger bracket are left out, since the library refuses them)
 */
export const ladderOptions = (config: BracketConfig, qualifiers: boolean): LadderOptions => {
  const { default: fallback, ...byRound } = config.bestOf;
  const base = {
    size: config.size,
    format: config.format,
    qualifiers,
    grandFinalReset: config.format === "double" && config.grandFinalReset,
    thirdPlace: config.format === "single" && config.thirdPlace,
  };
  const shape = buildLadder({ ...base, bestOf: 1 });
  const codes = new Set(shape.ok ? shape.value.map((r) => r.code) : []);
  const rounds = Object.fromEntries(Object.entries(byRound).filter(([code]) => codes.has(code)));
  return { ...base, bestOf: { default: fallback ?? DEFAULT_BEST_OF, rounds } };
};

/**
 * @function syncRounds
 * @param edition {Edition} the edition, with its bracket config
 * @returns {Promise<AppResult<StoredRound[]>>} the rounds by order, or bad-state with no config,
 *          or the library's error for a config it can't build
 */
export const syncRounds = async (edition: Edition): Promise<AppResult<StoredRound[]>> => {
  const config = edition.bracket;
  if (!config) return fail("bad-state", "Set the bracket's size and format first.");
  const ladder = buildLadder(ladderOptions(config, edition.qualifiers.enabled));
  if (!ladder.ok) return fail(ladder.error.code, ladder.error.message);
  const col = await rounds();
  const existing = await col.find({ editionId: edition.id }).toArray();
  const byCode = new Map(existing.map((r) => [r.code, r]));
  const codes = new Set(ladder.value.map((r) => r.code));
  const stale = existing.filter((r) => !codes.has(r.code));
  const played = new Set(
    await collections(getDb()).matches.distinct("roundId", {
      editionId: edition.id,
      roundId: { $in: stale.map((r) => r._id.toHexString()) },
    }),
  );
  const drop = stale.filter((r) => !played.has(r._id.toHexString())).map((r) => r._id);
  if (drop.length) await col.deleteMany({ _id: { $in: drop } });
  for (const round of ladder.value) {
    const kept = byCode.get(round.code);
    if (kept) {
      await col.updateOne(
        { _id: kept._id },
        { $set: { side: round.side, order: round.order, bestOf: round.bestOf } },
      );
    } else {
      await col.insertOne({
        _id: new ObjectId(),
        ...round,
        editionId: edition.id,
        poolId: null,
        poolRevealed: false,
        starRange: null,
        window: null,
      });
    }
  }
  return ok(await listRounds(edition.id));
};

/**
 * @function updateRound
 * @param editionId {string} the edition
 * @param code {string} the round's code
 * @param patch {RoundPatch} what changes
 * @returns {Promise<AppResult<StoredRound>>} the round, not-found, or bad-input (a window that
 *          ends before it starts, a star range upside down, a field that doesn't parse)
 */
export const updateRound = async (
  editionId: string,
  code: string,
  patch: RoundPatch,
): Promise<AppResult<StoredRound>> => {
  const col = await rounds();
  const doc = await col.findOne({ editionId, code });
  if (!doc) return fail("not-found");
  const parsed = StoredRoundSchema.safeParse({ ...toId(doc), ...patch });
  if (!parsed.success) return fail("bad-input");
  const next = parsed.data;
  if (next.window && Date.parse(next.window.end) <= Date.parse(next.window.start))
    return fail("bad-input", "A round's window has to end after it starts.");
  if (next.starRange && next.starRange.min > next.starRange.max)
    return fail("bad-input", "The star range's low end is above its high end.");
  if (patch.bestOf !== undefined && next.bestOf !== null) {
    const edition = await getEditionById(editionId);
    if (edition?.bracket) {
      const saved = await updateEdition(editionId, {
        bracket: { ...edition.bracket, bestOf: { ...edition.bracket.bestOf, [code]: next.bestOf } },
      });
      if (!saved.ok) return saved;
    }
  }
  const { id: _, ...fields } = next;
  await col.updateOne({ _id: doc._id }, { $set: fields });
  return ok(next);
};
