/**
 * @file src/constants/manage-routes.ts
 * @desc Every /api/manage route and the role it needs. The table test sends each one a stranger
 *       and a visitor and expects 403 and 401 with nothing written (a signedIn route only the
 *       401); every new manage route adds its row here.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { LineageRole } from "@/schemas/lineage";

/** One manage route: its path pattern, method and the role it needs. */
export type ManageRoute = {
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  /** signedIn: any signed-in account (creating a lineage); visitors get 401. */
  need: LineageRole | "signedIn";
};

/** Every manage route. */
export const MANAGE_ROUTES: readonly ManageRoute[] = [
  { path: "/api/manage/lineages", method: "POST", need: "signedIn" },
  { path: "/api/manage/[lineage]/admins", method: "PATCH", need: "owner" },
  { path: "/api/manage/[lineage]/editions", method: "POST", need: "admin" },
  { path: "/api/manage/[lineage]/[edition]/phase", method: "POST", need: "admin" },
  { path: "/api/manage/[lineage]/[edition]/registrations/review", method: "POST", need: "admin" },
  { path: "/api/manage/[lineage]/[edition]/settings", method: "PATCH", need: "admin" },
];
