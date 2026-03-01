import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PromptInput } from "./PromptInput";

describe("PromptInput", () => {
  it("renders label and textarea", () => {
    render(<PromptInput value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Your prompt")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your prompt" })).toBeInTheDocument();
  });

  it("displays the value", () => {
    render(<PromptInput value="Hello world" onChange={() => {}} />);
    expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument();
  });

  it("calls onChange when user types", () => {
    const onChange = vi.fn();
    const { container } = render(<PromptInput value="" onChange={onChange} />);
    const textarea = within(container).getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("uses default placeholder when not provided", () => {
    const { container } = render(<PromptInput value="" onChange={() => {}} />);
    const textarea = within(container).getByRole("textbox");
    expect(textarea).toHaveAttribute(
      "placeholder",
      "Paste or type your prompt here..."
    );
  });

  it("uses custom placeholder when provided", () => {
    render(
      <PromptInput
        value=""
        onChange={() => {}}
        placeholder="Custom placeholder"
      />
    );
    expect(screen.getByPlaceholderText("Custom placeholder")).toBeInTheDocument();
  });

  it("renders textarea as disabled when disabled is true", () => {
    const { container } = render(<PromptInput value="" onChange={() => {}} disabled />);
    const textarea = within(container).getByRole("textbox");
    expect(textarea).toHaveAttribute("disabled");
  });
});
