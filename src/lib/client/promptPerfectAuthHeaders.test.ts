'use client';

import { describe, it, expect, vi } from "vitest";
import { getPromptPerfectAuthHeaders } from "./promptPerfectAuthHeaders";
import {
  persistEnginePrefsFromAuthUser,
  resolveAuthUserAndSession,
} from "./ppUserSync";

vi.mock("./ppUserSync", () => ({
  persistEnginePrefsFromAuthUser: vi.fn(),
  resolveAuthUserAndSession: vi.fn(),
}));

const mockedResolve = vi.mocked(resolveAuthUserAndSession);
const mockedPersist = vi.mocked(persistEnginePrefsFromAuthUser);
const fakeClient = {} as never;

describe("getPromptPerfectAuthHeaders", () => {
  it("returns Bearer headers and persists prefs for full sessions", async () => {
    mockedResolve.mockResolvedValue({
      user: { id: "u1", email: "a@b.c" },
      session: { access_token: "tok123" },
    } as never);
    await expect(getPromptPerfectAuthHeaders(fakeClient)).resolves.toEqual({
      Authorization: "Bearer tok123",
    });
    expect(mockedPersist).toHaveBeenCalled();
  });

  it("returns null without a session and skips prefs without email", async () => {
    mockedResolve.mockResolvedValue({ user: { id: "u1" }, session: null } as never);
    await expect(getPromptPerfectAuthHeaders(fakeClient)).resolves.toBeNull();
  });
});
