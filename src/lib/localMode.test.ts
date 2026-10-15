import { describe, it, expect, afterEach } from "vitest";
import {
  isUnlimitedMode,
  isPlaceholderSupabaseUrl,
  normalizeSupabaseUrl,
} from "./localMode";

const ENV_KEY = "NEXT_PUBLIC_UNLIMITED_MODE";
const prev = process.env[ENV_KEY];

afterEach(() => {
  if (prev === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = prev;
});

describe("isUnlimitedMode", () => {
  it("is false by default (production behaviour preserved)", () => {
    delete process.env[ENV_KEY];
    expect(isUnlimitedMode()).toBe(false);
  });

  it("is true for true/1/yes", () => {
    for (const v of ["true", "TRUE", "1", "yes", " 1 "]) {
      process.env[ENV_KEY] = v;
      expect(isUnlimitedMode()).toBe(true);
    }
  });

  it("is false for other values", () => {
    for (const v of ["false", "0", "no", ""]) {
      process.env[ENV_KEY] = v;
      expect(isUnlimitedMode()).toBe(false);
    }
  });
});

describe("isPlaceholderSupabaseUrl", () => {
  it("flags empty and placeholder urls", () => {
    expect(isPlaceholderSupabaseUrl(null)).toBe(true);
    expect(isPlaceholderSupabaseUrl(undefined)).toBe(true);
    expect(isPlaceholderSupabaseUrl("")).toBe(true);
    expect(isPlaceholderSupabaseUrl("https://your-project.supabase.co")).toBe(true);
    expect(isPlaceholderSupabaseUrl("https://example.com")).toBe(true);
  });

  it("accepts real urls", () => {
    expect(isPlaceholderSupabaseUrl("https://abcxyz.supabase.co")).toBe(false);
  });
});

describe("normalizeSupabaseUrl", () => {
  it("returns null for missing/placeholder and strips slashes", () => {
    expect(normalizeSupabaseUrl(undefined)).toBeNull();
    expect(normalizeSupabaseUrl("https://your-project.supabase.co")).toBeNull();
    expect(normalizeSupabaseUrl("https://abcxyz.supabase.co/")).toBe(
      "https://abcxyz.supabase.co"
    );
    expect(normalizeSupabaseUrl('"https://abcxyz.supabase.co"')).toBe(
      "https://abcxyz.supabase.co"
    );
  });
});
