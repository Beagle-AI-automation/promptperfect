'use client';

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultComplements } from "./ResultComplements";

const OPTIMIZED = [
  "You are a senior backend architect. Design the REST API for orders.",
  "",
  "## Endpoints",
  "1. List with cursor pagination (default 25, max 100).",
  "2. Create idempotently via Idempotency-Key.",
  "",
  "## Constraints",
  "- You must return {code, message, requestId}.",
  "- Never expose stack traces; limit payloads to 1MB.",
  "",
  "## Format",
  "Respond with OpenAPI YAML plus a markdown table of codes.",
  "",
  "Success means every list paginates and every mutation is idempotent. " +
    "Extra context to reach healthy length: URL versioning, OAuth2, 100 rpm limits, " +
    "webhooks, backoff retries, contract tests, staging smoke runs, and acceptance criteria reviews.",
].join("\n");

describe("ResultComplements", () => {
  it("renders nothing for empty output", () => {
    const { container } = render(
      <ResultComplements
        original="hi"
        optimized="   "
        explanation=""
        mode="better"
        provider="gemini"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows quality, tokens, checks and download", () => {
    render(
      <ResultComplements
        original="short input"
        optimized={OPTIMIZED}
        explanation="Because reasons."
        mode="better"
        provider="gemini"
      />
    );
    expect(screen.getByText(/Quality [A-D] · \d+/)).toBeInTheDocument();
    expect(screen.getByText(/tokens \(est\.\)/)).toBeInTheDocument();
    expect(screen.getByText(/No placeholders/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download \.md/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/quality checklist/i)).toBeInTheDocument();
  });

  it("warns about unfilled placeholders", () => {
    render(
      <ResultComplements
        original="x"
        optimized={`${OPTIMIZED}\n\nDeploy to {{ENV}} with {{API_KEY}}.`}
        explanation=""
        mode="production"
        provider="openai"
        modelId="gpt-6-astra"
      />
    );
    expect(screen.getByText(/2 placeholders to fill/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("{{ENV}}");
  });

  it("offers fix & re-run only when checks fail and handler exists", () => {
    const onRemediate = vi.fn();
    const { rerender } = render(
      <ResultComplements
        original="x"
        optimized="Do stuff"
        explanation=""
        mode="better"
        provider="gemini"
        onRemediate={onRemediate}
      />
    );
    const button = screen.getByRole("button", { name: /fix \d+ issues? & re-run/i });
    fireEvent.click(button);
    expect(onRemediate).toHaveBeenCalledTimes(1);
    const firstCall = onRemediate.mock.calls[0];
    expect(firstCall).toBeDefined();
    const block = firstCall?.[0] as string;
    expect(block).toContain("Refinement pass");
    expect(block).toContain("- Constraints:");

    // Fully-passing output (and missing handler) show no button.
    rerender(
      <ResultComplements
        original="x"
        optimized={OPTIMIZED}
        explanation=""
        mode="production"
        provider="gemini"
        onRemediate={onRemediate}
      />
    );
    expect(
      screen.queryByRole("button", { name: /fix \d+ issues? & re-run/i })
    ).toBeNull();
  });
});
