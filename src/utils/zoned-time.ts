/**
 * @file src/utils/zoned-time.ts
 * @desc Formatting an instant in a time zone for public pages: "Tue, Nov 3, 03:00" for a time,
 *       "Tue, Nov 3" for a day heading. Thin wrappers over next-kit's formatInstant, kept under
 *       their own names so callers don't churn. hourCycle is optional and defaults to null: the
 *       viewer's locale decides (never forced to 24-hour).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { formatInstant } from "@haruhimemoe/next-kit/preferences";

/**
 * @function formatTime
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @param hourCycle {"h12" | "h23" | null} the hub preference, null for the locale's own
 * @returns {string} like "Tue, Nov 3, 03:00"
 */
export const formatTime = (
  iso: string,
  zone: string,
  hourCycle: "h12" | "h23" | null = null,
): string => formatInstant(iso, { timeZone: zone, hourCycle }, "time");

/**
 * @function formatDay
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @returns {string} like "Tue, Nov 3"
 */
export const formatDay = (iso: string, zone: string): string =>
  formatInstant(iso, { timeZone: zone, hourCycle: null }, "day");
