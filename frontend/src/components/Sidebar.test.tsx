import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
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
});
