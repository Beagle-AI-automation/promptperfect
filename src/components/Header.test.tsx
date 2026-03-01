import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Header } from "./Header";

describe("Header", () => {
  it("renders PromptPerfect title", () => {
    render(<Header />);
    expect(
      screen.getByRole("heading", { level: 1, name: "PromptPerfect" })
    ).toBeInTheDocument();
  });

  it("does not render API key button when onApiKeyClick is not provided", () => {
    render(<Header />);
    expect(screen.queryByRole("button", { name: "API key" })).not.toBeInTheDocument();
  });

  it("renders API key button when onApiKeyClick is provided", () => {
    render(<Header onApiKeyClick={() => {}} />);
    expect(screen.getByRole("button", { name: "API key" })).toBeInTheDocument();
  });

  it("calls onApiKeyClick when API key button is clicked", () => {
    const onApiKeyClick = vi.fn();
    const { container } = render(<Header onApiKeyClick={onApiKeyClick} />);
    fireEvent.click(within(container).getByRole("button", { name: "API key" }));
    expect(onApiKeyClick).toHaveBeenCalledTimes(1);
  });
});
