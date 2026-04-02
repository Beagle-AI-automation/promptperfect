import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoLimitModal } from "./DemoLimitModal";

describe("DemoLimitModal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <DemoLimitModal
        open={false}
        onClose={() => {}}
        isGuest={true}
        message="Limit reached"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows message and Sign Up for guests when open", () => {
    render(
      <DemoLimitModal
        open={true}
        onClose={() => {}}
        isGuest={true}
        message="You have used all demo tokens."
      />
    );
    expect(screen.getByText("You have used all demo tokens.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup"
    );
  });

  it("shows Open Settings for authenticated users when open", () => {
    const onClose = vi.fn();
    render(
      <DemoLimitModal
        open={true}
        onClose={onClose}
        isGuest={false}
        message="Upgrade needed"
      />
    );
    expect(screen.getByText("Upgrade needed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Close is clicked", () => {
    const onClose = vi.fn();
    render(
      <DemoLimitModal
        open={true}
        onClose={onClose}
        isGuest={true}
        message="Done"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
