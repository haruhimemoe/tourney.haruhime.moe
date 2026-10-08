/**
 * @file src/utils/zoned-time.ts
 * @desc Formatting an instant in a time zone for public pages: "Tue, Nov 3, 03:00" for a time,
 *       "Tue, Nov 3" for a day heading.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

/**
 * @function formatTime
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @returns {string} like "Tue, Nov 3, 03:00"
 */
export const formatTime = (iso: string, zone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  }).format(new Date(iso));

/**
 * @function formatDay
 * @param iso {string} an instant
 * @param zone {string} an IANA zone
 * @returns {string} like "Tue, Nov 3"
 */
export const formatDay = (iso: string, zone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: zone,
  }).format(new Date(iso));
