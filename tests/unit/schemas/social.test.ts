/**
 * @file tests/unit/schemas/social.test.ts
 * @desc Social links: hosts match their kind, scheme must be https, custom needs a label, and
 *       the list is capped at MAX_SOCIALS.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { SocialSchema, SocialsSchema } from "@/schemas/social";

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
});
