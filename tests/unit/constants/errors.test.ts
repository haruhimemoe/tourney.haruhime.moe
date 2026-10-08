/**
 * @file tests/unit/constants/errors.test.ts
 * @desc Every library and app error code has a plain message without an em dash, an unknown code
 *       falls back, and errorResponse builds the JSON body.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, errorMessage, errorResponse } from "@/constants/errors";

describe("error messages", () => {
  it("has a non-empty message with no em dash for every code", () => {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message.length, code).toBeGreaterThan(0);
      expect(message, code).not.toContain("—");
    }
  });

  it("falls back for an unknown code", () => {
    expect(errorMessage("nope")).toBe("Something went wrong. Try again.");
  });

  it("builds a JSON response", async () => {
    const res = errorResponse({ code: "slug-taken" }, 409);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "slug-taken", message: ERROR_MESSAGES["slug-taken"] },
    });
  });
});
