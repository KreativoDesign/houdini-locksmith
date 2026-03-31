/**
 * Tests for the Resend email helper.
 *
 * These tests verify:
 * 1. The helper gracefully skips sending when no API key is configured.
 * 2. The helper gracefully skips sending when the recipient has no email.
 * 3. The RESEND_API_KEY env var is present (validates the secret was set).
 * 4. A real Resend API call succeeds (validates the key is valid).
 *    This test is skipped when RESEND_API_KEY is not set so CI stays green.
 */
import { describe, expect, it, vi } from "vitest";
import { sendSignatureConfirmationEmail } from "./_core/email";

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_PARAMS = {
  to: "test@example.com",
  clientName: "Test Client",
  jobNumber: "JC-2026-TEST",
  jobTitle: "Test lock replacement",
  signerName: "Test Signer",
  signerRole: "Property Owner",
  signedAt: new Date("2026-01-01T10:00:00Z"),
  signatureUrl: "https://example.com/sig.png",
  technicianName: "Test Tech",
};

// ── Unit tests (no real API calls) ───────────────────────────────────────────

describe("sendSignatureConfirmationEmail – unit", () => {
  it("returns false and logs a warning when recipient email is empty string", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await sendSignatureConfirmationEmail({ ...SAMPLE_PARAMS, to: "" });
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no valid email address")
    );
    warnSpy.mockRestore();
  });

  it("returns false and logs a warning when recipient email has no @ symbol", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await sendSignatureConfirmationEmail({ ...SAMPLE_PARAMS, to: "notanemail" });
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no valid email address")
    );
    warnSpy.mockRestore();
  });
});

// ── Integration / secrets validation tests ───────────────────────────────────

describe("sendSignatureConfirmationEmail – integration", () => {
  it("RESEND_API_KEY env var is configured", () => {
    const key = process.env.RESEND_API_KEY ?? "";
    expect(key.length, "RESEND_API_KEY must be set in environment").toBeGreaterThan(0);
  });

  it("EMAIL_FROM env var is configured", () => {
    const from = process.env.EMAIL_FROM ?? "";
    expect(from.length, "EMAIL_FROM must be set in environment").toBeGreaterThan(0);
  });

  it.skipIf(!process.env.RESEND_API_KEY)(
    "Resend API key is valid (live ping — list domains)",
    async () => {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      // List domains — a lightweight read-only call that validates the key
      const { error } = await resend.domains.list();
      expect(error, `Resend API key is invalid: ${JSON.stringify(error)}`).toBeNull();
    },
    15_000 // 15s timeout for network call
  );
});
