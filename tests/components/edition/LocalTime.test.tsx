/**
 * @file tests/components/edition/LocalTime.test.tsx
 * @desc LocalTime: a given zone and hour cycle render as given, UTC with no forced hour cycle
 *       renders on the server, and a missing zone swaps to the browser's own after mount.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalTime } from "@/components/edition/LocalTime";

describe("LocalTime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a given zone, with the instant in datetime", () => {
    render(<LocalTime at="2026-11-02T18:00:00.000Z" zone="Asia/Tokyo" hourCycle="h23" />);
    const time = screen.getByText(/Tue, Nov 3, 03:00/);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-11-02T18:00:00.000Z");
  });

  it("renders in 12-hour with hourCycle h12", () => {
    render(<LocalTime at="2026-11-02T15:00:00.000Z" zone="UTC" hourCycle="h12" />);
    expect(screen.getByText(/03:00 PM/)).toBeTruthy();
  });

  it("labels UTC when the zone is UTC", () => {
    render(<LocalTime at="2026-11-02T18:00:00.000Z" zone="UTC" hourCycle="h23" />);
    expect(screen.getByText("Mon, Nov 2, 18:00 UTC")).toBeTruthy();
  });

  it("renders UTC on first render, then the browser's zone after mount, with no zone given", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Asia/Tokyo",
    } as Intl.ResolvedDateTimeFormatOptions);
    render(<LocalTime at="2026-11-02T18:00:00.000Z" />);
    expect(await screen.findByText(/Tue, Nov 3/)).toBeTruthy();
    expect(screen.queryByText(/UTC$/)).toBeNull();
  });

  it("leaves hourCycle undefined when absent, so the locale decides", () => {
    render(<LocalTime at="2026-11-02T15:00:00.000Z" zone="UTC" />);
    expect(screen.getByText(/03:00 PM/)).toBeTruthy();
  });
});
