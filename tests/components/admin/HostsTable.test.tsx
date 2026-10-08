/**
 * @file tests/components/admin/HostsTable.test.tsx
 * @desc HostsTable: lists verified hosts with an unverify button, and verifies a typed osu! id
 *       through PUT /api/admin/hosts.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostsTable } from "@/components/admin/HostsTable";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => vi.unstubAllGlobals());

describe("HostsTable", () => {
  it("lists hosts and sends a typed osu! id as verified", async () => {
    const fetchMock = vi.fn(async () => Response.json({ userId: "u", verified: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<HostsTable hosts={[{ userId: "u1", osuId: 500, username: "bighost" }]} />);
    expect(screen.getByRole("row", { name: /bighost/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("osu! id"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/hosts");
    expect(JSON.parse(String(init.body))).toEqual({ osuId: 600, verified: true });
  });

  it("unverifies a listed host", async () => {
    const fetchMock = vi.fn(async () => Response.json({ userId: "u", verified: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(<HostsTable hosts={[{ userId: "u1", osuId: 500, username: "bighost" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove bighost" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ osuId: 500, verified: false });
  });
});
