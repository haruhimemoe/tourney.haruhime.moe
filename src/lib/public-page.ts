/**
 * @file src/lib/public-page.ts
 * @desc What a public edition page loads, once per request (React cache): the viewer, their
 *       display preferences, and the public view. requirePublic answers 404 for an unknown or
 *       hidden edition, so a hidden edition looks like no edition to strangers.
 *
 *       The viewer's zone prefers the hub's preferences.timezone (set at
 *       https://haruhime.moe/account#time), falling back to the profile's own stored
 *       `timezone` (kept until profiles stop carrying it), then null (UTC on the server,
 *       the browser's zone after mount). hourCycle is the hub's alone: null renders as
 *       formatInstant's pinned "en-US" default (12-hour, AM/PM), never the visitor's own
 *       locale (formatInstant always formats as en-US, so this stays hydration-safe).
 *
 *       resolveViewerPrefs takes the session's already-read `preferences` rather than reading
 *       them again: requirePublic and every caller here get them from getCurrentUser(), so a
 *       second readPreferences per request would just be a redundant identity query.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import "server-only";
import type { Preferences } from "@haruhimemoe/next-kit/preferences";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth-session";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
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
 * @function resolveViewerPrefs
 * @param userId {string | null} the signed-in account
 * @param preferences {Preferences | null} their session's preferences, already read by
 *        getCurrentUser (null when signed out)
 * @returns {Promise<ViewerPrefs>} preferences.timezone, falling back to the profile's stored
 *          zone, then null; preferences.hourCycle as given (null: formatInstant's en-US
 *          default)
 */
export const resolveViewerPrefs = async (
  userId: string | null,
  preferences: Preferences | null,
): Promise<ViewerPrefs> => {
  if (!userId || !preferences) return { zone: null, hourCycle: null };
  const zone = preferences.timezone ?? (await profileTimezone(userId));
  return { zone, hourCycle: preferences.hourCycle };
};

/**
 * @function requirePublic
 * @param lineageSlug {string} the lineage in the URL
 * @param editionSlug {string} the edition in the URL
 * @returns {Promise<PublicPage>} the page's data; 404 when unknown or hidden from this viewer
 */
export const requirePublic = cache(
  async (lineageSlug: string, editionSlug: string): Promise<PublicPage> => {
    const user = await getCurrentUser();
    const viewerId = user?.id ?? null;
    const view = await publicEdition(lineageSlug, editionSlug, viewerId);
    if (!view || "hidden" in view) notFound();
    const prefs = await resolveViewerPrefs(viewerId, user?.preferences ?? null);
    return { ...view, ...prefs, viewerId };
  },
);
