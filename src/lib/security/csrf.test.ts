import { describe, it, expect } from "vitest";
import { assertCsrf } from "./csrf";

function makeRequest(headers?: Record<string, string>): Request {
  return new Request("https://example.com/api/test", {
    method: "POST",
    headers,
  });
}

describe("assertCsrf", () => {
  it("does not throw when X-CT-CSRF is '1'", () => {
    const req = makeRequest({ "X-CT-CSRF": "1" });
    expect(() => assertCsrf(req)).not.toThrow();
  });

  it("does not throw when x-ct-csrf is 'ctb'", () => {
    const req = makeRequest({ "x-ct-csrf": "ctb" });
    expect(() => assertCsrf(req)).not.toThrow();
  });

  it("throws 403 when header is missing", () => {
    const req = makeRequest();
    try {
      assertCsrf(req);
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(403);
      expect(err.message).toContain("CSRF");
    }
  });

  it("throws 403 when header value is invalid", () => {
    const req = makeRequest({ "X-CT-CSRF": "wrong" });
    try {
      assertCsrf(req);
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(403);
      expect(err.message).toContain("CSRF");
    }
  });
});
