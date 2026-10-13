import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, newSessionToken, passwordProblem, verifyPassword } from "@/lib/password";

describe("passwords", () => {
  it("hashes one-way with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(a).not.toContain("correct horse");
    expect(a).not.toBe(b); // different salts
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
    expect(await verifyPassword("", a)).toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("requires 8+ characters", () => {
    expect(passwordProblem("short")).toMatch(/8 characters/);
    expect(passwordProblem("long enough")).toBeNull();
  });

  it("stores only a hash of the session token", () => {
    const t = newSessionToken();
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(newSessionToken()).not.toBe(t);
  });
});
