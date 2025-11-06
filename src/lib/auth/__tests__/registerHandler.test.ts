import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  performRegister,
  validateRegisterCredentials,
  type RegisterCredentials,
  type RegisterResult,
} from "../registerHandler";

// ============================================================================
// UNIT TESTS FOR REGISTER API HANDLER
// ============================================================================

describe("registerHandler", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // performRegister - SUCCESS SCENARIOS
  // ==========================================================================

  describe("performRegister - Success Scenarios", () => {
    it("should return success:true when registration is successful", async () => {
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "newuser@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should call fetch with correct URL and method", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "user@example.com",
        password: "Password123",
      };

      await performRegister(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should send credentials in request body as JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "test@test.com",
        password: "TestPass123",
      };

      await performRegister(credentials);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@test.com",
            password: "TestPass123",
          }),
        })
      );
    });
  });

  // ==========================================================================
  // performRegister - ERROR SCENARIOS
  // ==========================================================================

  describe("performRegister - Error Scenarios", () => {
    it("should return error when email is already taken (409 Conflict)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: { message: "Email jest już zarejestrowany" },
        }),
      });

      const credentials: RegisterCredentials = {
        email: "existing@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Email jest już zarejestrowany");
      expect(result.error?.statusCode).toBe(409);
    });

    it("should return error when API returns 400 Bad Request", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Nieprawidłowe dane" },
        }),
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "weak",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Nieprawidłowe dane");
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

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(500);
    });

    it("should use generic error message when API returns no error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: {} }),
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas rejestracji");
    });

    it("should use generic error message when error object is missing", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}),
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas rejestracji");
    });
  });

  // ==========================================================================
  // performRegister - NETWORK ERRORS
  // ==========================================================================

  describe("performRegister - Network Errors", () => {
    it("should handle network error (fetch rejection)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Network error");
    });

    it("should handle timeout error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Request timeout"));

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Request timeout");
    });

    it("should handle non-Error exceptions", async () => {
      global.fetch = vi.fn().mockRejectedValue("String error");

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas rejestracji");
    });
  });

  // ==========================================================================
  // performRegister - JSON PARSING ERRORS
  // ==========================================================================

  describe("performRegister - JSON Parsing Errors", () => {
    it("should handle malformed JSON in response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Invalid JSON");
    });
  });

  // ==========================================================================
  // performRegister - EDGE CASES
  // ==========================================================================

  describe("performRegister - Edge Cases", () => {
    it("should handle very long email address", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const longEmail = "a".repeat(100) + "@example.com";
      const credentials: RegisterCredentials = {
        email: longEmail,
        password: "Password123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle special characters in password", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "P@ssw0rd!#$%^&*()",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle Unicode characters in credentials", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "użytkownik@example.com",
        password: "Пароль123",
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(true);
    });

    it("should handle minimum valid password length (8 chars)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Abcd1234", // Exactly 8 characters
      };

      const result = await performRegister(credentials);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // validateRegisterCredentials - VALID INPUTS
  // ==========================================================================

  describe("validateRegisterCredentials - Valid Inputs", () => {
    it("should return true for valid email and password", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with exactly 8 characters", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Abcd1234",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for long password meeting requirements", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "VeryLongPassword123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with special characters", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "P@ssw0rd!",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with multiple uppercase and digits", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "ABCdef123456",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // validateRegisterCredentials - INVALID INPUTS
  // ==========================================================================

  describe("validateRegisterCredentials - Invalid Inputs", () => {
    it("should return false for empty email", () => {
      const credentials: RegisterCredentials = {
        email: "",
        password: "Password123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for empty password", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password shorter than 8 characters", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Pass123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without lowercase letter", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "PASSWORD123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without uppercase letter", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without digit", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "PasswordOnly",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only lowercase and digits (no uppercase)", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only uppercase and digits (no lowercase)", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "PASSWORD123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only letters (no digit)", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "PasswordOnly",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for 7 character password (boundary - 1)", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Pass123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false when both email and password are empty", () => {
      const credentials: RegisterCredentials = {
        email: "",
        password: "",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // validateRegisterCredentials - TYPE SAFETY
  // ==========================================================================

  describe("validateRegisterCredentials - Type Safety", () => {
    it("should handle credentials with undefined email", () => {
      const credentials = {
        email: undefined,
        password: "Password123",
      } as any;

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle credentials with null password", () => {
      const credentials = {
        email: "test@example.com",
        password: null,
      } as any;

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle completely empty object", () => {
      const credentials = {} as any;

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // validateRegisterCredentials - EDGE CASES
  // ==========================================================================

  describe("validateRegisterCredentials - Edge Cases", () => {
    it("should validate password complexity correctly", () => {
      // Has all requirements: lowercase, uppercase, digit, 8+ chars
      expect(
        validateRegisterCredentials({
          email: "test@example.com",
          password: "Password1",
        })
      ).toBe(true);

      // Missing uppercase
      expect(
        validateRegisterCredentials({
          email: "test@example.com",
          password: "password1",
        })
      ).toBe(false);

      // Missing lowercase
      expect(
        validateRegisterCredentials({
          email: "test@example.com",
          password: "PASSWORD1",
        })
      ).toBe(false);

      // Missing digit
      expect(
        validateRegisterCredentials({
          email: "test@example.com",
          password: "Password",
        })
      ).toBe(false);

      // Too short
      expect(
        validateRegisterCredentials({
          email: "test@example.com",
          password: "Pass1",
        })
      ).toBe(false);
    });

    it("should handle password with emojis", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Password123😀",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should handle password with spaces", () => {
      const credentials: RegisterCredentials = {
        email: "test@example.com",
        password: "Pass Word 123",
      };

      const result = validateRegisterCredentials(credentials);

      expect(result).toBe(true);
    });
  });
});
