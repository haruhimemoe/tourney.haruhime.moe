/**
 * @file src/utils/random.ts
 * @desc Repeatable randomness for random seeding: mulberry32 (a small 32-bit generator) and a
 *       Fisher-Yates shuffle driven by it, so a stored seed number rebuilds the same order.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

/**
 * @function mulberry32
 * @param seed {number} any integer
 * @returns {() => number} a generator of numbers in [0, 1), the same run for the same seed
 */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * @function seededShuffle
 * @param items {readonly T[]} what to shuffle (left as is)
 * @param seed {number} the seed number
 * @returns {T[]} a shuffled copy, the same for the same items and seed
 */
export const seededShuffle = <T>(items: readonly T[], seed: number): T[] => {
  const next = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};
