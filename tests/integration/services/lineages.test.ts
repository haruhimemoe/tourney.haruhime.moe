/**
 * @file tests/integration/services/lineages.test.ts
 * @desc Lineages: reserved and taken slugs are refused with their own codes (two creates at once
 *       included), the creator owns it, admins come and go, and ownership moves to an admin; a
 *       row stored before defaults.socials/contact/hue existed still reads with them filled in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { collections, type Doc } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { Lineage } from "@/schemas/lineage";
import {
  addAdmin,
  createLineage,
  getLineage,
  getLineageBySlug,
  listMemberLineages,
  memberRole,
  removeAdmin,
  transferOwner,
} from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { LINEAGE_INPUT as input } from "../../helpers/inputs";

setupTestDb();

/** A pre-migration lineage row: no defaults.socials, defaults.contact or defaults.hue. */
const OLD_LINEAGE_DOC = {
  slug: "old-cup",
  name: "Old Cup",
  description: "",
  members: [{ userId: "u-old", role: "owner" as const }],
  orphaned: false,
  defaults: {
    mode: "osu" as const,
    sides: { kind: "solo" as const, lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 },
    rulesText: "",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const codeOf = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? null : r.error?.code);

describe("lineages", () => {
  it("makes the creator the owner", async () => {
    const u = await createTestUser(1);
    const r = await createLineage(u.id, input);
    if (!r.ok) throw new Error(r.error.message);
    const found = await getLineageBySlug("evergreen-cup");
    expect(found?.id).toBe(r.value.id);
    expect(found && memberRole(found, u.id)).toBe("owner");
    expect(found && memberRole(found, "someone")).toBeNull();
  });

  it("refuses a taken slug with slug-taken", async () => {
    const u = await createTestUser(1);
    expect((await createLineage(u.id, input)).ok).toBe(true);
    expect(codeOf(await createLineage(u.id, input))).toBe("slug-taken");
  });

  it("gives one of two concurrent creates slug-taken, not a crash", async () => {
    const [a, b] = await Promise.all([
      createTestUser(1).then((u) => createLineage(u.id, input)),
      createTestUser(2).then((u) => createLineage(u.id, input)),
    ]);
    expect([codeOf(a), codeOf(b)].sort()).toEqual([null, "slug-taken"].sort());
  });

  it.each(["manage", "api", "x", "Bad Slug"])("refuses the slug %s", async (slug) => {
    const u = await createTestUser(1);
    const code = codeOf(await createLineage(u.id, { ...input, slug }));
    expect(code).toBe(slug === "manage" || slug === "api" ? "slug-reserved" : "bad-input");
  });

  it("adds and removes admins, and moves ownership to one", async () => {
    const owner = await createTestUser(1);
    const admin = await createTestUser(2);
    const l = await createLineage(owner.id, input);
    if (!l.ok) throw new Error(l.error.message);
    const added = await addAdmin(l.value.id, admin.id);
    expect(added.ok && memberRole(added.value, admin.id)).toBe("admin");
    expect(codeOf(await addAdmin(l.value.id, admin.id))).toBe("bad-input");
    const moved = await transferOwner(l.value.id, owner.id, admin.id);
    expect(moved.ok && memberRole(moved.value, admin.id)).toBe("owner");
    expect(moved.ok && memberRole(moved.value, owner.id)).toBe("admin");
    expect(codeOf(await transferOwner(l.value.id, owner.id, admin.id))).toBe("forbidden");
    const removed = await removeAdmin(l.value.id, owner.id);
    expect(removed.ok && memberRole(removed.value, owner.id)).toBeNull();
    expect(codeOf(await removeAdmin(l.value.id, admin.id))).toBe("bad-input");
  });

  it("fills in defaults.socials, defaults.contact and defaults.hue on a pre-migration row", async () => {
    const _id = new ObjectId();
    await collections(getDb()).lineages.insertOne({
      _id,
      ...OLD_LINEAGE_DOC,
    } as unknown as Doc<Lineage>);
    const id = _id.toHexString();

    const byId = await getLineage(id);
    expect(byId?.defaults.socials).toEqual([]);
    expect(byId?.defaults.contact).toEqual({ email: null, discord: null });
    expect(byId?.defaults.hue).toBeNull();

    const bySlug = await getLineageBySlug("old-cup");
    expect(bySlug?.defaults.socials).toEqual([]);
    expect(bySlug?.defaults.contact).toEqual({ email: null, discord: null });
    expect(bySlug?.defaults.hue).toBeNull();

    const listed = await listMemberLineages("u-old");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.defaults.socials).toEqual([]);
    expect(listed[0]?.defaults.contact).toEqual({ email: null, discord: null });
    expect(listed[0]?.defaults.hue).toBeNull();
  });
});
