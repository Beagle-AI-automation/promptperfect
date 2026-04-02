import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoTokenBar } from "./DemoTokenBar";

describe("DemoTokenBar", () => {
  it("shows guest copy and counts when isGuest is true", () => {
    render(
      <DemoTokenBar tokensUsed={10} tokenLimit={50} isGuest={true} />
    );
    expect(screen.getByText(/50 free demo tokens/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("shows signed-in copy when isGuest is false", () => {
    render(
      <DemoTokenBar tokensUsed={5} tokenLimit={100} isGuest={false} />
    );
    expect(screen.getByText(/100 free tokens/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("caps displayed used at tokenLimit for the bar label", () => {
    const { container } = render(
      <DemoTokenBar tokensUsed={60} tokenLimit={50} isGuest={true} />
    );
    expect(container.textContent).toMatch(/50 used/);
    expect(container.textContent).toMatch(/0 remaining/);
  });
});
