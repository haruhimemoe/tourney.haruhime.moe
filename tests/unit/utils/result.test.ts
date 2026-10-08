/**
 * @file tests/unit/utils/result.test.ts
 * @desc ok wraps a value; fail carries the code and its message unless one is given.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/constants/errors";
import { fail, ok } from "@/utils/result";

it("wraps a value", () => {
  expect(ok(3)).toEqual({ ok: true, value: 3 });
});

it("fails with the code's message, or the one given", () => {
  expect(fail("forbidden")).toEqual({
    ok: false,
    error: { code: "forbidden", message: ERROR_MESSAGES.forbidden },
  });
  expect(fail("bad-input", "Name is empty.").error.message).toBe("Name is empty.");
});
