import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReadmeFrame } from "./ReadmeFrame";

describe("ReadmeFrame", () => {
  it("shows a loading indicator until the iframe finishes loading, then hides it", () => {
    const { container } = render(<ReadmeFrame markdown="# Hello" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    fireEvent.load(iframe as HTMLIFrameElement);

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
