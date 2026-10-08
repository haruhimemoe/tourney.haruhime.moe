/**
 * @file src/lib/public-page.ts
 * @desc What a public edition page loads, once per request (React cache): the viewer, their
 *       profile's time zone, and the public view. requirePublic answers 404 for an unknown or
 *       hidden edition, so a hidden edition looks like no edition to strangers.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth-session";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { type PublicPayload, publicEdition } from "@/services/public-view";

/** A visible edition with the viewer's zone (null when their profile has none). */
export type PublicPage = PublicPayload & { zone: string | null; viewerId: string | null };

/**
 * @function viewerZone
 * @param userId {string | null} the signed-in account
 * @returns {Promise<string | null>} their profile's time zone, or null
 */
export const viewerZone = async (userId: string | null): Promise<string | null> => {
  if (!userId) return null;
  await connectDb();
  return (await collections(getDb()).profiles.findOne({ userId }))?.timezone ?? null;
};

/**
 * @function requirePublic
 * @param lineageSlug {string} the lineage in the URL
 * @param editionSlug {string} the edition in the URL
 * @returns {Promise<PublicPage>} the page's data; 404 when unknown or hidden from this viewer
 */
export const requirePublic = cache(
  async (lineageSlug: string, editionSlug: string): Promise<PublicPage> => {
    const viewerId = (await getCurrentUser())?.id ?? null;
    const view = await publicEdition(lineageSlug, editionSlug, viewerId);
    if (!view || "hidden" in view) notFound();
    return { ...view, zone: await viewerZone(viewerId), viewerId };
  },
);
