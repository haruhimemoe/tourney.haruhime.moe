/**
 * @file src/services/teams.ts
 * @desc Teams of an edition. Approving a registration makes its team: a solo player's is named
 *       after them (made unique), a captain's keeps the name they gave. Renames and roster edits
 *       re-run the library's checkTeam; a name another team has (compared by teamNameKey) is
 *       refused. A player leaving drops off their team, and a team below its minimum withdraws.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { checkTeam, teamNameKey, uniqueTeamName } from "@haruhimemoe/tourney";
import { ObjectId } from "mongodb";
import { collections, fromId, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { Edition } from "@/schemas/edition";
import type { StoredRegistration } from "@/schemas/registration";
import type { StoredTeam } from "@/schemas/team";
import { getEditionById } from "@/services/editions";
import { type AppResult, fail, ok } from "@/utils/result";

/** What a host may change on a team. */
export type TeamPatch = Partial<Pick<StoredTeam, "name" | "tag" | "captainId" | "roster" | "subs">>;

const teams = async () => {
  await connectDb();
  return collections(getDb()).teams;
};

/**
 * @function teamFromRegistration
 * @param edition {Edition} the edition (its side rules cap the roster and subs)
 * @param reg {StoredRegistration} an approved registration
 * @param takenNames {readonly string[]} names the edition's teams already use
 * @returns {Omit<StoredTeam, "id">} the new team: captain first on the roster, members past
 *          rosterMax on the subs (past subsMax left off)
 */
export const teamFromRegistration = (
  edition: Edition,
  reg: StoredRegistration,
  takenNames: readonly string[],
): Omit<StoredTeam, "id"> => {
  const base = {
    editionId: edition.id,
    captainId: reg.osuId,
    seed: null,
    status: "active" as const,
  };
  if (edition.sides.kind === "solo" || !reg.team) {
    return {
      ...base,
      name: uniqueTeamName(reg.snapshot.username, takenNames),
      tag: null,
      roster: [reg.osuId],
      subs: [],
    };
  }
  const players = [reg.osuId, ...reg.team.members.filter((id) => id !== reg.osuId)];
  const { rosterMax, subsMax } = edition.sides;
  return {
    ...base,
    name: reg.team.name,
    tag: reg.team.tag,
    roster: players.slice(0, rosterMax),
    subs: players.slice(rosterMax, rosterMax + subsMax),
  };
};

/**
 * @function listTeams
 * @param editionId {string} the edition
 * @returns {Promise<StoredTeam[]>} its teams, oldest first
 */
export const listTeams = async (editionId: string): Promise<StoredTeam[]> =>
  (await (await teams()).find({ editionId }).sort({ _id: 1 }).toArray()).map(toId);

/**
 * @function createTeamFor
 * @param edition {Edition} the edition
 * @param reg {StoredRegistration} the registration just approved
 * @returns {Promise<StoredTeam>} the stored team
 */
export const createTeamFor = async (
  edition: Edition,
  reg: StoredRegistration,
): Promise<StoredTeam> => {
  const taken = (await listTeams(edition.id)).map((t) => t.name);
  const team = { _id: new ObjectId(), ...teamFromRegistration(edition, reg, taken) };
  await (await teams()).insertOne(team);
  return toId(team);
};

/**
 * @function updateTeam
 * @param edition {Edition} the edition
 * @param teamId {string} the team
 * @param patch {TeamPatch} what changes
 * @returns {Promise<AppResult<StoredTeam>>} the team, or not-found, team-name-taken, or the
 *          library's bad-side from checkTeam
 */
export const updateTeam = async (
  edition: Edition,
  teamId: string,
  patch: TeamPatch,
): Promise<AppResult<StoredTeam>> => {
  const all = await listTeams(edition.id);
  const current = all.find((t) => t.id === teamId);
  if (!current) return fail("not-found");
  const next = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
  const key = teamNameKey(next.name);
  if (all.some((t) => t.id !== teamId && teamNameKey(t.name) === key))
    return fail("team-name-taken");
  const checked = checkTeam(next, edition.sides);
  if (!checked.ok) return fail(checked.error.code, checked.error.message);
  const { id: _, ...fields } = next;
  await (await teams()).updateOne({ _id: fromId(teamId) ?? undefined }, { $set: fields });
  return ok(next);
};

/**
 * @function setSeeds
 * @param editionId {string} the edition
 * @param seeds {{ teamId: string; seed: number }[]} each team's seed, 1 to n with no repeats
 * @returns {Promise<AppResult<{ changed: number }>>} how many teams changed, or bad-input
 */
export const setSeeds = async (
  editionId: string,
  seeds: { teamId: string; seed: number }[],
): Promise<AppResult<{ changed: number }>> => {
  const n = seeds.length;
  const unique = new Set(seeds.map((s) => s.seed));
  if (
    unique.size !== n ||
    seeds.some((s) => !Number.isInteger(s.seed) || s.seed < 1 || s.seed > n)
  ) {
    return fail("bad-input", "Seeds must run from 1 to the number of teams, each used once.");
  }
  const ids = seeds.map((s) => fromId(s.teamId));
  if (ids.some((id) => !id)) return fail("not-found");
  const col = await teams();
  if ((await col.countDocuments({ editionId, _id: { $in: ids as ObjectId[] } })) !== n)
    return fail("not-found");
  const result = await col.bulkWrite(
    seeds.map((s, i) => ({
      updateOne: { filter: { _id: ids[i] as ObjectId }, update: { $set: { seed: s.seed } } },
    })),
  );
  return ok({ changed: result.modifiedCount });
};

/**
 * @function withdrawFromTeam
 * @param editionId {string} the edition
 * @param osuId {number} the player leaving
 * @returns {Promise<void>} once they're off their team; a solo team, or a team left below
 *          rosterMin, is withdrawn; a leaving captain hands over to the next roster player
 */
export const withdrawFromTeam = async (editionId: string, osuId: number): Promise<void> => {
  const edition = await getEditionById(editionId);
  const col = await teams();
  const doc = await col.findOne({
    editionId,
    status: "active",
    $or: [{ roster: osuId }, { subs: osuId }],
  });
  if (!edition || !doc) return;
  const roster = doc.roster.filter((id) => id !== osuId);
  const subs = doc.subs.filter((id) => id !== osuId);
  const captainId = doc.captainId === osuId ? (roster[0] ?? doc.captainId) : doc.captainId;
  const below = edition.sides.kind === "solo" || roster.length < edition.sides.rosterMin;
  const status = below ? ("withdrawn" as const) : doc.status;
  await col.updateOne({ _id: doc._id }, { $set: { roster, subs, captainId, status } });
};

/**
 * @function withdrawTeam
 * @param editionId {string} the edition
 * @param captainId {number} the captain whose registration was withdrawn
 * @returns {Promise<void>} once their active team is withdrawn
 */
export const withdrawTeam = async (editionId: string, captainId: number): Promise<void> => {
  await (await teams()).updateOne(
    { editionId, captainId, status: "active" },
    { $set: { status: "withdrawn" } },
  );
};
