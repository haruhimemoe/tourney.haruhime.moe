/**
 * @file tests/components/home/home.test.tsx
 * @desc The home page parts: only tabs with content show (one tab shows no tab list), Playing
 *       shows the next match and the pool link, Hosting shows the to-do counts, the signed-out
 *       home has its two entry points, and browse lists open editions.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrowseList } from "@/components/home/BrowseList";
import { HomeTabs } from "@/components/home/HomeTabs";
import { HostingTab } from "@/components/home/HostingTab";
import { PlayingTab } from "@/components/home/PlayingTab";
import { SignedOutHome } from "@/components/home/SignedOutHome";
import type { HostingEntry, PlayingEntry } from "@/services/dashboard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const EDITION = {
  id: "e1",
  slug: "egc2026",
  name: "EGC 2026",
  phase: "bracket" as const,
  mode: "osu" as const,
  lineageSlug: "egc",
};

const PLAYING: PlayingEntry[] = [
  {
    edition: EDITION,
    registration: { id: "r1", status: "approved", osuId: 101 },
    team: { id: "t1", name: "Haruhi" },
    nextMatch: { code: "M3", round: "SF", at: "2026-11-03T00:00:00.000Z", opponent: "Kyon" },
    poolUrl: "https://pools.haruhime.moe/pools/p-sf",
  },
];

const HOSTING: HostingEntry[] = [
  {
    lineage: { id: "l1", slug: "egc", name: "Evergreen Cup" },
    editions: [
      { edition: EDITION, todo: { pendingRegistrations: 2, untimedMatches: 1, missingResults: 0 } },
    ],
  },
];

describe("HomeTabs", () => {
  it("shows only tabs with content, and switches between them", () => {
    render(<HomeTabs playing={<p>play</p>} hosting={<p>host</p>} />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Playing", "Hosting"]);
    expect(screen.getByText("play")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Hosting" }));
    expect(screen.getByText("host")).toBeTruthy();
    expect(screen.queryByText("play")).toBeNull();
  });

  it("shows no tab list for a single tab", () => {
    render(<HomeTabs playing={null} hosting={<p>host</p>} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("host")).toBeTruthy();
  });
});

describe("PlayingTab", () => {
  it("shows the team, next match, opponent and pool link", () => {
    render(<PlayingTab entries={PLAYING} zone="UTC" availability={{}} />);
    expect(screen.getByRole("link", { name: "EGC 2026" })).toHaveAttribute("href", "/egc/egc2026");
    expect(screen.getByRole("link", { name: /M3/ })).toHaveAttribute("href", "/egc/egc2026/m/M3");
    expect(screen.getByText(/vs Kyon/)).toBeTruthy();
    expect(screen.getByText(/Tue, Nov 3, 00:00 UTC/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /pool/i })).toHaveAttribute(
      "href",
      "https://pools.haruhime.moe/pools/p-sf",
    );
  });
});

describe("HostingTab", () => {
  it("shows each edition's counts with links to manage", () => {
    render(<HostingTab entries={HOSTING} />);
    expect(screen.getByText("2 registrations to review")).toBeTruthy();
    expect(screen.getByText("1 match without a time")).toBeTruthy();
    expect(screen.queryByText(/result/)).toBeNull();
    expect(screen.getByRole("link", { name: "EGC 2026" })).toHaveAttribute(
      "href",
      "/manage/egc/egc2026",
    );
  });
});

describe("SignedOutHome", () => {
  it("offers browsing and hosting", () => {
    render(<SignedOutHome hostHref="https://www.haruhime.moe/signin?next=x" />);
    expect(screen.getByRole("link", { name: /Browse open registrations/ })).toHaveAttribute(
      "href",
      "/browse",
    );
    expect(screen.getByRole("link", { name: /Host a tournament/ })).toHaveAttribute(
      "href",
      "https://www.haruhime.moe/signin?next=x",
    );
  });
});

describe("BrowseList", () => {
  it("lists editions with their lineage and a register link", () => {
    render(
      <BrowseList
        items={[
          {
            edition: {
              ...EDITION,
              phase: "registration",
              sides: { kind: "team", rosterMin: 2, rosterMax: 4, subsMax: 0, lineup: 2 },
              eligibility: { rank: { min: 1000, max: 50000 }, countries: null, regions: null },
              registration: {
                opensAt: null,
                closesAt: "2026-11-10T00:00:00.000Z",
                playerCap: null,
                staffCap: null,
              },
              dates: { start: null, end: null },
            },
            lineage: { slug: "egc", name: "Evergreen Cup" },
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /EGC 2026/ })).toHaveAttribute("href", "/egc/egc2026");
    expect(screen.getByText(/2v2/)).toBeTruthy();
    expect(screen.getByText(/#1,000 to #50,000/)).toBeTruthy();
  });

  it("says so when nothing is open", () => {
    render(<BrowseList items={[]} />);
    expect(screen.getByText(/Nothing is open/)).toBeTruthy();
  });
});
