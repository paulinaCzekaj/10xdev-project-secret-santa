import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  performForgotPassword,
  validateForgotPasswordCredentials,
  type ForgotPasswordCredentials,
} from "../forgotPasswordHandler";

// =============================================================================
// FORGOT PASSWORD HANDLER TESTS
// =============================================================================

describe("forgotPasswordHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // VALIDATION FUNCTION TESTS
  // ===========================================================================

  describe("validateForgotPasswordCredentials", () => {
    it("should validate correct email", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).not.toThrow();
      expect(validateForgotPasswordCredentials(credentials)).toBe(true);
    });

    it("should throw error for empty email", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).toThrow("Email jest wymagany");
    });

    it("should throw error for email with only whitespace", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "   ",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).toThrow("Email jest wymagany");
    });

    it("should throw error for invalid email format (no @)", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "invalidemail.com",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).toThrow("Nieprawidłowy format email");
    });

    it("should throw error for invalid email format (no domain)", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "user@",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).toThrow("Nieprawidłowy format email");
    });

    it("should throw error for invalid email format (no TLD)", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "user@domain",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).toThrow("Nieprawidłowy format email");
    });

    it("should accept valid email with subdomain", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "user@mail.example.com",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).not.toThrow();
    });

    it("should accept valid email with plus sign", () => {
      const credentials: ForgotPasswordCredentials = {
        email: "user+tag@example.com",
      };

      expect(() => validateForgotPasswordCredentials(credentials)).not.toThrow();
    });
  });

  // ===========================================================================
  // PERFORM FORGOT PASSWORD - SUCCESS SCENARIOS
  // ===========================================================================

  describe("performForgotPassword - Success Scenarios", () => {
    it("should successfully send reset link for valid email", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });
    });

    it("should call API with correct headers", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "user@example.com",
      };

      await performForgotPassword(credentials);

      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle email with special characters", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "user+tag@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // PERFORM FORGOT PASSWORD - ERROR SCENARIOS
  // ===========================================================================

  describe("performForgotPassword - Error Scenarios", () => {
    it("should return error when API returns 404 (user not found)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            message: "Użytkownik z tym adresem email nie istnieje",
          },
        }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "nonexistent@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Użytkownik z tym adresem email nie istnieje");
    });

    it("should return error when API returns 400 (bad request)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Nieprawidłowe dane wejściowe",
          },
        }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Nieprawidłowe dane wejściowe");
    });

    it("should return error when API returns 500 (server error)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: "Wewnętrzny błąd serwera",
          },
        }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wewnętrzny błąd serwera");
    });

    it("should return generic error when API returns error without message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas wysyłania emaila");
    });

    it("should handle network error (fetch throws)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.");
    });

    it("should handle fetch rejection with non-Error object", async () => {
      global.fetch = vi.fn().mockRejectedValue("String error");

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.");
    });

    it("should handle JSON parsing error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.");
    });
  });

  // ===========================================================================
  // PERFORM FORGOT PASSWORD - VALIDATION ERRORS
  // ===========================================================================

  describe("performForgotPassword - Validation Errors", () => {
    it("should return error for empty email", async () => {
      const credentials: ForgotPasswordCredentials = {
        email: "",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Email jest wymagany");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return error for invalid email format", async () => {
      const credentials: ForgotPasswordCredentials = {
        email: "invalid-email",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Nieprawidłowy format email");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return error for email without domain", async () => {
      const credentials: ForgotPasswordCredentials = {
        email: "user@",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Nieprawidłowy format email");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return error for whitespace-only email", async () => {
      const credentials: ForgotPasswordCredentials = {
        email: "   ",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Email jest wymagany");
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle very long email addresses", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const credentials: ForgotPasswordCredentials = {
        email: longEmail,
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle email with multiple subdomains", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "user@mail.subdomain.example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle email with dots in local part", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "first.middle.last@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle email with numbers", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "user123@example456.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle API response with additional fields", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: "Email sent", extraField: "ignored" }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "test@example.com",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle lowercase and uppercase in email", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const credentials: ForgotPasswordCredentials = {
        email: "User@Example.COM",
      };

      const result = await performForgotPassword(credentials);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({
          body: JSON.stringify({
            email: "User@Example.COM",
          }),
        })
      );
    });
  });
});
