/**
 * @file tests/integration/services/editions.test.ts
 * @desc Editions: one active edition per owner (ten for a verified host), charged to the
 *       lineage owner even when an admin creates it, exactly one of two concurrent creates
 *       through; codes that slug the same are refused; edits are parsed; phases move forward
 *       only, with the library's error.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { createEdition, getEdition, moveEditionPhase, updateEdition } from "@/services/editions";
import { activeEditionCount, editionLimit } from "@/services/limits";
import { addAdmin, createLineage } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { EDITION_INPUT as edition, LINEAGE_INPUT } from "../../helpers/inputs";

setupTestDb();

const codeOf = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? null : r.error?.code);

const ownerWithLineage = async (osuId = 1) => {
  const u = await createTestUser(osuId);
  const l = await createLineage(u.id, { ...LINEAGE_INPUT, slug: `cup-${osuId}` });
  if (!l.ok) throw new Error(l.error.message);
  return { user: u, lineage: l.value };
};

const verify = (userId: string) =>
  collections(getDb()).profiles.insertOne({ userId, verifiedHost: true, timezone: null });

describe("editions", () => {
  it("creates in setup with the lineage's rules text and finds it by slugs", async () => {
    const { user, lineage } = await ownerWithLineage();
    const e = await createEdition(user.id, lineage.id, { ...edition, code: "EGC 2026" });
    if (!e.ok) throw new Error(e.error.message);
    expect(e.value.phase).toBe("setup");
    expect(e.value.slug).toBe("egc-2026");
    expect((await getEdition("cup-1", "egc-2026"))?.edition.id).toBe(e.value.id);
    expect(await getEdition("cup-1", "nope")).toBeNull();
  });

  it("allows one active edition, then refuses", async () => {
    const { user, lineage } = await ownerWithLineage();
    expect(await editionLimit(user.id)).toBe(1);
    expect((await createEdition(user.id, lineage.id, edition)).ok).toBe(true);
    const second = await createEdition(user.id, lineage.id, { ...edition, code: "EGC2027" });
    expect(codeOf(second)).toBe("edition-limit");
    expect(await activeEditionCount(user.id)).toBe(1);
  });

  it("counts a done edition as finished", async () => {
    const { user, lineage } = await ownerWithLineage();
    const e = await createEdition(user.id, lineage.id, edition);
    if (!e.ok) throw new Error(e.error.message);
    expect((await moveEditionPhase(e.value.id, "done")).ok).toBe(true);
    expect((await createEdition(user.id, lineage.id, { ...edition, code: "EGC2027" })).ok).toBe(
      true,
    );
  });

  it("refuses an edition code that slugs the same", async () => {
    const { user, lineage } = await ownerWithLineage();
    await verify(user.id);
    expect(await editionLimit(user.id)).toBe(10);
    expect((await createEdition(user.id, lineage.id, { ...edition, code: "EGC 2026" })).ok).toBe(
      true,
    );
    const again = await createEdition(user.id, lineage.id, { ...edition, code: "egc-2026" });
    expect(codeOf(again)).toBe("slug-taken");
    expect(codeOf(await createEdition(user.id, lineage.id, { ...edition, code: "!!" }))).toBe(
      "bad-input",
    );
  });

  it("charges an admin's create to the owner's limit", async () => {
    const { user: owner, lineage } = await ownerWithLineage();
    const admin = await createTestUser(2);
    await verify(admin.id);
    await addAdmin(lineage.id, admin.id);
    expect((await createEdition(owner.id, lineage.id, edition)).ok).toBe(true);
    const byAdmin = await createEdition(admin.id, lineage.id, { ...edition, code: "EGC2027" });
    expect(codeOf(byAdmin)).toBe("edition-limit");
  });

  it("refuses a non-member", async () => {
    const { lineage } = await ownerWithLineage();
    const stranger = await createTestUser(9);
    expect(codeOf(await createEdition(stranger.id, lineage.id, edition))).toBe("forbidden");
  });

  it("lets only one of two concurrent creates through", async () => {
    const { user, lineage } = await ownerWithLineage();
    const results = await Promise.all([
      createEdition(user.id, lineage.id, edition),
      createEdition(user.id, lineage.id, { ...edition, code: "EGC2027" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await activeEditionCount(user.id)).toBe(1);
  });

  it("parses edits and refuses a bad one", async () => {
    const { user, lineage } = await ownerWithLineage();
    const e = await createEdition(user.id, lineage.id, edition);
    if (!e.ok) throw new Error(e.error.message);
    const ok = await updateEdition(e.value.id, { rulesText: "# Rules", siteMode: "live" });
    expect(ok.ok && ok.value.siteMode).toBe("live");
    expect(codeOf(await updateEdition(e.value.id, { name: "" }))).toBe("bad-input");
    expect(codeOf(await updateEdition("0123456789abcdef01234567", { name: "x" }))).toBe(
      "not-found",
    );
  });

  it("moves forward and refuses backward with the library's code", async () => {
    const { user, lineage } = await ownerWithLineage();
    const e = await createEdition(user.id, lineage.id, edition);
    if (!e.ok) throw new Error(e.error.message);
    expect((await moveEditionPhase(e.value.id, "bracket")).ok).toBe(true);
    expect(codeOf(await moveEditionPhase(e.value.id, "registration"))).toBe("bad-state");
  });
});
