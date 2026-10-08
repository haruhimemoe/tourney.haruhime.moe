/**
 * @file tests/integration/lib/db-indexes.test.ts
 * @desc connectDb builds tourney's indexes (unique lineage slugs, edition slugs unique per
 *       lineage, one registration per account and kind except anonymized rows), and fromId
 *       refuses a bad id.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { fromId, toId } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { setupTestDb } from "../../helpers/db";

setupTestDb();

describe("indexes", () => {
  it("makes lineage slugs unique", async () => {
    const indexes = await getDb().collection("lineages").indexes();
    expect(indexes.find((i) => i.key.slug === 1)?.unique).toBe(true);
  });

  it("makes edition slugs unique per lineage", async () => {
    const indexes = await getDb().collection("editions").indexes();
    expect(indexes.find((i) => i.key.lineageId === 1 && i.key.slug === 1)?.unique).toBe(true);
  });

  it("allows many anonymized registrations in one edition", async () => {
    const registrations = getDb().collection("registrations");
    const row = { editionId: "e1", userId: null, kind: "player" };
    await registrations.insertMany([{ ...row }, { ...row }]);
    await registrations.insertOne({ ...row, userId: "u1" });
    await expect(registrations.insertOne({ ...row, userId: "u1" })).rejects.toThrow(/E11000/);
  });
});

describe("ids", () => {
  it("refuses a bad id", () => {
    expect(fromId("zzz")).toBeNull();
    expect(fromId("0123456789abcdef0123456")).toBeNull();
  });

  it("maps _id to id and back", () => {
    const hex = "0123456789abcdef01234567";
    const id = fromId(hex);
    expect(id?.toHexString()).toBe(hex);
    expect(id && toId({ _id: id, name: "x" })).toEqual({ id: hex, name: "x" });
  });
});
