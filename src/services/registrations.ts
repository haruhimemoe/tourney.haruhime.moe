/**
 * @file src/services/registrations.ts
 * @desc Player registrations. A submit runs its checks in order: window and cap (the library's
 *       canRegister; a full edition waitlists instead of refusing), answers, the osu! snapshot
 *       and eligibility, then team rules (checkTeam, a free team name, no listed player on
 *       another live team). Players edit answers or withdraw while registration is open. Hosts
 *       review up to 200 at once: every move is checked before anything is written, and
 *       approving makes the team. Withdrawing an approved registration takes the team down too.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import {
  canRegister,
  checkTeam,
  isRegistrationOpen,
  type RegistrationStatus,
  reviewRegistration,
  teamNameKey,
} from "@haruhimemoe/tourney";
import { ObjectId } from "mongodb";
import {
  ELIGIBILITY_TEXT,
  MAX_REVIEW_BATCH,
  REGISTRATIONS_PAGE_SIZE,
} from "@/constants/registration";
import { collections, type Doc, fromId, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { Edition } from "@/schemas/edition";
import type { StoredRegistration } from "@/schemas/registration";
import type { SessionUser } from "@/schemas/session-user";
import { copyDefaultInto } from "@/services/availability";
import { isDuplicateKey } from "@/services/lineages";
import { takeSnapshot } from "@/services/osu-snapshot";
import { createTeamFor, listTeams, withdrawFromTeam, withdrawTeam } from "@/services/teams";
import { checkAnswers } from "@/utils/answers";
import { checkEligibility, type EligibilityReason } from "@/utils/eligibility";
import { type AppError, fail, ok } from "@/utils/result";

/** What a player submits: answers by question id, and for team editions the team. */
export type RegisterInput = {
  answers: Record<string, unknown>;
  team?: { name: string; tag: string | null; members: number[] } | null;
};

/** A refusal with what the form needs to show it: the row already there, field errors, reasons. */
export type RegistrationError = AppError & {
  existing?: StoredRegistration;
  errors?: Record<string, string>;
  reasons?: EligibilityReason[];
};

/** A registration result. */
export type RegistrationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RegistrationError };

const LIVE: RegistrationStatus[] = ["pending", "approved"];

const rows = async () => {
  await connectDb();
  return collections(getDb()).registrations;
};

const findOwn = async (userId: string, editionId: string) =>
  (await rows()).findOne({ editionId, userId, kind: "player" });

/** Takes an approved registration's team down: a captain's whole team, a solo player's own. */
const dropTeam = async (edition: Edition, reg: Pick<StoredRegistration, "osuId">) =>
  edition.sides.kind === "team"
    ? withdrawTeam(edition.id, reg.osuId)
    : withdrawFromTeam(edition.id, reg.osuId);

/** Team rules for a captain's submit: checkTeam, a free name, nobody already on a live team. */
const checkTeamInput = async (
  edition: Edition,
  user: SessionUser,
  team: NonNullable<RegisterInput["team"]>,
): Promise<RegistrationResult<NonNullable<StoredRegistration["team"]>>> => {
  const name = team.name.trim().replace(/\s+/g, " ");
  const tag = team.tag?.trim() || null;
  const members = [...new Set(team.members)].filter((id) => id !== user.osuId);
  if (!name || name.length > 32 || (tag && tag.length > 8)) {
    return fail("bad-input", "A team needs a name of 1 to 32 characters and a tag of 8 or fewer.");
  }
  const { rosterMax, subsMax } = edition.sides;
  const players = [user.osuId, ...members];
  const checked = checkTeam(
    {
      id: "new",
      name,
      tag,
      captainId: user.osuId,
      roster: players.slice(0, rosterMax),
      subs: players.slice(rosterMax),
      seed: null,
    },
    edition.sides,
  );
  if (!checked.ok) return fail(checked.error.code, checked.error.message);
  if (players.length > rosterMax + subsMax)
    return fail("bad-side", "That's more players than a team can list.");

  const key = teamNameKey(name);
  const others = await (await rows())
    .find({
      editionId: edition.id,
      kind: "player",
      status: { $in: LIVE },
      userId: { $ne: user.id },
    })
    .toArray();
  const teams = (await listTeams(edition.id)).filter((t) => t.status === "active");
  if (
    [...others.map((r) => r.team?.name ?? ""), ...teams.map((t) => t.name)].some(
      (n) => teamNameKey(n) === key,
    )
  ) {
    return fail("team-name-taken");
  }
  for (const id of players) {
    const taken =
      others.some((r) => r.osuId === id || r.team?.members.includes(id)) ||
      teams.some((t) => t.roster.includes(id) || t.subs.includes(id));
    if (taken)
      return fail(
        "player-on-team",
        `osu! player ${id} is already on another team in this edition.`,
      );
  }
  return ok({ name, tag, members });
};

