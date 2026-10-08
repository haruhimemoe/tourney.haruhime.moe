/**
 * @file tests/integration/services/availability.test.ts
 * @desc Availability saved in one zone reads back as the same instants in another, a bad zone is
 *       refused, and the default grid is copied into an edition once.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import {
  copyDefaultInto,
  getAvailability,
  localSlots,
  setAvailability,
} from "@/services/availability";
import { setupTestDb } from "../../helpers/db";

setupTestDb();

const at = new Date("2026-10-07T12:00:00.000Z");

describe("availability", () => {
  it("saves in Los Angeles and reads the same instants in Tokyo", async () => {
    // Monday 00:00 and 01:00 in Los Angeles (UTC-7) are Monday 16:00 and 17:00 in Tokyo (UTC+9).
    const saved = await setAvailability("u1", null, "America/Los_Angeles", [0, 1], at);
    expect(saved).toMatchObject({
      ok: true,
      value: { zone: "America/Los_Angeles", grid: { slots: [7, 8] } },
    });
    const stored = await getAvailability("u1", null);
    expect(stored && localSlots(stored, "Asia/Tokyo", at)).toEqual([16, 17]);
    expect(stored && localSlots(stored, "America/Los_Angeles", at)).toEqual([0, 1]);
  });

  it("refuses an unknown zone", async () =>
    expect(await setAvailability("u1", null, "Mars/Base", [0], at)).toMatchObject({
      ok: false,
      error: { code: "bad-input" },
    }));

  it("copies the default into an edition once", async () => {
    await setAvailability("u1", null, "UTC", [3], at);
    await copyDefaultInto("u1", "e1");
    expect((await getAvailability("u1", "e1"))?.grid.slots).toEqual([3]);
    await setAvailability("u1", "e1", "UTC", [4], at);
    await copyDefaultInto("u1", "e1");
    expect((await getAvailability("u1", "e1"))?.grid.slots).toEqual([4]);
  });
});
