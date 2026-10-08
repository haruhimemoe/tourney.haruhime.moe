/**
 * @file src/services/public-view.ts
 * @desc What anyone may read about an edition. cachedPublicPayload is the only cached read
 *       (tagged with the edition id, which every write route revalidates); it holds no viewer
 *       data and is already stripped: no registration answers, snapshots beyond the osu!
 *       username, questions, host notes or reschedule history, and a round's pool id only once
 *       the pool is revealed. publicEdition decides who may see it on every request, outside the
 *       cache: `live` always, `auto` once past setup, `hidden` only lineage members.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import type { Bracket, Placement } from "@haruhimemoe/tourney";
import { unstable_cache } from "next/cache";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { Edition } from "@/schemas/edition";
import type { Lineage } from "@/schemas/lineage";
import type { StoredMatch } from "@/schemas/match";
import type { StoredRound } from "@/schemas/round";
import { editionResults, getBracket } from "@/services/brackets";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listRounds } from "@/services/rounds";
import { listTeams } from "@/services/teams";
import type { LlmsEdition } from "@/utils/llms-txt";

/** The lineage as the public sees it. */
export type PublicLineage = Pick<Lineage, "id" | "slug" | "name" | "description">;

/** The edition as the public sees it: its questions stay with the registration form. */
export type PublicEdition = Omit<Edition, "questions">;

/** A round; `poolId` is null until the pool is revealed. */
export type PublicRound = Omit<StoredRound, "poolId"> & { poolId: string | null };

/** A player on a team: the osu! id, and the username they registered with when they did. */
export type PublicPlayer = { osuId: number; username: string | null };

/** A team as the public sees it. */
export type PublicTeam = {
  id: string;
  name: string;
  tag: string | null;
  seed: number | null;
  status: "active" | "eliminated" | "withdrawn";
  captainId: number;
  players: PublicPlayer[];
  subs: PublicPlayer[];
};

/** A match as the public sees it: no host notes, no reschedule history. */
export type PublicMatch = Omit<StoredMatch, "notes" | "reschedules">;

/** Everything a public page reads. */
export type PublicPayload = {
  lineage: PublicLineage;
  edition: PublicEdition;
  rounds: PublicRound[];
  teams: PublicTeam[];
  bracket: Bracket | null;
  matches: PublicMatch[];
  results: { champion: string | null; placements: Placement[] };
};

/** What publicEdition answers: the payload, hidden, or null for an unknown edition. */
export type PublicView = PublicPayload | { hidden: true } | null;

/**
 * @function buildPayload
 * @param lineage {Lineage} the lineage
 * @param edition {Edition} the edition
 * @returns {Promise<PublicPayload>} the stripped payload
 */
const buildPayload = async (lineage: Lineage, edition: Edition): Promise<PublicPayload> => {
  await connectDb();
  const db = collections(getDb());
  const [rounds, teams, stored, matches, results, regs] = await Promise.all([
    listRounds(edition.id),
    listTeams(edition.id),
    getBracket(edition.id),
    db.matches.find({ editionId: edition.id }).sort({ bracketCode: 1 }).toArray(),
    editionResults(edition.id),
    db.registrations
      .find({ editionId: edition.id }, { projection: { osuId: 1, "snapshot.username": 1 } })
      .toArray(),
  ]);
  const usernames = new Map(
    regs.flatMap((r) => (r.snapshot ? [[r.osuId, r.snapshot.username] as const] : [])),
  );
  const player = (osuId: number): PublicPlayer => ({
    osuId,
    username: usernames.get(osuId) ?? null,
  });
  const { questions: _questions, ...publicEdition } = edition;
  return {
    lineage: {
      id: lineage.id,
      slug: lineage.slug,
      name: lineage.name,
      description: lineage.description,
    },
    edition: publicEdition,
    rounds: rounds.map((r) => ({ ...r, poolId: r.poolRevealed ? r.poolId : null })),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      seed: t.seed,
      status: t.status,
      captainId: t.captainId,
      players: t.roster.map(player),
      subs: t.subs.map(player),
    })),
    bracket: stored?.bracket ?? null,
    matches: matches.map(({ _id, notes: _notes, reschedules: _reschedules, ...m }) => ({
      ...m,
      id: _id.toHexString(),
    })),
    results,
  };
};

/**
 * @function cachedPublicPayload
 * @param lineage {Lineage} the lineage
 * @param edition {Edition} the edition
 * @returns {Promise<PublicPayload>} the payload, cached under the edition id's tag
 */
const cachedPublicPayload = (lineage: Lineage, edition: Edition): Promise<PublicPayload> =>
  unstable_cache(() => buildPayload(lineage, edition), ["public-edition", edition.id], {
    tags: [edition.id],
  })();

/**
 * @function isVisible
 * @param edition {Edition} the edition
 * @param lineage {Lineage} its lineage
 * @param viewerUserId {string | null} the signed-in account, or null
 * @returns {boolean} true when the viewer may read the public page
 */
export const isVisible = (
  edition: Pick<Edition, "siteMode" | "phase">,
  lineage: Lineage,
  viewerUserId: string | null,
): boolean => {
  if (viewerUserId && memberRole(lineage, viewerUserId)) return true;
  if (edition.siteMode === "live") return true;
  if (edition.siteMode === "hidden") return false;
  return edition.phase !== "setup";
};

/**
 * @function publicEdition
 * @param lineageSlug {string} the lineage in the URL
 * @param editionSlug {string} the edition in the URL
 * @param viewerUserId {string | null} the signed-in account, or null
 * @returns {Promise<PublicView>} the payload; `{ hidden: true }` when the viewer may not see it;
 *          null for an unknown lineage or edition
 */
export const publicEdition = async (
  lineageSlug: string,
  editionSlug: string,
  viewerUserId: string | null,
): Promise<PublicView> => {
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found) return null;
  if (!isVisible(found.edition, found.lineage, viewerUserId)) return { hidden: true };
  return cachedPublicPayload(found.lineage, found.edition);
};

/**
 * @function listPublicEditions
 * @param limit {number} how many, newest first
 * @returns {Promise<LlmsEdition[]>} editions anyone may see (live, or auto past setup), not
 *          archived, with their lineage
 */
export const listPublicEditions = async (limit: number): Promise<LlmsEdition[]> => {
  await connectDb();
  const db = collections(getDb());
  const editions = await db.editions
    .find({
      archived: { $ne: true },
      $or: [{ siteMode: "live" }, { siteMode: "auto", phase: { $ne: "setup" } }],
    })
    .sort({ year: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const lineages = new Map(
    (await db.lineages.find({}, { projection: { slug: 1, name: 1 } }).toArray()).map((l) => [
      l._id.toHexString(),
      l,
    ]),
  );
  return editions.flatMap((e) => {
    const lineage = lineages.get(e.lineageId);
    return lineage
      ? [
          {
            name: e.name,
            slug: e.slug,
            phase: e.phase,
            mode: e.mode,
            lineageSlug: lineage.slug,
            lineageName: lineage.name,
          },
        ]
      : [];
  });
};
