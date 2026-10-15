'use client';

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranslateButton } from "./TranslateButton";

describe("TranslateButton", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("labels the detected direction and calls back on success", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translatedText: "Hello world" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onTranslated = vi.fn();
    render(<TranslateButton text="Hola mundo" onTranslated={onTranslated} />);

    const button = screen.getByRole("button", { name: /traducir al english/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(onTranslated).toHaveBeenCalledWith("Hello world");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        body: expect.stringContaining('"targetLang":"en"') as string,
      })
    );
  });

  it("targets Spanish for English text and shows errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "slow down" }),
      }))
    );
    render(<TranslateButton text="Hello world" onTranslated={() => {}} />);
    expect(
      screen.getByRole("button", { name: /traducir al español/i })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /traducir al español/i })
    );
    await waitFor(() => {
      expect(screen.getByText("slow down")).toBeInTheDocument();
    });
  });

  it("disables for empty text", () => {
    render(<TranslateButton text="   " onTranslated={() => {}} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
