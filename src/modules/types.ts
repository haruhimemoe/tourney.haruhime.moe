/**
 * @file src/modules/types.ts
 * @desc Shapes an opt-in tourney module fits: id, scope, the permissions and events it owns,
 *       and the export/delete hooks every module needs for account data. No module ships here;
 *       this is the contract the registry and real modules (crowdfund, prize pool, customs, LAN)
 *       are checked against.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

/** Something a crowdfund stretch tier can unlock (spec 7 section 5). */
export type Unlockable = { module: string; key: string; label: string };

/** One opt-in feature: crowdfund, prize pool, customs, LAN later. */
export type TourneyModule = {
  /** kebab-case, unique across MODULES */
  id: string;
  name: string;
  description: string;
  /** a lineage carries the module across editions; an edition carries it alone */
  scope: "lineage" | "edition";
  /** each entry is "<id>.<action>" */
  permissions: readonly string[];
  /** each entry is "<id>.<event>" */
  events: readonly string[];
  /** link from the Modules tab card, given the host's base URL */
  settingsHref?: (base: string) => string;
  unlockables?: (editionId: string) => Promise<Unlockable[]>;
  exportUser: (userId: string) => Promise<Record<string, unknown>>;
  deleteUser: (userId: string) => Promise<void>;
};