/**
 * @function register
 * @param user {SessionUser} the player (a captain, in team editions)
 * @param edition {Edition} the edition
 * @param input {RegisterInput} answers, and the team for team editions
 * @param now {Date} the current time
 * @param beforeCall {() => Promise<boolean>} the osu! budget's gate, when the route has one
 * @returns {Promise<RegistrationResult<StoredRegistration>>} the registration (pending, or
 *          waitlisted past the cap), or why not: already-registered (with `existing`), closed,
 *          bad-input (with field `errors`), osu-user-unavailable, osu-unavailable, ineligible
 *          (with `reasons`), team-name-taken, player-on-team, bad-side
 */
export const register = async (
  user: SessionUser,
  edition: Edition,
  input: RegisterInput,
  now = new Date(),
  beforeCall?: () => Promise<boolean>,
): Promise<RegistrationResult<StoredRegistration>> => {
  const col = await rows();
  const already = await findOwn(user.id, edition.id);
  if (already && already.status !== "withdrawn") {
    return { ok: false, error: { ...fail("already-registered").error, existing: toId(already) } };
  }

  const players = await col.countDocuments({
    editionId: edition.id,
    kind: "player",
    status: { $in: LIVE },
  });
  const open = canRegister(edition, "player", { players, staff: 0 }, now);
  if (!open.ok && open.error.code !== "limit") return fail(open.error.code, open.error.message);
  const status: RegistrationStatus = open.ok ? "pending" : "waitlisted";

  const answers = checkAnswers(edition.questions, input.answers);
  if (!answers.ok)
    return { ok: false, error: { ...fail("bad-input").error, errors: answers.errors } };

  const snapshot = await takeSnapshot(user.osuId, edition.mode, now, beforeCall);
  if (!snapshot.ok) return snapshot;
  const eligible = checkEligibility(edition.eligibility, snapshot.value);
  if (!eligible.ok) {
    const message = eligible.reasons.map((r) => ELIGIBILITY_TEXT[r]).join(" ");
    return {
      ok: false,
      error: { ...fail("ineligible", message).error, reasons: eligible.reasons },
    };
  }

  let team: StoredRegistration["team"] = null;
  if (edition.sides.kind === "team") {
    if (!input.team) return fail("bad-input", "Team editions need a team name and its players.");
    const checked = await checkTeamInput(edition, user, input.team);
    if (!checked.ok) return checked;
    team = checked.value;
  }

  const fields = {
    editionId: edition.id,
    userId: user.id,
    osuId: user.osuId,
    kind: "player" as const,
    status,
    appliedRoles: [],
    approvedRoles: [],
    availability: null,
    answers: answers.answers,
    snapshot: {
      rank: snapshot.value.rank,
      country: snapshot.value.country,
      username: snapshot.value.username,
      takenAt: snapshot.value.takenAt,
    },
    team,
    reviewNote: null,
    createdAt: now.toISOString(),
  };
  let doc: Doc<StoredRegistration>;
  if (already) {
    doc = { _id: already._id, ...fields };
    await col.replaceOne({ _id: already._id, status: "withdrawn" }, doc);
  } else {
    doc = { _id: new ObjectId(), ...fields };
    try {
      await col.insertOne(doc);
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const existing = await findOwn(user.id, edition.id);
      return {
        ok: false,
        error: {
          ...fail("already-registered").error,
          ...(existing ? { existing: toId(existing) } : {}),
        },
      };
    }
  }
  await copyDefaultInto(user.id, edition.id);
  return ok(toId(doc));
};

/**
 * @function getOwnRegistration
 * @param userId {string} the player
 * @param editionId {string} the edition
 * @returns {Promise<StoredRegistration | null>} their player registration, or null
 */
export const getOwnRegistration = async (
  userId: string,
  editionId: string,
): Promise<StoredRegistration | null> => {
  const doc = await findOwn(userId, editionId);
  return doc ? toId(doc) : null;
};

/**
 * @function updateAnswers
 * @param userId {string} the player
 * @param edition {Edition} the edition
 * @param raw {Record<string, unknown>} their new answers
 * @param now {Date} the current time
 * @returns {Promise<RegistrationResult<StoredRegistration>>} the registration, or closed,
 *          not-found, bad-state (withdrawn or rejected), bad-input (with field `errors`)
 */
