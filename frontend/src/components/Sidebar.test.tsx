import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Browse and Manage nav links", () => {
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /browse/i })).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: /manage/i })).toHaveAttribute("href", "/manage");
  });

  it("marks the active route link", () => {
    render(
      <MemoryRouter initialEntries={["/manage"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /manage/i })).toHaveClass("active");
  });

  it("collapses when the logo area is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    await user.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar")).toHaveClass("w-16");
  });

  it("keeps nav icons visible (only hiding their text labels) when collapsed", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    const browseLink = screen.getByRole("link", { name: /browse/i });
    const manageLink = screen.getByRole("link", { name: /manage/i });
    expect(browseLink.querySelector("svg")).toBeInTheDocument();
    expect(manageLink.querySelector("svg")).toBeInTheDocument();

    await user.click(screen.getByTestId("sidebar-toggle"));

    expect(screen.queryByText("Browse")).not.toBeInTheDocument();
    expect(screen.queryByText("Manage")).not.toBeInTheDocument();
    expect(browseLink.querySelector("svg")).toBeInTheDocument();
    expect(manageLink.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the collapse-affordance icon only while expanded", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar-collapse-icon")).toBeInTheDocument();

    await user.click(screen.getByTestId("sidebar-toggle"));

    expect(screen.queryByTestId("sidebar-collapse-icon")).not.toBeInTheDocument();
  });

  it("shows a badge on the Config nav item when the last apply failed", async () => {
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: "failed: crash", timestamp: 1 });

    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId("config-nav-badge")).toBeInTheDocument());
  });

  it("renders a Connect nav link pointing at /connect", () => {
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /connect/i });
    expect(link).toHaveAttribute("href", "/connect");
  });

  it("renders a Settings nav link pointing at /settings", () => {
    render(
      <MemoryRouter initialEntries={["/browse"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings");
  });
});
