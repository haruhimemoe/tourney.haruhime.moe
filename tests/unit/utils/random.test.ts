/**
 * @file tests/unit/utils/random.test.ts
 * @desc mulberry32 and seededShuffle: the same seed gives the same numbers and order, another
 *       seed a different order, and nothing is lost or repeated.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { mulberry32, seededShuffle } from "@/utils/random";

describe("mulberry32", () => {
  it("repeats for a seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(first);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(first[0]);
  });
});

describe("seededShuffle", () => {
  const items = Array.from({ length: 16 }, (_, i) => `t${i}`);

  it("gives the same order for the same seed and keeps every item", () => {
    const once = seededShuffle(items, 2026);
    expect(seededShuffle(items, 2026)).toEqual(once);
    expect([...once].sort()).toEqual([...items].sort());
    expect(once).not.toEqual(items);
  });

  it("gives another order for another seed and leaves the input alone", () => {
    const copy = [...items];
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
    expect(items).toEqual(copy);
  });
});
