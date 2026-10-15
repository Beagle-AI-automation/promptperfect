'use client';

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunActions } from "./RunActions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const OPTIMIZED = [
  "You are a senior backend architect. Design the REST API for orders.",
  "",
  "## Endpoints",
  "1. List with cursor pagination (default 25, max 100).",
  "",
  "## Constraints",
  "- You must return {code, message, requestId}. Never expose stack traces.",
  "",
  "## Format",
  "Respond with OpenAPI YAML plus a markdown table of codes.",
  "",
  "Success means every list paginates and every mutation is idempotent. " +
    "Extra context for length: URL versioning, OAuth2, 100 rpm limits, webhooks, " +
    "backoff retries, contract tests, staging smoke runs, acceptance reviews.",
].join("\n");

function renderActions() {
  return render(
    <RunActions
      historyId="hist-1"
      userId="user-1"
      sessionId="sess-1"
      inputText="design an api"
      optimized={OPTIMIZED}
      fullText={OPTIMIZED}
      explanation="Because."
      mode="better"
      provider="gemini"
      inputLength={13}
      outputLength={OPTIMIZED.length}
      inLibrary={false}
      feedbackDisabled={false}
      onSavedToLibrary={() => {}}
      onFeedbackSubmitted={() => {}}
      onTranslateOutput={() => {}}
    />
  );
}

describe("RunActions", () => {
  it("renders share, save, feedback and complements together", () => {
    renderActions();
    expect(
      screen.getByRole("button", { name: /share/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save to library/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/quality checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/No placeholders/)).toBeInTheDocument();
  });
});
