/**
 * @file tests/helpers/manage.ts
 * @desc Calling /api/manage routes in tests: a seeded owner, lineage and setup edition, each
 *       route's module by path, a same-origin request with a session cookie, and every
 *       collection's document count (to show nothing was written).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { ObjectId } from "mongodb";
import type { ManageRoute } from "@/constants/manage-routes";
import { collections, toId } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { Lineage } from "@/schemas/lineage";
import type { StoredTeam } from "@/schemas/team";
import { createEdition } from "@/services/editions";
import { createLineage } from "@/services/lineages";
import { createTestUser, type TestUser } from "./auth";
import { EDITION_INPUT, LINEAGE_INPUT } from "./inputs";

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/** Each manage route's module, by path pattern. */
const MODULES: Record<string, () => Promise<Record<string, unknown>>> = {
  "/api/manage/lineages": () => import("@/app/api/manage/lineages/route"),
  "/api/manage/[lineage]/admins": () => import("@/app/api/manage/[lineage]/admins/route"),
  "/api/manage/[lineage]/editions": () => import("@/app/api/manage/[lineage]/editions/route"),
  "/api/manage/[lineage]/[edition]/phase": () =>
    import("@/app/api/manage/[lineage]/[edition]/phase/route"),
  "/api/manage/[lineage]/[edition]/registrations/review": () =>
    import("@/app/api/manage/[lineage]/[edition]/registrations/review/route"),
  "/api/manage/[lineage]/[edition]/settings": () =>
    import("@/app/api/manage/[lineage]/[edition]/settings/route"),
  "/api/manage/[lineage]/[edition]/rounds": () =>
    import("@/app/api/manage/[lineage]/[edition]/rounds/route"),
  "/api/manage/[lineage]/[edition]/qualifiers/scores": () =>
    import("@/app/api/manage/[lineage]/[edition]/qualifiers/scores/route"),
  "/api/manage/[lineage]/[edition]/qualifiers/fill": () =>
    import("@/app/api/manage/[lineage]/[edition]/qualifiers/fill/route"),
  "/api/manage/[lineage]/[edition]/seeds": () =>
    import("@/app/api/manage/[lineage]/[edition]/seeds/route"),
  "/api/manage/[lineage]/[edition]/bracket": () =>
    import("@/app/api/manage/[lineage]/[edition]/bracket/route"),
  "/api/manage/[lineage]/[edition]/matches/[code]/time": () =>
    import("@/app/api/manage/[lineage]/[edition]/matches/[code]/time/route"),
  "/api/manage/[lineage]/[edition]/schedule/suggest": () =>
    import("@/app/api/manage/[lineage]/[edition]/schedule/suggest/route"),
  "/api/manage/[lineage]/[edition]/matches/[code]/result": () =>
    import("@/app/api/manage/[lineage]/[edition]/matches/[code]/result/route"),
  "/api/manage/[lineage]/[edition]/matches/[code]/forfeit": () =>
    import("@/app/api/manage/[lineage]/[edition]/matches/[code]/forfeit/route"),
  "/api/manage/[lineage]/[edition]/matches/[code]/fill": () =>
    import("@/app/api/manage/[lineage]/[edition]/matches/[code]/fill/route"),
};

/** A body each route parses, so a refusal can't come from the body. */
const BODIES: Record<string, unknown> = {
  "/api/manage/lineages": {
    slug: "other-cup",
    name: "Other Cup",
    description: "",
    defaults: LINEAGE_INPUT.defaults,
  },
  "/api/manage/[lineage]/admins": { add: 2 },
  "/api/manage/[lineage]/editions": { ...EDITION_INPUT, code: "EGC2027" },
  "/api/manage/[lineage]/[edition]/phase": { to: "registration" },
  "/api/manage/[lineage]/[edition]/registrations/review": { ids: ["0".repeat(24)], to: "approved" },
  "/api/manage/[lineage]/[edition]/settings": {
    eligibility: { rank: null, countries: null, regions: null },
  },
  "/api/manage/[lineage]/[edition]/rounds": { rounds: [] },
  "/api/manage/[lineage]/[edition]/qualifiers/scores": { rows: [] },
  "/api/manage/[lineage]/[edition]/qualifiers/fill": {
    mpLink: "https://osu.ppy.sh/community/matches/1",
  },
  "/api/manage/[lineage]/[edition]/seeds": { method: "qualifiers" },
  "/api/manage/[lineage]/[edition]/matches/[code]/time": { at: null },
  "/api/manage/[lineage]/[edition]/schedule/suggest": { round: "SF" },
  "/api/manage/[lineage]/[edition]/matches/[code]/result": {
    score: { a: 5, b: 0 },
    maps: [],
    pickBans: [],
    mpLinks: [],
    streamUrl: null,
    vodUrl: null,
  },
  "/api/manage/[lineage]/[edition]/matches/[code]/forfeit": { winner: "a" },
  "/api/manage/[lineage]/[edition]/matches/[code]/fill": {
    mpLink: "https://osu.ppy.sh/mp/1",
    warmups: 0,
    skip: [],
  },
};

