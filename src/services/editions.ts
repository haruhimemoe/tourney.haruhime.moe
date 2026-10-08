/**
 * @file src/services/editions.ts
 * @desc Editions: create (owner or admin of the lineage; the active edition limit is charged to
 *       the lineage owner and checked again after the insert, so two creates at once can't both
 *       get through), find by lineage and edition slug, edit (the merged edition is parsed whole),
 *       and move phases through the library's advancePhase.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { advancePhase, type Phase } from "@haruhimemoe/tourney";
import { ObjectId } from "mongodb";
import { collections, type Doc, fromId, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { type Edition, EditionSchema, editionSlug } from "@/schemas/edition";
import type { Lineage } from "@/schemas/lineage";
import { activeEditionIds, editionLimit } from "@/services/limits";
import { getLineage, getLineageBySlug, isDuplicateKey, memberRole } from "@/services/lineages";
import { type AppResult, fail, ok } from "@/utils/result";

/** What a host types to make an edition. */
export type EditionInput = Pick<Edition, "name" | "code" | "mode" | "sides" | "year" | "dates">;

/** The fields an edit may change; phase moves go through moveEditionPhase. */
export type EditableEditionFields = Omit<
  Edition,
  "id" | "lineageId" | "slug" | "code" | "phase" | "createdAt" | "updatedAt"
>;

const editions = async () => {
  await connectDb();
  return collections(getDb()).editions;
};

/**
 * @function lineageOwner
 * @param lineage {Lineage} a lineage
 * @returns {string | null} its owner's account id, or null when it's orphaned
 */
export const lineageOwner = (lineage: Lineage): string | null =>
  lineage.members.find((m) => m.role === "owner")?.userId ?? null;

/**
 * @function overLimit
 * @param ownerId {string} the lineage owner
 * @param mine {ObjectId | null} a just-inserted edition, which keeps its place only when it's
 *        among the owner's oldest `limit` active editions
 * @returns {Promise<boolean>} true when the owner can't have this (or another) active edition
 */
const overLimit = async (ownerId: string, mine: ObjectId | null): Promise<boolean> => {
  const [ids, limit] = await Promise.all([activeEditionIds(ownerId), editionLimit(ownerId)]);
  if (!mine) return ids.length >= limit;
  return !ids.slice(0, limit).some((id) => id.equals(mine));
};

/**
 * @function createEdition
 * @param userId {string} the caller, owner or admin of the lineage
 * @param lineageId {string} the lineage
 * @param input {EditionInput} name, code, mode, sides, year and dates
 * @returns {Promise<AppResult<Edition>>} the edition in setup, or not-found, forbidden,
 *          edition-limit, slug-taken or bad-input
 */
export const createEdition = async (
  userId: string,
  lineageId: string,
  input: EditionInput,
): Promise<AppResult<Edition>> => {
  const lineage = await getLineage(lineageId);
  if (!lineage) return fail("not-found");
  const owner = lineageOwner(lineage);
  if (!memberRole(lineage, userId) || !owner) return fail("forbidden");
  const slug = editionSlug(input.code);
  if (!slug) return fail("bad-input", "The code needs a letter or a number.");
  const now = new Date().toISOString();
  const parsed = EditionSchema.safeParse({
    ...input,
    id: "new",
    lineageId,
    slug,
    phase: "setup",
    registration: { opensAt: null, closesAt: null, playerCap: null, staffCap: null },
    rulesText: lineage.defaults.rulesText,
    siteMode: "auto",
    qualifiers: { enabled: false, method: "sum" },
    bracket: null,
    eligibility: { rank: null, countries: null, regions: null },
    questions: [],
    pickBanRules: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
  if (!parsed.success) return fail("bad-input");
  if (await overLimit(owner, null)) return fail("edition-limit");
  const { id: _, ...fields } = parsed.data;
  const doc: Doc<Edition> = { _id: new ObjectId(), ...fields };
  const col = await editions();
  try {
    await col.insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) return fail("slug-taken");
    throw error;
  }
  if (await overLimit(owner, doc._id)) {
    await col.deleteOne({ _id: doc._id });
    return fail("edition-limit");
  }
  return ok(toId(doc));
};

/**
 * @function getEditionById
 * @param id {string} the edition id
 * @returns {Promise<Edition | null>} the edition, or null (a bad id too)
 */
export const getEditionById = async (id: string): Promise<Edition | null> => {
  const _id = fromId(id);
  const doc = _id ? await (await editions()).findOne({ _id }) : null;
  return doc ? toId(doc) : null;
};

/**
 * @function getEdition
 * @param lineageSlug {string} the first URL segment
 * @param slug {string} the second
 * @returns {Promise<{ lineage: Lineage; edition: Edition } | null>} both, or null
 */
export const getEdition = async (
  lineageSlug: string,
  slug: string,
): Promise<{ lineage: Lineage; edition: Edition } | null> => {
  const lineage = await getLineageBySlug(lineageSlug);
  if (!lineage) return null;
  const doc = await (await editions()).findOne({ lineageId: lineage.id, slug });
  return doc ? { lineage, edition: toId(doc) } : null;
};

/**
 * @function saveEdition
 * @param edition {Edition} the whole edition after a change
 * @returns {Promise<AppResult<Edition>>} the saved edition, or bad-input when it doesn't parse
 */
const saveEdition = async (edition: Edition): Promise<AppResult<Edition>> => {
  const parsed = EditionSchema.safeParse({ ...edition, updatedAt: new Date().toISOString() });
  if (!parsed.success) return fail("bad-input");
  const { id, ...fields } = parsed.data;
  await (await editions()).replaceOne({ _id: new ObjectId(id) }, fields);
  return ok(parsed.data);
};

/**
 * @function updateEdition
 * @param editionId {string} the edition
 * @param patch {Partial<EditableEditionFields>} the fields to change
 * @returns {Promise<AppResult<Edition>>} the edition, not-found, or bad-input
 */
export const updateEdition = async (
  editionId: string,
  patch: Partial<EditableEditionFields>,
): Promise<AppResult<Edition>> => {
  const edition = await getEditionById(editionId);
  if (!edition) return fail("not-found");
  return saveEdition({ ...edition, ...patch });
};

/**
 * @function moveEditionPhase
 * @param editionId {string} the edition
 * @param to {Phase} a later phase (skipping forward is fine)
 * @returns {Promise<AppResult<Edition>>} the edition, not-found, or the library's bad-state
 */
export const moveEditionPhase = async (
  editionId: string,
  to: Phase,
): Promise<AppResult<Edition>> => {
  const edition = await getEditionById(editionId);
  if (!edition) return fail("not-found");
  const moved = advancePhase(edition, to);
  if (!moved.ok) return fail(moved.error.code);
  return saveEdition({ ...edition, phase: moved.value.phase });
};
