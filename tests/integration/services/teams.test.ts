/**
 * @file tests/integration/services/teams.test.ts
 * @desc Teams from approved registrations: solo and team mapping, renames, seeds, and a player
 *       leaving a team.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { getEditionById } from "@/services/editions";
import {
  createTeamFor,
  listTeams,
  setSeeds,
  teamFromRegistration,
  updateTeam,
  withdrawFromTeam,
} from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";
import { makeEdition, makeRegistration } from "../../helpers/records";

setupTestDb();

const teamReg = (osuId: number, name: string, members: number[]) =>
  makeRegistration({ osuId, team: { name, tag: null, members } });

const seededTeamEdition = async () => {
  const { editionId } = await seedLineage();
  const edition = await getEditionById(editionId);
  if (!edition) throw new Error("no edition");
  return edition;
};

describe("teamFromRegistration", () => {
  it("names a solo team after the player, made unique", () => {
    const team = teamFromRegistration(makeEdition(), makeRegistration(), ["ranked"]);
    expect(team).toMatchObject({
      name: "ranked 2",
      tag: null,
      captainId: 1001,
      roster: [1001],
      subs: [],
      seed: null,
      status: "active",
    });
  });
  it("puts the captain first and extra members on subs", () => {
    const edition = makeEdition({
      sides: { kind: "team", lineup: 2, rosterMin: 2, rosterMax: 3, subsMax: 1 },
    });
    const team = teamFromRegistration(edition, teamReg(1, "Pine", [2, 3, 4, 5]), []);
    expect(team).toMatchObject({ name: "Pine", captainId: 1, roster: [1, 2, 3], subs: [4] });
  });
});

describe("team writes", () => {
  it("lists created teams and refuses a rename to a taken name", async () => {
    const edition = await seededTeamEdition();
    const a = await createTeamFor(edition, teamReg(1, "Pine Trees", [2]));
    await createTeamFor(edition, teamReg(3, "Oaks", [4]));
    expect((await listTeams(edition.id)).map((t) => t.name)).toEqual(["Pine Trees", "Oaks"]);
    expect(await updateTeam(edition, a.id, { name: "  oaks " })).toMatchObject({
      ok: false,
      error: { code: "team-name-taken" },
    });
    expect(await updateTeam(edition, a.id, { name: "Pines" })).toMatchObject({
      ok: true,
      value: { name: "Pines" },
    });
    expect(await updateTeam(edition, a.id, { roster: [1] })).toMatchObject({
      ok: false,
      error: { code: "bad-side" },
    });
  });

  it("sets seeds 1..n and refuses a duplicate", async () => {
    const edition = await seededTeamEdition();
    const a = await createTeamFor(edition, teamReg(1, "A", [2]));
    const b = await createTeamFor(edition, teamReg(3, "B", [4]));
    expect(
      await setSeeds(edition.id, [
        { teamId: a.id, seed: 1 },
        { teamId: b.id, seed: 1 },
      ]),
    ).toMatchObject({ ok: false, error: { code: "bad-input" } });
    expect(
      await setSeeds(edition.id, [
        { teamId: a.id, seed: 2 },
        { teamId: b.id, seed: 1 },
      ]),
    ).toEqual({ ok: true, value: { changed: 2 } });
    expect((await listTeams(edition.id)).map((t) => t.seed)).toEqual([2, 1]);
  });

  it("drops a leaving member, and withdraws a team below its minimum", async () => {
    const edition = await seededTeamEdition();
    const team = await createTeamFor(edition, teamReg(1, "A", [2, 3]));
    await withdrawFromTeam(edition.id, 1);
    let stored = await collections(getDb()).teams.findOne({});
    expect(stored).toMatchObject({ captainId: 2, roster: [2, 3], status: "active" });
    await withdrawFromTeam(edition.id, 3);
    stored = await collections(getDb()).teams.findOne({});
    expect(stored).toMatchObject({ roster: [2], status: "withdrawn" });
    expect(team.id).toBeTruthy();
  });
});
