/**
 * @file tests/components/edition/StaffContact.test.tsx
 * @desc The public "contact staff" line: a Discord handle as plain text and/or a mailto link,
 *       only when at least one is set.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffContact } from "@/components/edition/StaffContact";

describe("StaffContact", () => {
  it("renders the discord handle and a mailto link when both are set", () => {
    render(<StaffContact contact={{ email: "host@example.com", discord: "host#0001" }} />);
    expect(screen.getByText(/Questions\? Contact staff/)).toBeInTheDocument();
    expect(screen.getByText("host#0001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "host@example.com" })).toHaveAttribute(
      "href",
      "mailto:host@example.com",
    );
  });

  it("renders nothing when both are null", () => {
    const { container } = render(<StaffContact contact={{ email: null, discord: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders just the discord handle when only it is set", () => {
    render(<StaffContact contact={{ email: null, discord: "host#0001" }} />);
    expect(screen.getByText("host#0001")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
