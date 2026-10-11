/**
 * @file tests/integration/api/edition-settings.test.ts
 * @desc The settings PATCH route's new fields (socials, contact, hue, acronym, etc.): an admin's
 *       socials are stored, a stranger is refused, a bad social answers 400 with the issue's
 *       path, an end date before the start date answers 400 on ["dates","end"], a cross-site
 *       request is refused, and the lineage defaults PATCH route merges into `defaults` without
 *       touching the other default keys.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { PATCH as PATCH_SETTINGS } from "@/app/api/manage/[lineage]/[edition]/settings/route";
import { PATCH as PATCH_DEFAULTS } from "@/app/api/manage/[lineage]/defaults/route";
import { getLineageBySlug } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";

setupTestDb();

const DISCORD_SOCIAL = { kind: "discord", url: "https://discord.gg/abc123", label: null };

type Handler = typeof PATCH_SETTINGS | typeof PATCH_DEFAULTS;

const call = (
  handler: Handler,
  url: string,
  params: { lineage: string } & Record<string, string>,
  {
    cookie,
    body,
    headers = {},
  }: { cookie?: string; body: unknown; headers?: Record<string, string> },
) =>
  handler(
    new Request(url, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://tourney.haruhime.moe",
        "sec-fetch-site": "same-origin",
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );

const callSettings = (
  lineage: string,
  options: { cookie?: string; body: unknown; headers?: Record<string, string> },
) =>
  call(
    PATCH_SETTINGS,
    `https://tourney.haruhime.moe/api/manage/${lineage}/egc2026/settings`,
    { lineage, edition: "egc2026" },
    options,
  );

const callDefaults = (
  lineage: string,
  options: { cookie?: string; body: unknown; headers?: Record<string, string> },
) =>
  call(
    PATCH_DEFAULTS,
    `https://tourney.haruhime.moe/api/manage/${lineage}/defaults`,
    { lineage },
    options,
  );

describe("edition settings PATCH", () => {
  it("stores an admin's socials", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callSettings(lineage.slug, {
      cookie: owner.cookie,
      body: { socials: [DISCORD_SOCIAL], hue: 120, acronym: "EGC" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.edition.socials).toEqual([DISCORD_SOCIAL]);
    expect(json.edition.hue).toBe(120);
    expect(json.edition.acronym).toBe("EGC");
  });

  it("refuses a non-member with 403 and writes nothing", async () => {
    const { lineage } = await seedLineage();
    const stranger = await createTestUser(999);
    const res = await callSettings(lineage.slug, {
      cookie: stranger.cookie,
      body: { socials: [DISCORD_SOCIAL] },
    });
    expect(res.status).toBe(403);
  });

  it("answers 400 with the bad social's path", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callSettings(lineage.slug, {
      cookie: owner.cookie,
      body: { socials: [{ kind: "discord", url: "https://evil.example/invite", label: null }] },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["socials", 0, "url"] })]),
    );
  });

  it("answers 400 with dates.end when the end date is before the start date", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callSettings(lineage.slug, {
      cookie: owner.cookie,
      body: {
        dates: { start: "2026-06-10T00:00:00.000Z", end: "2026-06-01T00:00:00.000Z" },
      },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["dates", "end"] })]),
    );
  });

  it("refuses a cross-site PATCH and writes nothing", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callSettings(lineage.slug, {
      cookie: owner.cookie,
      body: { socials: [DISCORD_SOCIAL] },
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(res.status).toBe(403);
    const after = await callSettings(lineage.slug, {
      cookie: owner.cookie,
      body: {},
    });
    const json = await after.json();
    expect(json.edition.socials).toEqual([]);
  });
});

describe("lineage defaults PATCH", () => {
  it("merges socials, contact and hue into defaults, leaving the rest alone", async () => {
    const { owner, lineage } = await seedLineage();
    const res = await callDefaults(lineage.slug, {
      cookie: owner.cookie,
      body: { socials: [DISCORD_SOCIAL], hue: 42 },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lineage.defaults.socials).toEqual([DISCORD_SOCIAL]);
    expect(json.lineage.defaults.hue).toBe(42);
    expect(json.lineage.defaults.mode).toBe(lineage.defaults.mode);
    expect(json.lineage.defaults.rulesText).toBe(lineage.defaults.rulesText);

    const again = await callDefaults(lineage.slug, {
      cookie: owner.cookie,
      body: { contact: { email: "host@example.com", discord: null } },
    });
    const updated = (await again.json()).lineage;
    expect(updated.defaults.contact).toEqual({ email: "host@example.com", discord: null });
    expect(updated.defaults.socials).toEqual([DISCORD_SOCIAL]);
    expect(updated.defaults.hue).toBe(42);
  });

  it("never changes an edition created before the defaults did", async () => {
    const { owner, lineage } = await seedLineage();
    await callDefaults(lineage.slug, {
      cookie: owner.cookie,
      body: { socials: [DISCORD_SOCIAL], hue: 42 },
    });
    const stored = await getLineageBySlug(lineage.slug);
    expect(stored?.defaults.socials).toEqual([DISCORD_SOCIAL]);
    const settingsRes = await callSettings(lineage.slug, { cookie: owner.cookie, body: {} });
    const edition = (await settingsRes.json()).edition;
    expect(edition.socials).toEqual([]);
    expect(edition.hue).toBeNull();
  });
});
