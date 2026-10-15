'use client';

import { describe, it, expect, afterEach } from "vitest";
import { wipeBrowserSupabaseSession } from "./supabaseBrowserSessionWipe";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const prevUrl = process.env[URL_KEY];

function setCookie(name: string, value = "v") {
  document.cookie = `${name}=${value}; Path=/`;
}

function cookieNames(): string[] {
  return document.cookie
    .split(";")
    .map((p) => p.trim().split("=")[0])
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

describe("wipeBrowserSupabaseSession", () => {
  afterEach(() => {
    if (prevUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = prevUrl;
    localStorage.clear();
    for (const n of cookieNames()) {
      document.cookie = `${n}=; Path=/; Max-Age=0`;
    }
  });

  it("removes only keys for the configured project ref", () => {
    process.env[URL_KEY] = "https://abcxyz.supabase.co";
    localStorage.setItem("sb-abcxyz-auth-token", "tok");
    localStorage.setItem("sb-other-auth-token", "tok");
    localStorage.setItem("unrelated", "keep");
    setCookie("sb-abcxyz-auth-token");
    setCookie("sb-other-auth-token");

    wipeBrowserSupabaseSession();

    expect(localStorage.getItem("sb-abcxyz-auth-token")).toBeNull();
    expect(localStorage.getItem("sb-other-auth-token")).toBe("tok");
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(cookieNames()).not.toContain("sb-abcxyz-auth-token");
    expect(cookieNames()).toContain("sb-other-auth-token");
  });

  it("does nothing without a configured or parseable URL", () => {
    delete process.env[URL_KEY];
    localStorage.setItem("sb-abcxyz-auth-token", "tok");
    wipeBrowserSupabaseSession();
    expect(localStorage.getItem("sb-abcxyz-auth-token")).toBe("tok");

    process.env[URL_KEY] = "not a url at all !!!";
    wipeBrowserSupabaseSession();
    expect(localStorage.getItem("sb-abcxyz-auth-token")).toBe("tok");
  });
});
