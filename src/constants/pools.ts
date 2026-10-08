/**
 * @file src/constants/pools.ts
 * @desc Where pools.haruhime.moe lives: env POOLS_URL, or the public site.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

/** The public pools site. */
export const DEFAULT_POOLS_URL = "https://pools.haruhime.moe";

/**
 * @function poolsUrl
 * @returns {string} env POOLS_URL without a trailing slash, or DEFAULT_POOLS_URL
 */
export const poolsUrl = (): string =>
  (process.env.POOLS_URL?.trim() || DEFAULT_POOLS_URL).replace(/\/+$/, "");
