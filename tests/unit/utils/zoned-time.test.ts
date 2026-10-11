/**
 * @file tests/unit/utils/zoned-time.test.ts
 * @desc formatTime and formatDay: thin wrappers over next-kit's formatInstant. hourCycle
 *       defaults to null (the locale decides, never forced to 24-hour).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { formatDay, formatTime } from "@/utils/zoned-time";

describe("formatTime", () => {
  it("formats an instant in a zone with a given hour cycle", () => {
    expect(formatTime("2026-11-02T18:00:00.000Z", "Asia/Tokyo", "h23")).toBe("Tue, Nov 3, 03:00");
  });

  it("renders 12-hour with hourCycle h12", () => {
    expect(formatTime("2026-11-02T15:00:00.000Z", "UTC", "h12")).toBe("Mon, Nov 2, 03:00 PM");
  });

  it("leaves hourCycle out when absent, so the locale decides", () => {
    expect(formatTime("2026-11-02T15:00:00.000Z", "UTC")).toBe("Mon, Nov 2, 03:00 PM");
  });
});

describe("formatDay", () => {
  it("formats an instant's day in a zone", () => {
    expect(formatDay("2026-11-02T18:00:00.000Z", "Asia/Tokyo")).toBe("Tue, Nov 3");
  });
});
