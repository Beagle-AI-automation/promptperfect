import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoLimitModal } from "./DemoLimitModal";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("DemoLimitModal", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <DemoLimitModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows limit copy and navigation actions when open", () => {
    render(<DemoLimitModal isOpen onClose={() => {}} />);
    expect(
      screen.getByRole("heading", {
        name: /you've used all 5 free optimizations/i,
      })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sign up free/i }));
    expect(push).toHaveBeenCalledWith("/signup");
    fireEvent.click(
      screen.getByRole("button", { name: /already have an account/i })
    );
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("calls onClose when Maybe later is clicked", () => {
    const onClose = vi.fn();
    render(<DemoLimitModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /maybe later/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
