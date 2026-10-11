/**
 * @file tests/integration/lib/public-page.test.ts
 * @desc resolveViewerPrefs reuses a session's already-read preferences instead of reading them
 *       from the identity database a second time: one request (getUserFromHeaders, then
 *       resolveViewerPrefs with that same preferences object) reads identity preferences once,
 *       not twice.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import * as preferencesServer from "@haruhimemoe/next-kit/preferences/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserFromHeaders } from "@/lib/auth";
import { resolveViewerPrefs } from "@/lib/public-page";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";

setupTestDb();

afterEach(() => {
  vi.restoreAllMocks();
});

const headers = (cookie: string) => new Headers({ cookie });

describe("resolveViewerPrefs", () => {
  it("prefers the hub's stored zone and hour cycle", async () => {
    const prefs = JSON.stringify({ timezone: "Asia/Tokyo", hourCycle: "h12" });
    const user = await createTestUser(1, undefined, { preferences: prefs });
    const spy = vi.spyOn(preferencesServer, "readPreferences");

    const sessionUser = await getUserFromHeaders(headers(user.cookie));
    expect(sessionUser).not.toBeNull();
    const resolved = await resolveViewerPrefs(
      sessionUser?.id ?? null,
      sessionUser?.preferences ?? null,
    );

    expect(resolved).toEqual({ zone: "Asia/Tokyo", hourCycle: "h12" });
    // One read for the whole request: getUserFromHeaders reads identity preferences once;
    // resolveViewerPrefs reuses that result instead of reading them again.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("falls back to null, then the signed-out shape, without reading anything for no user", async () => {
    const spy = vi.spyOn(preferencesServer, "readPreferences");
    expect(await resolveViewerPrefs(null, null)).toEqual({ zone: null, hourCycle: null });
    expect(spy).not.toHaveBeenCalled();
  });
});
