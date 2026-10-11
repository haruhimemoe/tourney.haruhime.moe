/**
 * @file src/modules/registry.ts
 * @desc The list of opt-in tourney modules and the one function that may import it from core.
 *       checkRegistry throws on the first problem it finds (bad id shape, a duplicate id, or a
 *       permission/event that doesn't start with its own module's id), so a bad real entry fails
 *       CI instead of production. MODULES is empty until a real module ships.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import type { TourneyModule } from "@/modules/types";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @function checkRegistry
 * @param list {readonly TourneyModule[]} candidate module list
 * @returns {void}
 * @throws {Error} on the first id, permission, or event that breaks the contract
 */
export const checkRegistry = (list: readonly TourneyModule[]): void => {
  const seen = new Set<string>();

  for (const mod of list) {
    if (!KEBAB_CASE.test(mod.id)) throw new Error(`module id "${mod.id}" must be kebab-case`);

    if (seen.has(mod.id)) throw new Error(`module id "${mod.id}" is registered more than once`);
    seen.add(mod.id);

    for (const permission of mod.permissions)
      if (!permission.startsWith(`${mod.id}.`))
        throw new Error(
          `module "${mod.id}" has a permission outside its namespace: "${permission}"`,
        );

    for (const event of mod.events)
      if (!event.startsWith(`${mod.id}.`))
        throw new Error(`module "${mod.id}" has an event outside its namespace: "${event}"`);
  }
};

/** Every opt-in module the app knows about. Empty until a real module ships. */
export const MODULES: readonly TourneyModule[] = Object.freeze([]);

/**
 * @function findModule
 * @param id {string} a module id
 * @returns {TourneyModule | undefined} the registered module, or undefined
 */
export const findModule = (id: string): TourneyModule | undefined =>
  MODULES.find((mod) => mod.id === id);
