/**
 * @file src/lib/module-card-dto.ts
 * @desc Maps a registry TourneyModule down to the plain fields the Modules tab's card actually
 *       renders. TourneyModule carries functions (settingsHref, exportUser, deleteUser) that
 *       React can't serialize across the server/client boundary, so the server page resolves
 *       settingsHref here, on the server, and hands the "use client" ModuleCard only data.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import type { TourneyModule } from "@/modules/types";

/** The plain fields ModuleCard renders; no functions, so it's safe to pass to a "use client"
 *  component across the RSC boundary. */
export type ModuleCardDto = {
  id: string;
  name: string;
  description: string;
  settingsUrl: string | null;
  enabled: boolean;
};

/**
 * @function moduleCardDto
 * @param mod {TourneyModule} a registry entry, functions and all
 * @param base {string} the Modules tab's own path for this edition, passed to settingsHref
 * @param enabled {boolean} whether the lineage has it on
 * @returns {ModuleCardDto} the plain, serializable fields ModuleCard renders
 */
export const moduleCardDto = (
  mod: TourneyModule,
  base: string,
  enabled: boolean,
): ModuleCardDto => ({
  id: mod.id,
  name: mod.name,
  description: mod.description,
  settingsUrl: mod.settingsHref?.(base) ?? null,
  enabled,
});
