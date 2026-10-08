/**
 * @file src/utils/local-time.ts
 * @desc datetime-local inputs and stored instants: an input holds the browser's wall time, the
 *       database holds UTC ISO instants.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * @function toLocalInput
 * @param iso {string | null} a stored instant
 * @returns {string} its datetime-local value in the browser's zone, or "" for none
 */
export const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * @function fromLocalInput
 * @param value {string} a datetime-local value
 * @returns {string | null} the instant it names as UTC ISO, or null when empty or invalid
 */
export const fromLocalInput = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