export const updateAnswers = async (
  userId: string,
  edition: Edition,
  raw: Record<string, unknown>,
  now = new Date(),
): Promise<RegistrationResult<StoredRegistration>> => {
  if (!isRegistrationOpen(edition, now)) return fail("closed");
  const doc = await findOwn(userId, edition.id);
  if (!doc) return fail("not-found");
  if (doc.status === "withdrawn" || doc.status === "rejected") return fail("bad-state");
  const answers = checkAnswers(edition.questions, raw);
  if (!answers.ok)
    return { ok: false, error: { ...fail("bad-input").error, errors: answers.errors } };
  await (await rows()).updateOne({ _id: doc._id }, { $set: { answers: answers.answers } });
  return ok({ ...toId(doc), answers: answers.answers });
};

/**
 * @function withdraw
 * @param userId {string} the player
 * @param edition {Edition} the edition
 * @param now {Date} the current time
 * @returns {Promise<RegistrationResult<StoredRegistration>>} the withdrawn registration, or
 *          closed, not-found, bad-state
 */
export const withdraw = async (
  userId: string,
  edition: Edition,
  now = new Date(),
): Promise<RegistrationResult<StoredRegistration>> => {
  if (!isRegistrationOpen(edition, now)) return fail("closed");
  const doc = await findOwn(userId, edition.id);
  if (!doc) return fail("not-found");
  const moved = reviewRegistration(toId(doc), "withdrawn");
  if (!moved.ok) return fail(moved.error.code, moved.error.message);
  await (await rows()).updateOne({ _id: doc._id }, { $set: { status: "withdrawn" } });
  if (doc.status === "approved") await dropTeam(edition, doc);
  return ok(moved.value);
};

/**
 * @function review
 * @param edition {Edition} the edition
 * @param ids {readonly string[]} registration ids, at most 200
 * @param to {RegistrationStatus} the new status
 * @param note {string | null} a note for the rows, when the host wrote one
 * @returns {Promise<RegistrationResult<{ changed: number }>>} how many changed, or limit,
 *          not-found, or the library's bad-state for the first illegal move (nothing written)
 */
export const review = async (
  edition: Edition,
  ids: readonly string[],
  to: RegistrationStatus,
  note: string | null = null,
): Promise<RegistrationResult<{ changed: number }>> => {
  if (ids.length > MAX_REVIEW_BATCH)
    return fail("limit", `Review at most ${MAX_REVIEW_BATCH} at once.`);
  const objectIds = [...new Set(ids)].map(fromId);
  if (objectIds.some((id) => !id)) return fail("not-found");
  const col = await rows();
  const docs = await col
    .find({ editionId: edition.id, _id: { $in: objectIds as ObjectId[] } })
    .toArray();
  if (docs.length !== objectIds.length) return fail("not-found");

  const moved: StoredRegistration[] = [];
  for (const doc of docs) {
    const next = reviewRegistration(toId(doc), to);
    if (!next.ok) {
      const who = doc.snapshot.username;
      return fail(next.error.code, `${who}: ${next.error.message}`);
    }
    moved.push(next.value);
  }

  const set = note === null ? { status: to } : { status: to, reviewNote: note };
  await col.bulkWrite(
    moved.map((r) => ({
      updateOne: { filter: { _id: fromId(r.id) as ObjectId }, update: { $set: set } },
    })),
  );
  for (const [i, doc] of docs.entries()) {
    const reg = moved[i] as StoredRegistration;
    if (to === "approved" && doc.status !== "approved") await createTeamFor(edition, reg);
    if (doc.status === "approved" && to !== "approved") await dropTeam(edition, doc);
  }
  return ok({ changed: moved.length });
};

/** Which registrations the review table shows. */
export type RegistrationFilter = { status?: RegistrationStatus; q?: string };

/**
 * @function listRegistrations
 * @param editionId {string} the edition
 * @param filter {RegistrationFilter} a status, and text matched against username, team name or osu! id
 * @param page {number} 1-based page of 50
 * @returns {Promise<{ rows: StoredRegistration[]; total: number }>} the page, oldest first, and the match count
 */
export const listRegistrations = async (
  editionId: string,
  filter: RegistrationFilter = {},
  page = 1,
): Promise<{ rows: StoredRegistration[]; total: number }> => {
  const query: Record<string, unknown> = { editionId, kind: "player" };
  if (filter.status) query.status = filter.status;
  const q = filter.q?.trim();
  if (q) {
    const pattern = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [
      { "snapshot.username": pattern },
      { "team.name": pattern },
      ...(/^\d+$/.test(q) ? [{ osuId: Number(q) }] : []),
    ];
  }
  const col = await rows();
  const skip = (Math.max(1, Math.floor(page)) - 1) * REGISTRATIONS_PAGE_SIZE;
  const [docs, total] = await Promise.all([
    col
      .find(query)
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(REGISTRATIONS_PAGE_SIZE)
      .toArray(),
    col.countDocuments(query),
  ]);
  return { rows: docs.map(toId), total };
};
