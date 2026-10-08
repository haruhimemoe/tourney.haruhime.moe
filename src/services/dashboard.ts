/**
 * @file src/services/dashboard.ts
 * @desc The signed-in home page and /browse. Playing: every edition the account registered
 *       for, with its registration, team, the soonest future match and that round's pool once
 *       revealed. Hosting: the lineages the account runs, each edition with what needs a host
 *       (pending registrations, matches without a time, results overdue). openRegistrations:
 *       editions taking registrations now, hidden ones left out.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { isRegistrationOpen } from "@haruhimemoe/tourney";
import { getPoolsUrl } from "@/env";
import { collections, fromId, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { Edition } from "@/schemas/edition";
import type { Lineage } from "@/schemas/lineage";
import type { StoredRegistration } from "@/schemas/registration";

/** Where an edition lives and what to call it. */
export type EditionRef = Pick<Edition, "id" | "slug" | "name" | "phase" | "mode"> & {
  lineageSlug: string;
};

/** The account's next match in an edition. */
export type NextMatch = { code: string; round: string; at: string; opponent: string | null };

/** One edition the account plays in. */
export type PlayingEntry = {
  edition: EditionRef;
  registration: Pick<StoredRegistration, "id" | "status" | "osuId">;
  team: { id: string; name: string } | null;
  nextMatch: NextMatch | null;
  poolUrl: string | null;
};

/** What needs a host in one edition. */
export type HostTodo = {
  pendingRegistrations: number;
  untimedMatches: number;
  missingResults: number;
};

/** One lineage the account runs. */
export type HostingEntry = {
  lineage: Pick<Lineage, "id" | "slug" | "name">;
  editions: { edition: EditionRef; todo: HostTodo }[];
};

const OPEN_MATCH = { $in: ["scheduled" as const, "live" as const] };

const ref = (e: Edition, lineageSlug: string): EditionRef => ({
  id: e.id,
  slug: e.slug,
  name: e.name,
  phase: e.phase,
  mode: e.mode,
  lineageSlug,
});

/**
 * @function playingFor
 * @param userId {string} the account
 * @param now {Date} the current time
 * @returns {Promise<PlayingEntry[]>} its editions, soonest next match first
 */
const playingFor = async (userId: string, now: Date): Promise<PlayingEntry[]> => {
  const db = collections(getDb());
  const regs = (await db.registrations.find({ userId }).toArray()).map(toId);
  const entries = await Promise.all(
    regs.map(async (reg): Promise<PlayingEntry | null> => {
      const _id = fromId(reg.editionId);
      const edition = _id ? await db.editions.findOne({ _id, archived: { $ne: true } }) : null;
      if (!edition) return null;
      const lineageId = fromId(edition.lineageId);
      const lineage = lineageId ? await db.lineages.findOne({ _id: lineageId }) : null;
      if (!lineage) return null;
      const teamDoc = await db.teams.findOne({
        editionId: reg.editionId,
        status: { $ne: "withdrawn" },
        $or: [{ roster: reg.osuId }, { subs: reg.osuId }],
      });
      const team = teamDoc ? { id: teamDoc._id.toHexString(), name: teamDoc.name } : null;
      const next = team
        ? await db.matches.findOne(
            {
              editionId: reg.editionId,
              status: OPEN_MATCH,
              scheduledAt: { $gte: now.toISOString() },
              $or: [{ a: team.id }, { b: team.id }],
            },
            { sort: { scheduledAt: 1 } },
          )
        : null;
      let nextMatch: NextMatch | null = null;
      let poolUrl: string | null = null;
      if (next?.scheduledAt) {
        const otherId = next.a === team?.id ? next.b : next.a;
        const other = otherId ? fromId(otherId) : null;
        const opponent = other ? ((await db.teams.findOne({ _id: other }))?.name ?? null) : null;
        nextMatch = {
          code: next.bracketCode ?? "",
          round: next.round,
          at: next.scheduledAt,
          opponent,
        };
        const round = await db.rounds.findOne({ editionId: reg.editionId, code: next.round });
        if (round?.poolRevealed && round.poolId)
          poolUrl = `${getPoolsUrl()}/pools/${encodeURIComponent(round.poolId)}`;
      }
      return {
        edition: ref(toId(edition), lineage.slug),
        registration: { id: reg.id, status: reg.status, osuId: reg.osuId },
        team,
        nextMatch,
        poolUrl,
      };
    }),
  );
  return entries
    .filter((e): e is PlayingEntry => e !== null)
    .sort(
      (x, y) =>
        (x.nextMatch ? Date.parse(x.nextMatch.at) : Number.POSITIVE_INFINITY) -
          (y.nextMatch ? Date.parse(y.nextMatch.at) : Number.POSITIVE_INFINITY) ||
        x.edition.name.localeCompare(y.edition.name),
    );
};

