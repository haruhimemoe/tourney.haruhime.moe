/**
 * @file src/services/lineages.ts
 * @desc Lineages: create (reserved and taken slugs refused, the creator the owner), find by slug
 *       or id, each member's role, and the owner's admin list and ownership moves. A duplicate
 *       slug from a concurrent create comes back as slug-taken, never a 500.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { collections, type Doc, fromId, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { type Lineage, type LineageRole, LineageSchema, RESERVED_SLUGS } from "@/schemas/lineage";
import { type AppResult, fail, ok } from "@/utils/result";

/** What a host types to make a lineage. */
export type LineageInput = Pick<Lineage, "slug" | "name" | "description" | "defaults">;

const lineages = async () => {
  await connectDb();
  return collections(getDb()).lineages;
};

/**
 * @function isDuplicateKey
 * @param error {unknown} what the driver threw
 * @returns {boolean} true for a unique index refusal (E11000)
 */
export const isDuplicateKey = (error: unknown): boolean =>
  error instanceof MongoServerError && error.code === 11000;

/**
 * @function createLineage
 * @param userId {string} the creator, who becomes the owner
 * @param input {LineageInput} slug, name, description and edition defaults
 * @returns {Promise<AppResult<Lineage>>} the lineage, or slug-reserved, slug-taken or bad-input
 */
export const createLineage = async (
  userId: string,
  input: LineageInput,
): Promise<AppResult<Lineage>> => {
  if (RESERVED_SLUGS.has(input.slug)) return fail("slug-reserved");
  const now = new Date().toISOString();
  const parsed = LineageSchema.safeParse({
    ...input,
    id: "new",
    members: [{ userId, role: "owner" }],
    orphaned: false,
    createdAt: now,
    updatedAt: now,
  });
  if (!parsed.success) return fail("bad-input");
  const { id: _, ...fields } = parsed.data;
  const doc: Doc<Lineage> = { _id: new ObjectId(), ...fields };
  try {
    await (await lineages()).insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) return fail("slug-taken");
    throw error;
  }
  return ok(toId(doc));
};

/**
 * @function getLineageBySlug
 * @param slug {string} the URL segment
 * @returns {Promise<Lineage | null>} the lineage, or null
 */
export const getLineageBySlug = async (slug: string): Promise<Lineage | null> => {
  const doc = await (await lineages()).findOne({ slug });
  return doc ? toId(doc) : null;
};

/**
 * @function getLineage
 * @param id {string} the lineage id
 * @returns {Promise<Lineage | null>} the lineage, or null (a bad id too)
 */
export const getLineage = async (id: string): Promise<Lineage | null> => {
  const _id = fromId(id);
  const doc = _id ? await (await lineages()).findOne({ _id }) : null;
  return doc ? toId(doc) : null;
};

/**
 * @function memberRole
 * @param lineage {Lineage} the lineage
 * @param userId {string} an account
 * @returns {LineageRole | null} their role on it, or null
 */
export const memberRole = (lineage: Lineage, userId: string): LineageRole | null =>
  lineage.members.find((m) => m.userId === userId)?.role ?? null;

/**
 * @function saveMembers
 * @param lineage {Lineage} the lineage as read
 * @param members {Lineage["members"]} its new members
 * @returns {Promise<AppResult<Lineage>>} the saved lineage, or bad-input over 20 members
 */
const saveMembers = async (
  lineage: Lineage,
  members: Lineage["members"],
): Promise<AppResult<Lineage>> => {
  const next = LineageSchema.safeParse({
    ...lineage,
    members,
    updatedAt: new Date().toISOString(),
  });
  if (!next.success) return fail("bad-input");
  const { id, ...fields } = next.data;
  await (await lineages()).replaceOne({ _id: new ObjectId(id) }, fields);
  return ok(next.data);
};

/**
 * @function addAdmin
 * @param lineageId {string} the lineage
 * @param userId {string} the account to add
 * @returns {Promise<AppResult<Lineage>>} the lineage, not-found, or bad-input when they're
 *          already a member
 */
export const addAdmin = async (lineageId: string, userId: string): Promise<AppResult<Lineage>> => {
  const lineage = await getLineage(lineageId);
  if (!lineage) return fail("not-found");
  if (memberRole(lineage, userId)) return fail("bad-input", "They're already on this lineage.");
  return saveMembers(lineage, [...lineage.members, { userId, role: "admin" }]);
};

/**
 * @function removeAdmin
 * @param lineageId {string} the lineage
 * @param userId {string} the admin to remove
 * @returns {Promise<AppResult<Lineage>>} the lineage, not-found, or bad-input when they aren't an
 *          admin (the owner can't be removed)
 */
export const removeAdmin = async (
  lineageId: string,
  userId: string,
): Promise<AppResult<Lineage>> => {
  const lineage = await getLineage(lineageId);
  if (!lineage) return fail("not-found");
  if (memberRole(lineage, userId) !== "admin") return fail("bad-input", "They aren't an admin.");
  return saveMembers(
    lineage,
    lineage.members.filter((m) => m.userId !== userId),
  );
};

/**
 * @function transferOwner
 * @param lineageId {string} the lineage
 * @param fromUserId {string} the current owner
 * @param toUserId {string} an admin, who becomes the owner; the old owner stays as an admin
 * @returns {Promise<AppResult<Lineage>>} the lineage, not-found, forbidden when fromUserId isn't
 *          the owner, or bad-input when toUserId isn't an admin
 */
export const transferOwner = async (
  lineageId: string,
  fromUserId: string,
  toUserId: string,
): Promise<AppResult<Lineage>> => {
  const lineage = await getLineage(lineageId);
  if (!lineage) return fail("not-found");
  if (memberRole(lineage, fromUserId) !== "owner") return fail("forbidden");
  if (memberRole(lineage, toUserId) !== "admin")
    return fail("bad-input", "Add them as an admin first.");
  return saveMembers(
    lineage,
    lineage.members.map((m) =>
      m.userId === toUserId
        ? { ...m, role: "owner" as const }
        : m.userId === fromUserId
          ? { ...m, role: "admin" as const }
          : m,
    ),
  );
};
