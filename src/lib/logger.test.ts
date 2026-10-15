import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRequestId, logApi } from "./logger";

describe("getRequestId", () => {
  it("forwards the incoming header and mints otherwise", () => {
    const withHeader = new Request("http://x/", {
      headers: { "x-request-id": "abc-123" },
    });
    expect(getRequestId(withHeader)).toBe("abc-123");
    const minted = getRequestId(new Request("http://x/"));
    expect(typeof minted).toBe("string");
    expect(minted.length).toBeGreaterThan(0);
  });
});

describe("logApi", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("emits one JSON line in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    logApi("optimize-sync", {
      status: 200,
      ms: 12.6,
      userId: "u1",
      requestId: "r1",
    });
    expect(console.log).toHaveBeenCalledTimes(1);
    const firstLog = vi.mocked(console.log).mock.calls[0];
    expect(firstLog).toBeDefined();
    const line = String(firstLog?.[0]);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      level: "info",
      route: "optimize-sync",
      status: 200,
      ms: 13,
      userId: "u1",
      requestId: "r1",
    });
  });

  it("marks 5xx as error level", () => {
    vi.stubEnv("NODE_ENV", "production");
    logApi("optimize", { status: 500, ms: 3, error: "boom" });
    const errLog = vi.mocked(console.log).mock.calls[0];
    expect(errLog).toBeDefined();
    const line = String(errLog?.[0]);
    expect((JSON.parse(line) as { level: string }).level).toBe("error");
  });
});
