/**
 * @file src/lib/public-page.ts
 * @desc What a public edition page loads, once per request (React cache): the viewer, their
 *       display preferences, and the public view. requirePublic answers 404 for an unknown or
 *       hidden edition, so a hidden edition looks like no edition to strangers.
 *
 *       The viewer's zone prefers the hub's preferences.timezone (set at
 *       https://haruhime.moe/account#time), falling back to the profile's own stored
 *       `timezone` (kept until profiles stop carrying it), then null (UTC on the server,
 *       the browser's zone after mount). hourCycle is the hub's alone: null leaves the
 *       browser locale to decide, never forced to 24-hour.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import "server-only";
import { readPreferences } from "@haruhimemoe/next-kit/preferences/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth-session";
import { collections } from "@/lib/collections";
import { connectDb, getDb, getIdentityDb } from "@/lib/db";
import { type PublicPayload, publicEdition } from "@/services/public-view";

/** The viewer's resolved display preferences: zone (hub, else profile, else null), hour cycle. */
export type ViewerPrefs = { zone: string | null; hourCycle: "h12" | "h23" | null };

/** A visible edition with the viewer's display preferences. */
export type PublicPage = PublicPayload & ViewerPrefs & { viewerId: string | null };

/**
 * @function profileTimezone
 * @param userId {string} the signed-in account
 * @returns {Promise<string | null>} their profile's stored time zone, or null
 */
export const profileTimezone = async (userId: string): Promise<string | null> => {
  await connectDb();
  return (await collections(getDb()).profiles.findOne({ userId }))?.timezone ?? null;
};

/**
 * @function viewerPrefs
 * @param userId {string | null} the signed-in account
 * @returns {Promise<ViewerPrefs>} the hub's preferences.timezone, falling back to the
 *          profile's stored zone, then null; the hub's hourCycle (null: the browser decides)
 */
export const viewerPrefs = async (userId: string | null): Promise<ViewerPrefs> => {
  if (!userId) return { zone: null, hourCycle: null };
  await connectDb();
  const prefs = await readPreferences(getIdentityDb(), userId);
  const zone = prefs.timezone ?? (await profileTimezone(userId));
  return { zone, hourCycle: prefs.hourCycle };
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
    return { ...view, ...(await viewerPrefs(viewerId)), viewerId };
  },
);
