/**
 * @file tests/integration/api/modules.test.ts
 * @desc PUT /api/manage/[lineage]/modules: an admin or owner turns a registered module on or
 *       off for the lineage ($addToSet/$pull, so a repeat toggle is a no-op, not an error).
 *       Enabling an id the registry doesn't know is refused 400 before anything is saved;
 *       disabling one never checks the registry, so a stale id still clears. Enabling past the
 *       32-module cap is refused 400 (the cap check rides in the same atomic update as the
 *       `$addToSet`), but enabling a module that's already one of the 32 still answers 200.
 *       Every public page the app can revalidate for a lineage is marked stale.
 *       `@/modules/registry` is mocked with a fixture module, since the real MODULES list is
 *       empty.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it, vi } from "vitest";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";

const MODULE_ID = "test-module";

vi.mock("@/modules/registry", () => ({
  MODULES: [{ id: MODULE_ID }],
  findModule: (id: string) => (id === MODULE_ID ? { id } : undefined),
  checkRegistry: () => {},
}));

const revalidateLists = vi.fn();
vi.mock("@/lib/revalidate", () => ({ revalidateLists, revalidateEdition: vi.fn() }));

setupTestDb();

const call = async (lineageSlug: string, cookie: string | null, body: unknown) => {
  const { PUT } = await import("@/app/api/manage/[lineage]/modules/route");
  const request = new Request(`https://tourney.haruhime.moe/api/manage/${lineageSlug}/modules`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin: "https://tourney.haruhime.moe",
      "sec-fetch-site": "same-origin",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return PUT(request, { params: Promise.resolve({ lineage: lineageSlug }) });
};

describe("PUT /api/manage/[lineage]/modules", () => {
  it("enables a known id for an admin and marks the lists stale", async () => {
    revalidateLists.mockClear();
    const { owner, lineage } = await seedLineage();
    const res = await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(200);
    expect((await res.json()).lineage.modules).toEqual([MODULE_ID]);
    expect(revalidateLists).toHaveBeenCalled();
  });

  it("is idempotent: enabling twice stays a single entry", async () => {
    const { owner, lineage } = await seedLineage();
    await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    const res = await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(200);
    expect((await res.json()).lineage.modules).toEqual([MODULE_ID]);
  });

  it("disables with $pull", async () => {
    const { owner, lineage } = await seedLineage();
    await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    const res = await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: false });
    expect(res.status).toBe(200);
    expect((await res.json()).lineage.modules).toEqual([]);
  });

  it("refuses enabling an id the registry doesn't know with 400, nothing saved", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await call(lineage.slug, owner.cookie, { id: "nope", enabled: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeDefined();
    const { getLineageBySlug } = await import("@/services/lineages");
    expect((await getLineageBySlug(lineage.slug))?.modules).toEqual([]);
  });

  it("disables an id the registry doesn't know: 200, removed", async () => {
    const { owner, lineage } = await seedLineage();
    const { collections } = await import("@/lib/collections");
    const { getDb } = await import("@/lib/db");
    await collections(getDb()).lineages.updateOne(
      { slug: lineage.slug },
      { $set: { modules: ["nope"] } },
    );
    const res = await call(lineage.slug, owner.cookie, { id: "nope", enabled: false });
    expect(res.status).toBe(200);
    expect((await res.json()).lineage.modules).toEqual([]);
  });

  it("refuses enabling past the 32-module cap with 400", async () => {
    const { owner, lineage } = await seedLineage();
    const { collections } = await import("@/lib/collections");
    const { getDb } = await import("@/lib/db");
    const full = Array.from({ length: 32 }, (_, i) => `filler-${i}`);
    await collections(getDb()).lineages.updateOne(
      { slug: lineage.slug },
      { $set: { modules: full } },
    );
    const res = await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(400);
  });

  it("still answers 200 enabling a module that's already one of the 32", async () => {
    const { owner, lineage } = await seedLineage();
    const { collections } = await import("@/lib/collections");
    const { getDb } = await import("@/lib/db");
    const full = Array.from({ length: 31 }, (_, i) => `filler-${i}`);
    full.push(MODULE_ID);
    await collections(getDb()).lineages.updateOne(
      { slug: lineage.slug },
      { $set: { modules: full } },
    );
    const res = await call(lineage.slug, owner.cookie, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(200);
    expect((await res.json()).lineage.modules).toEqual(full);
  });

  it("refuses a signed-in stranger with 403", async () => {
    const { lineage } = await seedLineage();
    const stranger = await createTestUser(999);
    const res = await call(lineage.slug, stranger.cookie, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(403);
  });

  it("refuses a signed-out visitor with 401", async () => {
    const { lineage } = await seedLineage();
    const res = await call(lineage.slug, null, { id: MODULE_ID, enabled: true });
    expect(res.status).toBe(401);
  });
});
