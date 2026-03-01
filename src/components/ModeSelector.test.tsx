import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { ModeSelector } from "./ModeSelector";

describe("ModeSelector", () => {
  it("renders all three mode buttons", () => {
    const { container } = render(<ModeSelector selected="better" onSelect={() => {}} />);
    const base = within(container);
    expect(base.getByRole("group", { name: "Optimization mode" })).toBeInTheDocument();
    expect(base.getByRole("button", { name: "Better" })).toBeInTheDocument();
    expect(base.getByRole("button", { name: "Shorter" })).toBeInTheDocument();
    expect(base.getByRole("button", { name: "Longer" })).toBeInTheDocument();
  });

  it("shows selected mode with aria-pressed", () => {
    const { container } = render(<ModeSelector selected="shorter" onSelect={() => {}} />);
    const base = within(container);
    expect(base.getByRole("button", { name: "Shorter" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(base.getByRole("button", { name: "Better" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onSelect with mode when button is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(<ModeSelector selected="better" onSelect={onSelect} />);
    fireEvent.click(within(container).getByRole("button", { name: "Longer" }));
    expect(onSelect).toHaveBeenCalledWith("longer");
  });

  it("disables all buttons when disabled is true", () => {
    const { container } = render(<ModeSelector selected="better" onSelect={() => {}} disabled />);
    const base = within(container);
    expect(base.getByRole("button", { name: "Better" })).toBeDisabled();
    expect(base.getByRole("button", { name: "Shorter" })).toBeDisabled();
    expect(base.getByRole("button", { name: "Longer" })).toBeDisabled();
  });

  it("renders Optimize for label", () => {
    const { container } = render(<ModeSelector selected="better" onSelect={() => {}} />);
    expect(within(container).getByText("Optimize for")).toBeInTheDocument();
  });
});