/**
 * @function seedLineage
 * @returns {Promise<{ owner: TestUser; lineage: Lineage; editionId: string }>} an owner, their
 *          lineage and its edition in setup
 */
export const seedLineage = async (): Promise<{
  owner: TestUser;
  lineage: Lineage;
  editionId: string;
}> => {
  const owner = await createTestUser(1, "owner");
  const lineage = await createLineage(owner.id, LINEAGE_INPUT);
  if (!lineage.ok) throw new Error(lineage.error.message);
  const edition = await createEdition(owner.id, lineage.value.id, EDITION_INPUT);
  if (!edition.ok) throw new Error(edition.error.message);
  return { owner, lineage: lineage.value, editionId: edition.value.id };
};

/**
 * @function callRoute
 * @param route {ManageRoute} the route
 * @param lineage {string} the lineage slug
 * @param cookie {string | null} a session cookie, or null for a visitor
 * @param segments {Record<string, string>} other URL segments (edition, code)
 * @returns {Promise<Response>} the route's answer to a same-origin JSON request
 */
export const callRoute = async (
  route: ManageRoute,
  lineage: string,
  cookie: string | null,
  segments: Record<string, string> = { edition: "egc2026", code: "M1" },
): Promise<Response> => {
  const load = MODULES[route.path];
  if (!load) throw new Error(`No module for ${route.path}`);
  const handler = (await load())[route.method] as Handler | undefined;
  if (!handler) throw new Error(`${route.path} has no ${route.method}`);
  const params: Record<string, string> = { lineage, ...segments };
  const url = route.path.replace(/\[(\w+)\]/g, (_, key: string) => params[key] ?? key);
  const request = new Request(`https://tourney.haruhime.moe${url}`, {
    method: route.method,
    headers: {
      "content-type": "application/json",
      origin: "https://tourney.haruhime.moe",
      "sec-fetch-site": "same-origin",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(BODIES[route.path] ?? {}),
  });
  return handler(request, { params: Promise.resolve(params) });
};

/**
 * @function snapshotCounts
 * @returns {Promise<Record<string, number>>} each collection's document count, rate limits left
 *          out (a refused call may still count)
 */
export const snapshotCounts = async (): Promise<Record<string, number>> => {
  const db = getDb();
  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const counts: Record<string, number> = {};
  for (const name of names)
    if (name !== "rate_limits") counts[name] = await db.collection(name).countDocuments();
  return counts;
};

/**
 * @function seedTeams
 * @param editionId {string} the edition
 * @param count {number} how many active 2-player teams
 * @returns {Promise<StoredTeam[]>} "Team 1".."Team n", rosters [100i+1, 100i+2], oldest first
 */
export const seedTeams = async (editionId: string, count: number): Promise<StoredTeam[]> => {
  const docs = Array.from({ length: count }, (_, i) => ({
    _id: new ObjectId(),
    editionId,
    name: `Team ${i + 1}`,
    tag: null,
    captainId: 100 * (i + 1) + 1,
    roster: [100 * (i + 1) + 1, 100 * (i + 1) + 2],
    subs: [],
    seed: null,
    status: "active" as const,
  }));
  await collections(getDb()).teams.insertMany(docs);
  return docs.map(toId);
};
