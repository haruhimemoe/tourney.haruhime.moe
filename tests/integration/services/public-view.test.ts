/**
 * @file tests/integration/services/public-view.test.ts
 * @desc The public edition view: siteMode and phase decide who sees it (a hidden edition shows
 *       to members only, `auto` stays hidden in setup, `live` always shows), an unrevealed pool's
 *       id never reaches the payload, and registration answers, snapshots and host notes never do.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { moveEditionPhase, updateEdition } from "@/services/editions";
import { publicEdition } from "@/services/public-view";
import { syncRounds, updateRound } from "@/services/rounds";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";

setupTestDb();

const BRACKET = {
  format: "single" as const,
  size: 4,
  bestOf: { default: 7 },
  thirdPlace: false,
  grandFinalReset: false,
  seeding: "manual" as const,
  randomSeed: null,
};

const setup = async () => {
  const seeded = await seedLineage();
  const saved = await updateEdition(seeded.editionId, { bracket: BRACKET });
  if (!saved.ok) throw new Error(saved.error.message);
  await syncRounds(saved.value);
  return seeded;
};

describe("publicEdition", () => {
  it("is hidden in setup under auto, and shows from registration on", async () => {
    const { lineage, editionId } = await setup();
    expect(await publicEdition(lineage.slug, "egc2026", null)).toEqual({ hidden: true });
    await moveEditionPhase(editionId, "registration");
    const view = await publicEdition(lineage.slug, "egc2026", null);
    expect(view && "edition" in view ? view.edition.id : null).toBe(editionId);
  });

  it("shows a hidden edition to members only", async () => {
    const { lineage, owner, editionId } = await setup();
    await moveEditionPhase(editionId, "registration");
    await updateEdition(editionId, { siteMode: "hidden" });
    expect(await publicEdition(lineage.slug, "egc2026", null)).toEqual({ hidden: true });
    expect(await publicEdition(lineage.slug, "egc2026", "0".repeat(24))).toEqual({ hidden: true });
    const view = await publicEdition(lineage.slug, "egc2026", owner.id);
    expect(view && "edition" in view ? view.edition.siteMode : null).toBe("hidden");
  });

  it("shows a live edition even in setup", async () => {
    const { lineage, editionId } = await setup();
    await updateEdition(editionId, { siteMode: "live" });
    expect(await publicEdition(lineage.slug, "egc2026", null)).toHaveProperty("edition");
  });

  it("leaves an unrevealed pool's id out, and shows it once revealed", async () => {
    const { lineage, editionId } = await setup();
    await updateEdition(editionId, { siteMode: "live" });
    await updateRound(editionId, "F", { poolId: "secret-pool-123" });
    expect(JSON.stringify(await publicEdition(lineage.slug, "egc2026", null))).not.toContain(
      "secret-pool-123",
    );
    await updateRound(editionId, "F", { poolRevealed: true });
    const view = await publicEdition(lineage.slug, "egc2026", null);
    const final = view && "rounds" in view ? view.rounds.find((r) => r.code === "F") : null;
    expect(final?.poolId).toBe("secret-pool-123");
  });

  it("never carries answers, snapshots, questions or host notes", async () => {
    const { lineage, editionId } = await setup();
    await updateEdition(editionId, { siteMode: "live" });
    const [team] = await seedTeams(editionId, 2);
    await collections(getDb()).registrations.insertOne({
      editionId,
      userId: null,
      osuId: team?.captainId ?? 0,
      status: "approved",
      answers: { discord: "secret-answer" },
      snapshot: {
        rank: 4242,
        country: "JP",
        username: "Captain",
        takenAt: new Date().toISOString(),
      },
      team: null,
      reviewNote: "secret-note",
      createdAt: new Date().toISOString(),
    } as never);
    const text = JSON.stringify(await publicEdition(lineage.slug, "egc2026", null));
    for (const secret of ["secret-answer", "secret-note", "4242", "questions"])
      expect(text).not.toContain(secret);
    expect(text).toContain("Captain");
  });

  it("is null for an unknown edition", async () => {
    const { lineage } = await setup();
    expect(await publicEdition(lineage.slug, "nope", null)).toBeNull();
    expect(await publicEdition("nope", "egc2026", null)).toBeNull();
  });
});
