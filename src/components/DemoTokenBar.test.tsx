import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoTokenBar } from "./DemoTokenBar";

describe("DemoTokenBar", () => {
  it("shows optimization count and remaining from getGuestLimit()", () => {
    render(<DemoTokenBar count={10} />);
    expect(
      screen.getByText(/10 of 50 free optimizations used/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/40 left/i)).toBeInTheDocument();
  });

  it("shows limit reached copy when count equals limit", () => {
    render(<DemoTokenBar count={50} />);
    expect(
      screen.getByText(/Free limit reached — sign up for unlimited/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/0 left/i)).toBeInTheDocument();
  });
});
