/**
 * @file src/schemas/session-user.ts
 * @desc Who a request comes from, as the services take it: the signed-in osu! user
 *       (next-kit's OsuSessionUser), their hub display preferences (time zone, 12h/24h, read
 *       from the identity database since the session reader doesn't carry them), and whether
 *       ADMIN_OSU_IDS lists them right now. Types only, so services and src/lib/auth.ts share
 *       them without importing each other.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import type { OsuSessionUser } from "@haruhimemoe/next-kit/auth";
import type { Preferences } from "@haruhimemoe/next-kit/preferences";

/** The signed-in user, their hub preferences, and whether ADMIN_OSU_IDS lists them right now. */
export type SessionUser = OsuSessionUser & { isAdmin: boolean; preferences: Preferences };

/** A signed-in admin. */
export type AdminUser = OsuSessionUser & { preferences: Preferences };
