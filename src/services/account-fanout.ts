/**
 * @file src/services/account-fanout.ts
 * @desc What the hub's account fan-out (/api/internal/account/[op]) exports and deletes in
 *       tourney, given only an identity user id. Nothing is stored per user yet; the lineage,
 *       registration and availability services fill this in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";

/**
 * @function exportAccountData
 * @param _userId {string} an identity user id
 * @returns {Promise<object>} this app's data for them
 */
export const exportAccountData = async (_userId: string): Promise<object> => ({});

/**
 * @function deleteAccountData
 * @param _userId {string} an identity user id
 * @returns {Promise<void>} once their data is gone (running it again is fine)
 */
export const deleteAccountData = async (_userId: string): Promise<void> => {};
