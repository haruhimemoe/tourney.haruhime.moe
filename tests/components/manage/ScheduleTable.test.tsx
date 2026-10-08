/**
 * @file tests/components/manage/ScheduleTable.test.tsx
 * @desc The schedule table shows each match's time in the viewer's zone, and "not set" for none.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleTable } from "@/components/manage/ScheduleTable";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const ROWS = [
  { code: "M1", round: "SF", a: "Team 1", b: "Team 4", scheduledAt: "2026-11-02T18:00:00.000Z" },
  { code: "M3", round: "F", a: null, b: null, scheduledAt: null },
];

describe("ScheduleTable", () => {
  it("renders times in the viewer's zone", () => {
    render(<ScheduleTable lineage="egc" edition="egc2026" rows={ROWS} zone="Asia/Tokyo" />);
    const row = screen.getByRole("row", { name: /M1/ });
    expect(row.textContent).toContain("Tue, Nov 3, 03:00");
    expect(screen.getByRole("row", { name: /M3/ }).textContent).toContain("Not set");
    expect(screen.getByText(/Times in Asia\/Tokyo/)).toBeTruthy();
  });
});
