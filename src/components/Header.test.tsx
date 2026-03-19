import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ThemeProvider } from "./ThemeProvider";
import { Header } from "./Header";

function renderHeader(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("Header", () => {
  it("renders PromptPerfect title", () => {
    renderHeader(<Header />);
    expect(
      screen.getByRole("heading", { level: 1, name: "PromptPerfect" })
    ).toBeInTheDocument();
  });

  it("does not render API key button when onApiKeyClick is not provided", () => {
    renderHeader(<Header />);
    expect(screen.queryByRole("button", { name: "API key" })).not.toBeInTheDocument();
  });

  it("renders API key button when onApiKeyClick is provided", () => {
    renderHeader(<Header onApiKeyClick={() => {}} />);
    expect(screen.getByRole("button", { name: "API key" })).toBeInTheDocument();
  });

  it("calls onApiKeyClick when API key button is clicked", () => {
    const onApiKeyClick = vi.fn();
    const { container } = renderHeader(
      <Header onApiKeyClick={onApiKeyClick} />
    );
    fireEvent.click(within(container).getByRole("button", { name: "API key" }));
    expect(onApiKeyClick).toHaveBeenCalledTimes(1);
  });
});
