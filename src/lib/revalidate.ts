/**
 * @file src/lib/revalidate.ts
 * @desc Marks cached public pages stale after a write (the next visit rebuilds them): an
 *       edition's pages by its cache tag, and the lists (home, /browse, the sitemap).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * @function revalidateLists
 * @returns {void} the home page, /browse and the sitemap marked stale
 */
export const revalidateLists = (): void => {
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/sitemap.xml");
};

/**
 * @function revalidateEdition
 * @param editionId {string} the edition that changed
 * @returns {void} every cached read tagged with the edition id expired now (the next request
 *          rebuilds it, so a hidden edition or a pulled pool never shows stale), and the lists
 *          marked stale
 */
export const revalidateEdition = (editionId: string): void => {
  revalidateTag(editionId, { expire: 0 });
  revalidateLists();
};
