/**
 * @file src/utils/zoned-time.ts
 * @desc Formatting an instant in a time zone for public pages: "Tue, Nov 3, 03:00 PM" for a
 *       time, "Tue, Nov 3" for a day heading. Thin wrappers over next-kit's formatInstant, kept
 *       under their own names so callers don't churn. formatInstant pins the "en-US" locale, so
 *       hourCycle null isn't the viewer's own locale deciding: it's that locale's default,
 *       12-hour with AM/PM (kept, not the visitor's locale, so the server and browser render
 *       the same text and stay hydration-safe).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { formatInstant } from "@haruhimemoe/next-kit/preferences";

/**
 * @function formatTime
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @param hourCycle {"h12" | "h23" | null} the hub preference, null for en-US's 12-hour default
 * @returns {string} like "Tue, Nov 3, 03:00 PM" (or "Tue, Nov 3, 15:00" for hourCycle "h23")
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
