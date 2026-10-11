/**
 * @file src/lib/modules.ts
 * @desc Whether an opt-in module is on for a lineage, and the two guards built on it:
 *       requireModulePage for a public page (404 via notFound, same as an unknown lineage) and
 *       moduleRoute for a /api/manage route (wraps manageRoute, 404 before the handler runs).
 *       Both answer 404, not 403, so a disabled module never reveals itself to someone without
 *       the role. isEnabled only reads `lineage.modules`; a toggle that isn't in the registry
 *       never lands there in the first place (checkRegistry/the toggle route refuse it first).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import "server-only";
import { notFound } from "next/navigation";
import { errorResponse } from "@/constants/errors";
import { type ManageHandler, manageRoute } from "@/lib/manage-route";
import type { Lineage, LineageRole } from "@/schemas/lineage";

/**
 * @function isEnabled
 * @param lineage {Lineage} the lineage
 * @param id {string} a module id
 * @returns {boolean} true when that lineage has turned the module on
 */
export const isEnabled = (lineage: Lineage, id: string): boolean => lineage.modules.includes(id);

/**
 * @function requireModulePage
 * @param lineage {Lineage} the lineage the page is for
 * @param id {string} the module the page belongs to
 * @returns {void} nothing when enabled; calls notFound() (throws) when disabled
 */
export const requireModulePage = (lineage: Lineage, id: string): void => {
  if (!isEnabled(lineage, id)) notFound();
};

/**
 * @function moduleRoute
 * @param id {string} the module the route belongs to
 * @param need {LineageRole} the role manageRoute requires
 * @param handler {ManageHandler} the work, run only when the module is enabled for the lineage
 * @returns {(request: Request, context: unknown) => Promise<Response>} a Next route handler;
 *          404 (not 403) when the module is off for that lineage, same as manageRoute's other
 *          refusals
 */
export const moduleRoute = (id: string, need: LineageRole, handler: ManageHandler) =>
  manageRoute(need, async (ctx, request) => {
    if (!isEnabled(ctx.lineage, id)) return errorResponse({ code: "not-found" }, 404);
    return handler(ctx, request);
  });
