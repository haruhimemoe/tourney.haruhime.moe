/**
 * @file tests/components/edition/edition-components.test.tsx
 * @desc The public edition's parts: rules Markdown rendered as elements (HTML stays text), times
 *       in UTC with a datetime until a zone is known, the schedule grouped by day in the viewer's
 *       zone, teams with escaped names, pool links only for revealed rounds, the results table,
 *       and the match page's pick/ban order and per-map winners.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocalTime } from "@/components/edition/LocalTime";
import { MatchDetail } from "@/components/edition/MatchDetail";
import { PoolLinks } from "@/components/edition/PoolLinks";
import { ResultsTable } from "@/components/edition/ResultsTable";
import { RulesText } from "@/components/edition/RulesText";
import { ScheduleList } from "@/components/edition/ScheduleList";
import { TeamList } from "@/components/edition/TeamList";
import { MATCH, NAMES, TEAMS } from "./fixtures";

vi.mock("next/navigation", () => ({ usePathname: () => "/egc/egc2026/bracket" }));

describe("RulesText", () => {
  it("renders headings, lists and https links, and keeps HTML as text", () => {
    const { container } = render(
      <RulesText source={"## Rules\n- one\n- [osu](https://osu.ppy.sh)\n\n<script>x</script>"} />,
    );
    expect(screen.getByRole("heading", { name: "Rules" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "osu" })).toHaveAttribute("rel", "nofollow noopener");
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>x</script>")).toBeTruthy();
  });
});

describe("LocalTime", () => {
  it("shows a given zone, with the instant in datetime", () => {
    render(<LocalTime at="2026-11-02T18:00:00.000Z" zone="Asia/Tokyo" />);
    const time = screen.getByText(/Tue, Nov 3, 03:00/);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-11-02T18:00:00.000Z");
  });

  it("labels UTC when the zone is UTC", () => {
    render(<LocalTime at="2026-11-02T18:00:00.000Z" zone="UTC" />);
    expect(screen.getByText("Mon, Nov 2, 18:00 UTC")).toBeTruthy();
  });
});

describe("ScheduleList", () => {
  const rows = [
    {
      code: "M1",
      round: "SF",
      a: "Haruhi",
      b: "Bold",
      scheduledAt: "2026-11-02T18:00:00.000Z",
      scoreA: null,
      scoreB: null,
    },
    {
      code: "M2",
      round: "SF",
      a: "C",
      b: "D",
      scheduledAt: "2026-11-02T12:00:00.000Z",
      scoreA: null,
      scoreB: null,
    },
    { code: "M3", round: "F", a: null, b: null, scheduledAt: null, scoreA: null, scoreB: null },
  ];

  it("groups by day in the viewer's zone, sorted, with unscheduled matches last", () => {
    render(<ScheduleList rows={rows} base="/egc/egc2026" zone="Asia/Tokyo" />);
    const days = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(days).toEqual(["Mon, Nov 2", "Tue, Nov 3", "Not scheduled yet"]);
    const nov2 = screen.getByRole("region", { name: "Mon, Nov 2" });
    expect(within(nov2).getByRole("link", { name: /M2/ })).toHaveAttribute(
      "href",
      "/egc/egc2026/m/M2",
    );
    expect(screen.getByRole("region", { name: "Not scheduled yet" }).textContent).toContain("TBD");
  });
});

describe("TeamList", () => {
  it("lists teams with seeds and players, names escaped", () => {
    const { container } = render(<TeamList teams={TEAMS} />);
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>Bold</b>")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kyon" })).toHaveAttribute(
      "href",
      "https://osu.ppy.sh/users/101",
    );
    expect(screen.getByRole("link", { name: "102" })).toBeTruthy();
    expect(container.textContent).toContain("Seed 1");
  });
});

describe("PoolLinks", () => {
  it("links revealed pools only", () => {
    render(
      <PoolLinks
        poolsUrl="https://pools.haruhime.moe"
        rounds={[
          { code: "SF", name: "Semifinals", poolId: "p1" },
          { code: "F", name: "Final", poolId: null },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /Semifinals/ })).toHaveAttribute(
      "href",
      "https://pools.haruhime.moe/pools/p1",
    );
    expect(screen.getByText(/Final/).closest("li")?.textContent).toContain("Not revealed yet");
  });
});

describe("ResultsTable", () => {
  it("lists places, unplaced last", () => {
    render(
      <ResultsTable
        names={NAMES}
        results={{
          champion: "t1",
          placements: [
            { entrantId: "t2", place: null },
            { entrantId: "t1", place: 1 },
          ],
        }}
      />,
    );
    const rows = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent);
    expect(rows).toEqual(["1Haruhi", "-<b>Bold</b>"]);
  });

  it("says so when nothing is decided", () => {
    render(<ResultsTable names={NAMES} results={{ champion: null, placements: [] }} />);
    expect(screen.getByText(/No results yet/)).toBeTruthy();
  });
});

describe("MatchDetail", () => {
  it("shows the pick/ban order with side names, and each map's winner", () => {
    render(<MatchDetail match={MATCH} names={{ a: "Haruhi", b: "<b>Bold</b>" }} />);
    const steps = within(screen.getByRole("list", { name: "Picks and bans" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(steps).toEqual(["Haruhi bans NM1", "<b>Bold</b> bans HD1", "<b>Bold</b> picks HR1"]);
    const maps = within(screen.getByRole("list", { name: "Maps" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(maps).toEqual(["NM2 (warmup)", "HR1: <b>Bold</b>", "DT1: Haruhi"]);
    expect(screen.getByRole("link", { name: /mp/ })).toHaveAttribute(
      "href",
      "https://osu.ppy.sh/mp/111",
    );
    expect(screen.getByRole("link", { name: /Stream/ })).toBeTruthy();
    expect(screen.getByText("3 - 1")).toBeTruthy();
  });
});

describe("EditionTabs", () => {
  it("links every tab and marks the current one", async () => {
    const { EditionTabs } = await import("@/components/edition/EditionTabs");
    render(<EditionTabs base="/egc/egc2026" />);
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Overview",
      "Bracket",
      "Schedule",
      "Teams",
      "Pools",
      "Results",
    ]);
    expect(screen.getByRole("link", { name: "Bracket" })).toHaveAttribute("aria-current", "page");
  });
});
