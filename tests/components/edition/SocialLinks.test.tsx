/**
 * @file tests/components/edition/SocialLinks.test.tsx
 * @desc The public socials list: one link per social with an accessible name (the kind's label,
 *       or a custom link's own label), and nothing at all when there are none.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SocialLinks } from "@/components/edition/SocialLinks";

describe("SocialLinks", () => {
  it("renders one link per social with an accessible name", () => {
    render(
      <SocialLinks
        socials={[
          { kind: "discord", url: "https://discord.gg/abc", label: null },
          { kind: "custom", url: "https://example.com", label: "Fan page" },
        ]}
      />,
    );
    const discord = screen.getByRole("link", { name: "Discord" });
    expect(discord).toHaveAttribute("href", "https://discord.gg/abc");
    expect(discord).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Fan page" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("renders nothing when there are no socials", () => {
    const { container } = render(<SocialLinks socials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
