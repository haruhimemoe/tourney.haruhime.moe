/**
 * @file tests/integration/api/registration-route.test.ts
 * @desc The public registration route: a cross-site POST is refused, the 11th submit from one IP
 *       in an hour gets 429, and a signed-in player registers, edits and withdraws.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DELETE, PATCH, POST } from "@/app/api/editions/[lineage]/[edition]/registration/route";
import { collections, fromId } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";
import { osuHandlers } from "../../helpers/osu-server";

setupTestDb();
const server = setupServer(...osuHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const SOLO = { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 } as const;

const openSolo = async () => {
  const { lineage, editionId } = await seedLineage();
  await collections(getDb()).editions.updateOne(
    { _id: fromId(editionId) ?? undefined },
    {
      $set: {
        phase: "registration",
        sides: SOLO,
        registration: { opensAt: null, closesAt: null, playerCap: null, staffCap: null },
      },
    },
  );
  return lineage.slug;
};

const call = (
  handler: typeof POST,
  lineage: string,
  {
    cookie,
    body = { answers: {} },
    method = "POST",
    headers = {},
  }: {
    cookie?: string;
    body?: unknown;
    method?: string;
    headers?: Record<string, string>;
  } = {},
) =>
  handler(
    new Request(`https://tourney.haruhime.moe/api/editions/${lineage}/egc2026/registration`, {
      method,
      headers: {
        "content-type": "application/json",
        origin: "https://tourney.haruhime.moe",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "203.0.113.5",
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: method === "DELETE" ? null : JSON.stringify(body),
    }),
    { params: Promise.resolve({ lineage, edition: "egc2026" }) },
  );

describe("registration route", () => {
  it("refuses to register for a hidden edition", async () => {
    const lineage = await openSolo();
    await collections(getDb()).editions.updateOne(
      { slug: "egc2026" },
      { $set: { siteMode: "hidden" } },
    );
    const user = await createTestUser(1001);
    const res = await call(POST, lineage, { cookie: user.cookie });
    expect(res.status).toBe(404);
    expect(await collections(getDb()).registrations.countDocuments()).toBe(0);
  });

  it("refuses a cross-site POST and writes nothing", async () => {
    const lineage = await openSolo();
    const user = await createTestUser(1001);
    const res = await call(POST, lineage, {
      cookie: user.cookie,
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(res.status).toBe(403);
    expect(await collections(getDb()).registrations.countDocuments({})).toBe(0);
  });

  it("answers the 11th submit from one IP in an hour with 429", async () => {
    const lineage = await openSolo();
    for (let i = 0; i < 10; i++) expect((await call(POST, lineage)).status).toBe(401);
    const res = await call(POST, lineage);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("registers, edits answers and withdraws a signed-in player", async () => {
    const lineage = await openSolo();
    const user = await createTestUser(1001);
    const made = await call(POST, lineage, { cookie: user.cookie });
    expect(made.status).toBe(201);
    expect((await made.json()).registration).toMatchObject({ status: "pending", osuId: 1001 });
    const again = await call(POST, lineage, { cookie: user.cookie });
    expect(again.status).toBe(409);
    expect((await again.json()).error).toMatchObject({
      code: "already-registered",
      existing: { osuId: 1001 },
    });
    expect((await call(PATCH, lineage, { cookie: user.cookie, method: "PATCH" })).status).toBe(200);
    const gone = await call(DELETE, lineage, { cookie: user.cookie, method: "DELETE" });
    expect((await gone.json()).registration).toMatchObject({ status: "withdrawn" });
  });

  it("refuses a restricted account with its code", async () => {
    const lineage = await openSolo();
    const user = await createTestUser(404);
    const res = await call(POST, lineage, { cookie: user.cookie });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("osu-user-unavailable");
  });
});
