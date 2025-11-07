import { describe, it, expect, vi } from "vitest";
import {
  performResetPassword,
  validateResetPasswordCredentials,
  getAuthErrorMessage,
  type ResetPasswordCredentials,
} from "../resetPasswordHandler";

// ============================================================================
// UNIT TESTS FOR RESET PASSWORD HANDLER
// ============================================================================

describe("resetPasswordHandler", () => {
  // ==========================================================================
  // performResetPassword - SUCCESS SCENARIOS
  // ==========================================================================

  describe("performResetPassword - Success Scenarios", () => {
    it("should return success:true when password reset is successful", async () => {
      // Mock successful updateUser function
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should call updateUser with correct password", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "MyNewPass123",
      };

      await performResetPassword(credentials, mockUpdateUser);

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "MyNewPass123",
      });
    });

    it("should call updateUser exactly once", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "Password123",
      };

      await performResetPassword(credentials, mockUpdateUser);

      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // performResetPassword - ERROR SCENARIOS
  // ==========================================================================

  describe("performResetPassword - Error Scenarios", () => {
    it("should return error when token is expired or invalid", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("Token has expired or is invalid"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Token jest nieprawidłowy lub wygasł");
    });

    it("should return error when user not found", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("User not found"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Użytkownik nie istnieje");
    });

    it("should return error when password is invalid", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("Invalid password"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "weak",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Hasło nie spełnia wymagań");
    });

    it("should return error when password is too short (Supabase validation)", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("Password should be at least 6 characters"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "Pass1",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Hasło musi mieć co najmniej 6 znaków");
    });

    it("should return error when new password is same as old password", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("New password should be different from the old password"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "SamePassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Nowe hasło musi różnić się od starego");
    });

    it("should use generic error message for unknown errors", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: new Error("Some unknown error"),
      });

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });

    it("should include error code when available", async () => {
      const errorWithCode = new Error("Token has expired or is invalid");
      (errorWithCode as Error & { code: string }).code = "token_expired";

      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: errorWithCode,
      });

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("token_expired");
    });
  });

  // ==========================================================================
  // performResetPassword - EXCEPTION HANDLING
  // ==========================================================================

  describe("performResetPassword - Exception Handling", () => {
    it("should handle updateUser throwing an exception", async () => {
      const mockUpdateUser = vi.fn().mockRejectedValue(new Error("Network error"));

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle non-Error exceptions", async () => {
      const mockUpdateUser = vi.fn().mockRejectedValue("String error");

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });

    it("should handle null rejection", async () => {
      const mockUpdateUser = vi.fn().mockRejectedValue(null);

      const credentials: ResetPasswordCredentials = {
        password: "NewPassword123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // performResetPassword - EDGE CASES
  // ==========================================================================

  describe("performResetPassword - Edge Cases", () => {
    it("should handle password with special characters", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "P@ssw0rd!#$%^&*()",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "P@ssw0rd!#$%^&*()",
      });
    });

    it("should handle very long password", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const longPassword = "Password123" + "a".repeat(100);
      const credentials: ResetPasswordCredentials = {
        password: longPassword,
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
    });

    it("should handle password with Unicode characters", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "Пароль123",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
    });

    it("should handle password with emojis", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "Password123😀",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
    });

    it("should handle minimum valid password length (8 chars)", async () => {
      const mockUpdateUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const credentials: ResetPasswordCredentials = {
        password: "Abcd1234",
      };

      const result = await performResetPassword(credentials, mockUpdateUser);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // validateResetPasswordCredentials - VALID INPUTS
  // ==========================================================================

  describe("validateResetPasswordCredentials - Valid Inputs", () => {
    it("should return true for valid password", () => {
      const credentials: ResetPasswordCredentials = {
        password: "Password123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with exactly 8 characters", () => {
      const credentials: ResetPasswordCredentials = {
        password: "Abcd1234",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for long password meeting requirements", () => {
      const credentials: ResetPasswordCredentials = {
        password: "VeryLongPassword123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with special characters", () => {
      const credentials: ResetPasswordCredentials = {
        password: "P@ssw0rd!",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(true);
    });

    it("should return true for password with multiple uppercase and digits", () => {
      const credentials: ResetPasswordCredentials = {
        password: "ABCdef123456",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // validateResetPasswordCredentials - INVALID INPUTS
  // ==========================================================================

  describe("validateResetPasswordCredentials - Invalid Inputs", () => {
    it("should return false for empty password", () => {
      const credentials: ResetPasswordCredentials = {
        password: "",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password shorter than 8 characters", () => {
      const credentials: ResetPasswordCredentials = {
        password: "Pass123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without lowercase letter", () => {
      const credentials: ResetPasswordCredentials = {
        password: "PASSWORD123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without uppercase letter", () => {
      const credentials: ResetPasswordCredentials = {
        password: "password123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password without digit", () => {
      const credentials: ResetPasswordCredentials = {
        password: "PasswordOnly",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for 7 character password (boundary - 1)", () => {
      const credentials: ResetPasswordCredentials = {
        password: "Pass123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only lowercase and digits", () => {
      const credentials: ResetPasswordCredentials = {
        password: "password123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only uppercase and digits", () => {
      const credentials: ResetPasswordCredentials = {
        password: "PASSWORD123",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should return false for password with only letters", () => {
      const credentials: ResetPasswordCredentials = {
        password: "PasswordOnly",
      };

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // validateResetPasswordCredentials - TYPE SAFETY
  // ==========================================================================

  describe("validateResetPasswordCredentials - Type Safety", () => {
    it("should handle credentials with undefined password", () => {
      const credentials = {
        password: undefined,
      } as unknown as ResetPasswordCredentials;

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle credentials with null password", () => {
      const credentials = {
        password: null,
      } as unknown as ResetPasswordCredentials;

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });

    it("should handle completely empty object", () => {
      const credentials = {} as unknown as ResetPasswordCredentials;

      const result = validateResetPasswordCredentials(credentials);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getAuthErrorMessage - ERROR MESSAGE MAPPING
  // ==========================================================================

  describe("getAuthErrorMessage - Error Message Mapping", () => {
    it("should translate 'Token has expired or is invalid'", () => {
      const error = new Error("Token has expired or is invalid");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Token jest nieprawidłowy lub wygasł");
    });

    it("should translate 'User not found'", () => {
      const error = new Error("User not found");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Użytkownik nie istnieje");
    });

    it("should translate 'Invalid password'", () => {
      const error = new Error("Invalid password");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Hasło nie spełnia wymagań");
    });

    it("should translate 'Password should be at least 6 characters'", () => {
      const error = new Error("Password should be at least 6 characters");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Hasło musi mieć co najmniej 6 znaków");
    });

    it("should translate 'New password should be different from the old password'", () => {
      const error = new Error("New password should be different from the old password");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Nowe hasło musi różnić się od starego");
    });

    it("should return generic message for unknown error", () => {
      const error = new Error("Unknown error message");
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });

    it("should handle non-Error object (string)", () => {
      const error = "String error";
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });

    it("should handle null error", () => {
      const error = null;
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });

    it("should handle undefined error", () => {
      const error = undefined;
      const message = getAuthErrorMessage(error);

      expect(message).toBe("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.");
    });
  });
});
