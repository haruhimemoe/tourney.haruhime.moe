/**
 * @file tests/components/manage/ModuleCard.test.tsx
 * @desc The Modules tab's card: name and description, a switch that PUTs the toggle to
 *       /api/manage/[lineage]/modules, and the Settings link only once the module is both
 *       enabled and carries a settingsUrl. Takes a plain ModuleCardDto, not the registry's
 *       TourneyModule.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModuleCard } from "@/components/manage/ModuleCard";
import type { ModuleCardDto } from "@/lib/module-card-dto";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const fixture: ModuleCardDto = {
  id: "crowdfund",
  name: "Crowdfund",
  description: "Stretch tiers and unlocks.",
  settingsUrl: "/manage/egc/egc2026/settings/modules/crowdfund",
  enabled: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("ModuleCard", () => {
  it("shows the name and description", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ModuleCard lineage="egc" card={fixture} />);
    expect(screen.getByText("Crowdfund")).toBeInTheDocument();
    expect(screen.getByText("Stretch tiers and unlocks.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("PUTs the toggle and shows the Settings link once enabled", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { lineage: { modules: ["crowdfund"] } }));
    vi.stubGlobal("fetch", fetch);

    render(<ModuleCard lineage="egc" card={fixture} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/manage/egc/modules",
      expect.objectContaining({ method: "PUT" }),
    );
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ id: "crowdfund", enabled: true });

    const link = await screen.findByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/manage/egc/egc2026/settings/modules/crowdfund");
  });

  it("shows the route's refusal and leaves the switch off on failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        json(400, { error: { code: "limit", message: "This lineage already has 32 modules on." } }),
      );
    vi.stubGlobal("fetch", fetch);

    render(<ModuleCard lineage="egc" card={fixture} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));

    expect(
      await screen.findByText("That's over the limit for this tournament."),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("hides the Settings link when enabled but the module has no settingsUrl", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ModuleCard lineage="egc" card={{ ...fixture, settingsUrl: null, enabled: true }} />);
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });
});
