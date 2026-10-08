/**
 * @file tests/integration/api/account-fanout.test.ts
 * @desc The hub's account routes: 401 without the secret, delete 409 with owns-active-edition
 *       for an owner of a running edition and 204 for anyone else, export 200 with the data.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/internal/account/[op]/route";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";

setupTestDb();

const SECRET = "s".repeat(48);

beforeEach(() => {
  vi.stubEnv("ACCOUNT_FANOUT_SECRET", SECRET);
});

const call = (op: string, userId: string, secret: string | null = SECRET) =>
  POST(
    new Request(`https://tourney.haruhime.moe/api/internal/account/${op}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ userId }),
    }),
    { params: Promise.resolve({ op }) },
  );

describe("account fan-out", () => {
  it("refuses without the secret", async () => {
    const { owner } = await seedLineage();
    expect((await call("delete", owner.id, null)).status).toBe(401);
  });

  it("refuses to delete an owner of a running edition with the reason", async () => {
    const { owner } = await seedLineage();
    const res = await call("delete", owner.id);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("owns-active-edition");
  });

  it("deletes anyone else with 204, and exports", async () => {
    const user = await createTestUser(5);
    expect((await call("delete", user.id)).status).toBe(204);
    const exported = await call("export", user.id);
    expect(exported.status).toBe(200);
    expect(await exported.json()).toMatchObject({ registrations: [] });
  });

  it("answers 404 for another op", async () => {
    const user = await createTestUser(5);
    expect((await call("nope", user.id)).status).toBe(404);
  });
});
