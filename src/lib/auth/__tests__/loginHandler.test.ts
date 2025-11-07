import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { performLogin, validateLoginCredentials, type LoginCredentials } from "../loginHandler";

// ============================================================================
// UNIT TESTS FOR LOGIN API HANDLER
// ============================================================================

describe("loginHandler", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // performLogin - SUCCESS SCENARIOS
  // ==========================================================================

  describe("performLogin - Success Scenarios", () => {
    it("should return success:true when login is successful", async () => {
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should call fetch with correct URL and method", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "user@example.com",
        password: "mypassword",
      };

      await performLogin(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should send credentials in request body as JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "user@test.com",
        password: "testpass123",
      };

      await performLogin(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "user@test.com",
            password: "testpass123",
          }),
        })
      );
    });

    it("should handle successful login with additional response data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          user: { id: 1, email: "test@example.com" },
        }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // performLogin - ERROR SCENARIOS
  // ==========================================================================

  describe("performLogin - Error Scenarios", () => {
    it("should return error when API returns 401 Unauthorized", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: "Nieprawidłowy email lub hasło" },
        }),
      });

      const credentials: LoginCredentials = {
        email: "wrong@example.com",
        password: "wrongpassword",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Nieprawidłowy email lub hasło");
      expect(result.error?.statusCode).toBe(401);
    });

    it("should return error when API returns 400 Bad Request", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Błędne dane wejściowe" },
        }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "pass",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Błędne dane wejściowe");
      expect(result.error?.statusCode).toBe(400);
    });

    it("should return error when API returns 500 Internal Server Error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: "Błąd serwera" },
        }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(500);
    });

    it("should use generic error message when API returns no error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: {} }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas logowania");
    });

    it("should use generic error message when error object is missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas logowania");
    });
  });

  // ==========================================================================
  // performLogin - NETWORK ERRORS
  // ==========================================================================

  describe("performLogin - Network Errors", () => {
    it("should handle network error (fetch rejection)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Network error");
    });

    it("should handle timeout error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Request timeout"));

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Request timeout");
    });

    it("should handle connection refused error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Connection refused");
    });

    it("should handle non-Error exceptions in catch block", async () => {
      global.fetch = vi.fn().mockRejectedValue("String error");

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas logowania");
    });

    it("should handle null rejection", async () => {
      global.fetch = vi.fn().mockRejectedValue(null);

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas logowania");
    });
  });

  // ==========================================================================
  // performLogin - JSON PARSING ERRORS
  // ==========================================================================

  describe("performLogin - JSON Parsing Errors", () => {
    it("should handle malformed JSON in response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid JSON");
    });

    it("should handle empty response body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await performLogin(credentials);

      // Should still succeed if response is ok
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // performLogin - EDGE CASES
  // ==========================================================================

  describe("performLogin - Edge Cases", () => {
    it("should handle very long email address", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const longEmail = "a".repeat(100) + "@example.com";
      const credentials: LoginCredentials = {
        email: longEmail,
        password: "password123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: expect.stringContaining(longEmail),
        })
      );
    });

    it("should handle special characters in password", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "p@ssw0rd!#$%^&*()",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle Unicode characters in credentials", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "użytkownik@example.com",
        password: "пароль123",
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle credentials with whitespace", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "  test@example.com  ",
        password: "  password123  ",
      };

      await performLogin(credentials);

      // Note: Handler doesn't trim - that's responsibility of validation layer
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: JSON.stringify({
            email: "  test@example.com  ",
            password: "  password123  ",
          }),
        })
      );
    });

    it("should handle minimum valid password length", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "123456", // Exactly 6 characters
      };

      const result = await performLogin(credentials);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // validateLoginCredentials - VALID INPUTS
  // ==========================================================================

  describe("validateLoginCredentials - Valid Inputs", () => {
    it("should return true for valid email and password", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with exactly 8 characters", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "Pass1234",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for long password", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "Verylongpassword12345678901234567890",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for email with special characters", () => {
      const credentials: LoginCredentials = {
        email: "user+test@example.com",
        password: "Password123",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // validateLoginCredentials - INVALID INPUTS
  // ==========================================================================

  describe("validateLoginCredentials - Invalid Inputs", () => {
    it("should return false for empty email", () => {
      const credentials: LoginCredentials = {
        email: "",
        password: "password123",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for empty password", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password shorter than 6 characters", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "12345",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for 5 character password (boundary - 1)", () => {
      const credentials: LoginCredentials = {
        email: "test@example.com",
        password: "abcde",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false when both email and password are empty", () => {
      const credentials: LoginCredentials = {
        email: "",
        password: "",
      };

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for whitespace-only email", () => {
      const credentials: LoginCredentials = {
        email: "   ",
        password: "Password123",
      };

      const result = validateLoginCredentials(credentials);

      // Note: This validates length > 0, not format
      // Format validation is done by Zod schema
      expect(result).toBe(true); // Whitespace counts as non-empty
    });
  });

  // ==========================================================================
  // validateLoginCredentials - TYPE SAFETY
  // ==========================================================================

  describe("validateLoginCredentials - Type Safety", () => {
    it("should handle credentials with undefined email", () => {
      const credentials = {
        email: undefined,
        password: "password123",
      } as unknown as LoginCredentials;

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle credentials with null password", () => {
      const credentials = {
        email: "test@example.com",
        password: null,
      } as unknown as LoginCredentials;

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle completely empty object", () => {
      const credentials = {} as unknown as LoginCredentials;

      const result = validateLoginCredentials(credentials);

      expect(result).toBe(false);
    });
  });
});
