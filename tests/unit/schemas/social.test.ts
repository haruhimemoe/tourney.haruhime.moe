/**
 * @file tests/unit/schemas/social.test.ts
 * @desc Social links: hosts match their kind, scheme must be https, custom needs a label and
 *       every other kind refuses one, and the list is capped at MAX_SOCIALS. Also Contact:
 *       email length, and discord trims and can't be blank.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { ContactSchema, SocialSchema, SocialsSchema } from "@/schemas/social";

const ok = (kind: string, url: string) =>
  SocialSchema.safeParse({ kind, url, label: null }).success;

describe("SocialSchema", () => {
  it("accepts matching hosts", () => {
    expect(ok("discord", "https://discord.gg/abc")).toBe(true);
    expect(ok("forum", "https://osu.ppy.sh/community/forums/topics/123")).toBe(true);
    expect(ok("twitch", "https://www.twitch.tv/egc")).toBe(true);
    expect(ok("website", "https://evergreencup.org")).toBe(true);
  });
  it("refuses wrong hosts and schemes", () => {
    expect(ok("discord", "https://example.com/abc")).toBe(false);
    expect(ok("website", "javascript:alert(1)")).toBe(false);
    expect(ok("website", "http://insecure.example")).toBe(false);
  });
  it("requires a label for custom and caps the list", () => {
    expect(ok("custom", "https://x.example")).toBe(false);
    expect(
      SocialSchema.safeParse({ kind: "custom", url: "https://x.example", label: "Merch" }).success,
    ).toBe(true);
    const many = Array.from({ length: 13 }, () => ({
      kind: "website",
      url: "https://a.example",
      label: null,
    }));
    expect(SocialsSchema.safeParse(many).success).toBe(false);
  });
  it("refuses a label on anything but custom", () => {
    const parsed = SocialSchema.safeParse({
      kind: "website",
      url: "https://a.example",
      label: "Extra",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["label"] })]),
      );
  });
});

describe("ContactSchema", () => {
  it("accepts a short email and discord handle, or both null", () => {
    expect(
      ContactSchema.safeParse({ email: "host@example.com", discord: "host#0001" }).success,
    ).toBe(true);
    expect(ContactSchema.safeParse({ email: null, discord: null }).success).toBe(true);
  });
  it("refuses an email over 254 characters", () => {
    const local = "a".repeat(250);
    const email = `${local}@example.com`;
    expect(email.length).toBeGreaterThan(254);
    expect(ContactSchema.safeParse({ email, discord: null }).success).toBe(false);
  });
  it("trims discord and refuses a blank or over-long one", () => {
    const parsed = ContactSchema.safeParse({ email: null, discord: "  host#0001  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.discord).toBe("host#0001");
    expect(ContactSchema.safeParse({ email: null, discord: "   " }).success).toBe(false);
    expect(ContactSchema.safeParse({ email: null, discord: "a".repeat(41) }).success).toBe(false);
  });
});
