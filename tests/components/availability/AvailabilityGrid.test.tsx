/**
 * @file tests/components/availability/AvailabilityGrid.test.tsx
 * @desc The availability grid: 7 days by 24 hours, toggled by click, drag or keyboard, each cell
 *       a pressed-or-not button.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityGrid } from "@/components/availability/AvailabilityGrid";

describe("AvailabilityGrid", () => {
  it("shows 168 cells with the picked ones pressed", () => {
    render(<AvailabilityGrid value={[1]} onChange={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(168);
    expect(screen.getByRole("button", { name: "Mon 01:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Mon 00:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("moves with arrow keys and toggles with space", async () => {
    const onChange = vi.fn();
    render(<AvailabilityGrid value={[]} onChange={onChange} />);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Mon 00:00" }).focus();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(screen.getByRole("button", { name: "Tue 01:00" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith([25]);
  });

  it("drags to set a run of cells", () => {
    const onChange = vi.fn();
    render(<AvailabilityGrid value={[]} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Wed 10:00" }));
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Wed 11:00" }));
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Wed 12:00" }));
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith([58, 59, 60]);
  });
});