/**
 * @function hostingFor
 * @param userId {string} the account
 * @param now {Date} the current time
 * @returns {Promise<HostingEntry[]>} the lineages it runs with each edition's to-do counts
 */
const hostingFor = async (userId: string, now: Date): Promise<HostingEntry[]> => {
  const db = collections(getDb());
  const lineages = (
    await db.lineages.find({ "members.userId": userId }).sort({ name: 1 }).toArray()
  ).map(toId);
  return Promise.all(
    lineages.map(async (lineage) => {
      const editions = (
        await db.editions
          .find({ lineageId: lineage.id, archived: { $ne: true } })
          .sort({ year: -1 })
          .toArray()
      ).map(toId);
      return {
        lineage: { id: lineage.id, slug: lineage.slug, name: lineage.name },
        editions: await Promise.all(
          editions.map(async (e) => ({
            edition: ref(e, lineage.slug),
            todo: {
              pendingRegistrations: await db.registrations.countDocuments({
                editionId: e.id,
                status: "pending",
              }),
              untimedMatches: await db.matches.countDocuments({
                editionId: e.id,
                status: OPEN_MATCH,
                scheduledAt: null,
              }),
              missingResults: await db.matches.countDocuments({
                editionId: e.id,
                status: OPEN_MATCH,
                scheduledAt: { $ne: null, $lt: now.toISOString() },
              }),
            },
          })),
        ),
      };
    }),
  );
};

/**
 * @function dashboardFor
 * @param userId {string} the signed-in account
 * @param now {Date} the current time
 * @returns {Promise<{ playing: PlayingEntry[]; hosting: HostingEntry[] }>} both tabs' content
 */
export const dashboardFor = async (
  userId: string,
  now: Date,
): Promise<{ playing: PlayingEntry[]; hosting: HostingEntry[] }> => {
  await connectDb();
  const [playing, hosting] = await Promise.all([playingFor(userId, now), hostingFor(userId, now)]);
  return { playing, hosting };
};

/** How many editions a /browse page lists. */
export const BROWSE_PAGE_SIZE = 20;

/** One edition on /browse. */
export type BrowseItem = {
  edition: EditionRef & Pick<Edition, "sides" | "eligibility" | "registration" | "dates">;
  lineage: Pick<Lineage, "slug" | "name">;
};

/**
 * @function openRegistrations
 * @param now {Date} the current time
 * @param page {number} the page, from 1
 * @returns {Promise<{ items: BrowseItem[]; pages: number }>} editions open for registration
 *          now (not hidden), closing soonest first, and how many pages there are
 */
export const openRegistrations = async (
  now: Date,
  page: number,
): Promise<{ items: BrowseItem[]; pages: number }> => {
  await connectDb();
  const db = collections(getDb());
  const open = (
    await db.editions
      .find({ phase: "registration", siteMode: { $ne: "hidden" }, archived: { $ne: true } })
      .toArray()
  )
    .map(toId)
    .filter((e) => isRegistrationOpen(e, now))
    .sort(
      (x, y) =>
        (x.registration.closesAt ? Date.parse(x.registration.closesAt) : Number.POSITIVE_INFINITY) -
        (y.registration.closesAt ? Date.parse(y.registration.closesAt) : Number.POSITIVE_INFINITY),
    );
  const pages = Math.max(1, Math.ceil(open.length / BROWSE_PAGE_SIZE));
  const slice = open.slice((page - 1) * BROWSE_PAGE_SIZE, page * BROWSE_PAGE_SIZE);
  const lineageIds = [...new Set(slice.map((e) => e.lineageId))].flatMap((id) => fromId(id) ?? []);
  const lineages = new Map(
    (await db.lineages.find({ _id: { $in: lineageIds } }).toArray()).map((l) => [
      l._id.toHexString(),
      l,
    ]),
  );
  const items = slice.flatMap((e): BrowseItem[] => {
    const lineage = lineages.get(e.lineageId);
    if (!lineage) return [];
    return [
      {
        edition: {
          ...ref(e, lineage.slug),
          sides: e.sides,
          eligibility: e.eligibility,
          registration: e.registration,
          dates: e.dates,
        },
        lineage: { slug: lineage.slug, name: lineage.name },
      },
    ];
  });
  return { items, pages };
};
