/**
 * @file tests/integration/api/manage-create.test.ts
 * @desc The create and phase routes for a member: a lineage is made (201) and a second with its
 *       slug is 409 slug-taken; an edition is made, and a second hits the owner's limit (409);
 *       the phase moves forward, and backward is 422 with the error map's message.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/constants/errors";
import { MANAGE_ROUTES } from "@/constants/manage-routes";
import { setupTestDb } from "../../helpers/db";
import { callRoute, seedLineage } from "../../helpers/manage";

setupTestDb();

const route = (path: string) => {
  const found = MANAGE_ROUTES.find((r) => r.path === path);
  if (!found) throw new Error(path);
  return found;
};

describe("create and phase routes", () => {
  it("makes a lineage, then refuses its slug", async () => {
    const { owner } = await seedLineage();
    const lineages = route("/api/manage/lineages");
    expect((await callRoute(lineages, "x", owner.cookie)).status).toBe(201);
    const again = await callRoute(lineages, "x", owner.cookie);
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("slug-taken");
  });

  it("refuses a second active edition with the owner's limit", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callRoute(
      route("/api/manage/[lineage]/editions"),
      lineage.slug,
      owner.cookie,
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("edition-limit");
  });

  it("moves the phase forward, and refuses backward with the message", async () => {
    const { owner, lineage } = await seedLineage();
    const phase = route("/api/manage/[lineage]/[edition]/phase");
    expect((await callRoute(phase, lineage.slug, owner.cookie)).status).toBe(200);
    const back = await callRoute(phase, lineage.slug, owner.cookie);
    expect(back.status).toBe(422);
    expect(await back.json()).toEqual({
      error: { code: "bad-state", message: ERROR_MESSAGES["bad-state"] },
    });
  });

  it("answers 404 for an unknown edition", async () => {
    const { owner, lineage } = await seedLineage();
    const phase = route("/api/manage/[lineage]/[edition]/phase");
    const res = await callRoute(phase, lineage.slug, owner.cookie, { edition: "nope" });
    expect(res.status).toBe(404);
  });
});
