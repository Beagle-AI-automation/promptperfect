import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ApiKeyDialog } from "./ApiKeyDialog";

describe("ApiKeyDialog", () => {
  it("renders nothing when open is false", () => {
    render(
      <ApiKeyDialog open={false} onClose={() => {}} onSave={() => {}} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open is true", () => {
    render(<ApiKeyDialog open onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByRole("dialog", { name: "API key" })).toBeInTheDocument();
    expect(screen.getByLabelText("Enter your API key")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("uses custom title when provided", () => {
    render(
      <ApiKeyDialog
        open
        onClose={() => {}}
        onSave={() => {}}
        title="Custom title"
      />
    );
    expect(
      screen.getByRole("heading", { name: "Custom title" })
    ).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ApiKeyDialog open onClose={onClose} onSave={() => {}} />
    );
    const dialog = within(container).getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave with trimmed value when Save is clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <ApiKeyDialog open onClose={onClose} onSave={onSave} />
    );
    const dialog = within(container).getByRole("dialog");
    const input = within(dialog).getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "  sk-abc  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("sk-abc");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onSave when input is empty", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ApiKeyDialog open onClose={() => {}} onSave={onSave} />
    );
    const dialog = within(container).getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Save button is disabled when input is empty", () => {
    const { container } = render(
      <ApiKeyDialog open onClose={() => {}} onSave={() => {}} />
    );
    const dialog = within(container).getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("input has password type", () => {
    render(<ApiKeyDialog open onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByLabelText("Enter your API key")).toHaveAttribute(
      "type",
      "password"
    );
  });
});
