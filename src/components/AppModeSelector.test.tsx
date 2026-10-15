"use client";

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppModeSelector } from "./AppModeSelector";

describe("AppModeSelector", () => {
  it("renders all modes and marks the selected one", () => {
    const onChange = vi.fn();
    render(
      <AppModeSelector
        variant="optimizer"
        value="specific"
        onChange={onChange}
      />
    );
    for (const label of [
      "Make it Better",
      "Make it Specific",
      "Add Chain-of-Thought",
      "Production Audit",
    ]) {
      expect(
        screen.getByRole("button", { name: label })
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: "Make it Specific" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Make it Better" })
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Production Audit" }));
    expect(onChange).toHaveBeenCalledWith("production");
  });

  it("disables all buttons when disabled", () => {
    render(
      <AppModeSelector value="better" onChange={() => {}} disabled />
    );
    for (const b of screen.getAllByRole("button")) {
      expect(b).toBeDisabled();
    }
  });
});
