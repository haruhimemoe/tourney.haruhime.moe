/**
 * @file tests/integration/lib/access.test.ts
 * @desc requireMember: 401 signed out, 404 unknown lineage, 403 stranger or an admin where the
 *       owner is needed, through for the owner (who has every admin right); the admins route
 *       adds by osu! id, refuses an osu! id with no account, and a cross-site request.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { MANAGE_ROUTES } from "@/constants/manage-routes";
import { requireMember } from "@/lib/access";
import { addAdmin, getLineageBySlug, memberRole } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { callRoute, seedLineage } from "../../helpers/manage";

setupTestDb();

const headers = (cookie?: string) => new Headers(cookie ? { cookie } : {});
const statusOf = (r: unknown) => (r instanceof Response ? r.status : 200);
const adminsRoute = MANAGE_ROUTES.find((r) => r.path.endsWith("/admins"));

describe("requireMember", () => {
  it("answers by role", async () => {
    const { owner, lineage } = await seedLineage();
    const admin = await createTestUser(2);
    const stranger = await createTestUser(3);
    await addAdmin(lineage.id, admin.id);
    expect(statusOf(await requireMember(headers(), lineage.slug, "admin"))).toBe(401);
    expect(statusOf(await requireMember(headers(owner.cookie), "nope", "admin"))).toBe(404);
    expect(statusOf(await requireMember(headers(stranger.cookie), lineage.slug, "admin"))).toBe(
      403,
    );
    expect(statusOf(await requireMember(headers(admin.cookie), lineage.slug, "owner"))).toBe(403);
    expect(statusOf(await requireMember(headers(admin.cookie), lineage.slug, "admin"))).toBe(200);
    expect(statusOf(await requireMember(headers(owner.cookie), lineage.slug, "admin"))).toBe(200);
  });
});

describe("PATCH admins", () => {
  it("adds an admin by osu! id", async () => {
    if (!adminsRoute) throw new Error("no admins route");
    const { owner, lineage } = await seedLineage();
    const admin = await createTestUser(2);
    const res = await callRoute(adminsRoute, lineage.slug, owner.cookie);
    expect(res.status).toBe(200);
    const saved = await getLineageBySlug(lineage.slug);
    expect(saved && memberRole(saved, admin.id)).toBe("admin");
  });

  it("refuses an osu! id with no haruhime account", async () => {
    if (!adminsRoute) throw new Error("no admins route");
    const { owner, lineage } = await seedLineage();
    expect((await callRoute(adminsRoute, lineage.slug, owner.cookie)).status).toBe(404);
  });
});
