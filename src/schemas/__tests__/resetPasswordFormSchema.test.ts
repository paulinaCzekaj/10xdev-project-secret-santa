import { describe, it, expect } from "vitest";
import { resetPasswordFormSchema, type ResetPasswordFormData } from "@/schemas/auth.schemas";
import { ZodError } from "zod";

// ============================================================================
// UNIT TESTS FOR resetPasswordFormSchema (Zod Validation Schema)
// ============================================================================

describe("resetPasswordFormSchema", () => {
  // ==========================================================================
  // VALID INPUTS - SHOULD PASS VALIDATION
  // ==========================================================================

  describe("Valid Inputs", () => {
    it("should validate correct password and confirmPassword", () => {
      const validData = {
        password: "Password123",
        confirmPassword: "Password123",
      };

      const result = resetPasswordFormSchema.parse(validData);

      expect(result).toEqual(validData);
      expect(result.password).toBe("Password123");
      expect(result.confirmPassword).toBe("Password123");
    });

    it("should accept password with exactly 8 characters meeting all requirements", () => {
      const data = {
        password: "Abcd1234",
        confirmPassword: "Abcd1234",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("Abcd1234");
      expect(result.password.length).toBe(8);
    });

    it("should accept password with more than 8 characters", () => {
      const data = {
        password: "VeryLongPassword123",
        confirmPassword: "VeryLongPassword123",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("VeryLongPassword123");
    });

    it("should accept password with special characters", () => {
      const data = {
        password: "P@ssw0rd!#$",
        confirmPassword: "P@ssw0rd!#$",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("P@ssw0rd!#$");
    });

    it("should accept password with multiple uppercase and lowercase letters", () => {
      const data = {
        password: "ABCDefgh123",
        confirmPassword: "ABCDefgh123",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("ABCDefgh123");
    });

    it("should accept password with multiple digits", () => {
      const data = {
        password: "Password1234567890",
        confirmPassword: "Password1234567890",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("Password1234567890");
    });

    it("should accept password with spaces", () => {
      const data = {
        password: "Pass Word 123",
        confirmPassword: "Pass Word 123",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("Pass Word 123");
    });
  });

  // ==========================================================================
  // PASSWORD VALIDATION - COMPLEXITY REQUIREMENTS
  // ==========================================================================

  describe("Password Validation - Complexity Requirements", () => {
    it("should reject password shorter than 8 characters", () => {
      const data = {
        password: "Pass123",
        confirmPassword: "Pass123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi mieć co najmniej 8 znaków");
        }
      }
    });

    it("should reject password with 7 characters (boundary - 1)", () => {
      const data = {
        password: "Pass123",
        confirmPassword: "Pass123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password without lowercase letter", () => {
      const data = {
        password: "PASSWORD123",
        confirmPassword: "PASSWORD123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password without uppercase letter", () => {
      const data = {
        password: "password123",
        confirmPassword: "password123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password without digit", () => {
      const data = {
        password: "PasswordOnly",
        confirmPassword: "PasswordOnly",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password missing multiple requirements (no uppercase, no digit)", () => {
      const data = {
        password: "passwordonly",
        confirmPassword: "passwordonly",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password with only lowercase and uppercase (no digit)", () => {
      const data = {
        password: "PasswordOnly",
        confirmPassword: "PasswordOnly",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject empty password", () => {
      const data = {
        password: "",
        confirmPassword: "",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password with only 1 character", () => {
      const data = {
        password: "A",
        confirmPassword: "A",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password with only special characters", () => {
      const data = {
        password: "!@#$%^&*",
        confirmPassword: "!@#$%^&*",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // CONFIRM PASSWORD VALIDATION
  // ==========================================================================

  describe("Confirm Password Validation", () => {
    it("should reject when confirmPassword is empty", () => {
      const data = {
        password: "Password123",
        confirmPassword: "",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const confirmError = error.errors.find((e) => e.path[0] === "confirmPassword");
          expect(confirmError).toBeDefined();
        }
      }
    });

    it("should reject when passwords do not match", () => {
      const data = {
        password: "Password123",
        confirmPassword: "Password456",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const confirmError = error.errors.find((e) => e.path[0] === "confirmPassword");
          expect(confirmError?.message).toBe("Hasła nie są identyczne");
        }
      }
    });

    it("should reject when passwords differ by case", () => {
      const data = {
        password: "Password123",
        confirmPassword: "password123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject when passwords differ by trailing space", () => {
      const data = {
        password: "Password123",
        confirmPassword: "Password123 ",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject when passwords differ by leading space", () => {
      const data = {
        password: "Password123",
        confirmPassword: " Password123",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should accept when both passwords match exactly", () => {
      const data = {
        password: "Password123!@#",
        confirmPassword: "Password123!@#",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe(result.confirmPassword);
    });

    it("should reject when confirmPassword meets complexity but doesn't match password", () => {
      const data = {
        password: "Password123",
        confirmPassword: "DifferentPass456",
      };

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        resetPasswordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          // Should have mismatch error on confirmPassword
          const confirmError = error.errors.find((e) => e.path[0] === "confirmPassword");
          expect(confirmError?.message).toBe("Hasła nie są identyczne");
        }
      }
    });
  });

  // ==========================================================================
  // MULTIPLE VALIDATION ERRORS
  // ==========================================================================

  describe("Multiple Validation Errors", () => {
    it("should return multiple errors when both fields are invalid", () => {
      const data = {
        password: "weak",
        confirmPassword: "different",
      };

      try {
        resetPasswordFormSchema.parse(data);
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors.length).toBeGreaterThan(0);

          // Should have errors for password complexity AND mismatch
          const passwordErrors = error.errors.filter((e) => e.path[0] === "password");
          const confirmErrors = error.errors.filter((e) => e.path[0] === "confirmPassword");

          expect(passwordErrors.length).toBeGreaterThan(0);
          expect(confirmErrors.length).toBeGreaterThan(0);
        }
      }
    });

    it("should return both password complexity error and mismatch error", () => {
      const data = {
        password: "weak",
        confirmPassword: "different",
      };

      try {
        resetPasswordFormSchema.parse(data);
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordErrors = error.errors.filter((e) => e.path[0] === "password");
          const confirmErrors = error.errors.filter((e) => e.path[0] === "confirmPassword");

          expect(passwordErrors.length).toBeGreaterThan(0);
          expect(confirmErrors.length).toBeGreaterThan(0);
        }
      }
    });

    it("should return only mismatch error when password is valid but doesn't match", () => {
      const data = {
        password: "Password123",
        confirmPassword: "DifferentPass456",
      };

      try {
        resetPasswordFormSchema.parse(data);
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          // Password is valid, so only confirmPassword should have error
          const passwordErrors = error.errors.filter((e) => e.path[0] === "password");
          const confirmErrors = error.errors.filter((e) => e.path[0] === "confirmPassword");

          expect(passwordErrors.length).toBe(0);
          expect(confirmErrors.length).toBeGreaterThan(0);
          expect(confirmErrors[0].message).toBe("Hasła nie są identyczne");
        }
      }
    });
  });

  // ==========================================================================
  // EDGE CASES AND TYPE SAFETY
  // ==========================================================================

  describe("Edge Cases and Type Safety", () => {
    it("should reject null password", () => {
      const data = {
        password: null,
        confirmPassword: "Password123",
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined password", () => {
      const data = {
        password: undefined,
        confirmPassword: "Password123",
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject null confirmPassword", () => {
      const data = {
        password: "Password123",
        confirmPassword: null,
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined confirmPassword", () => {
      const data = {
        password: "Password123",
        confirmPassword: undefined,
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject number as password", () => {
      const data = {
        password: 123456789,
        confirmPassword: 123456789,
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject array as password", () => {
      const data = {
        password: ["P", "a", "s", "s"],
        confirmPassword: ["P", "a", "s", "s"],
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should ignore extra fields not in schema", () => {
      const data = {
        password: "Password123",
        confirmPassword: "Password123",
        extraField: "should be ignored",
      } as unknown as ResetPasswordFormData;

      const result = resetPasswordFormSchema.parse(data);

      expect((result as Record<string, unknown>).extraField).toBeUndefined();
    });

    it("should handle very long password", () => {
      const longPassword = "Password123" + "a".repeat(100);
      const data = {
        password: longPassword,
        confirmPassword: longPassword,
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe(longPassword);
    });

    it("should handle password with emojis", () => {
      const data = {
        password: "Password123😀",
        confirmPassword: "Password123😀",
      };

      const result = resetPasswordFormSchema.parse(data);

      expect(result.password).toBe("Password123😀");
    });

    it("should reject missing password field", () => {
      const data = {
        confirmPassword: "Password123",
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject missing confirmPassword field", () => {
      const data = {
        password: "Password123",
      } as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject completely empty object", () => {
      const data = {} as unknown as ResetPasswordFormData;

      expect(() => resetPasswordFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // SAFEPARSE (NON-THROWING VALIDATION)
  // ==========================================================================

  describe("SafeParse (Non-throwing validation)", () => {
    it("should return success:true for valid data using safeParse", () => {
      const data = {
        password: "Password123",
        confirmPassword: "Password123",
      };

      const result = resetPasswordFormSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe("Password123");
        expect(result.data.confirmPassword).toBe("Password123");
      }
    });

    it("should return success:false for invalid data using safeParse", () => {
      const data = {
        password: "weak",
        confirmPassword: "different",
      };

      const result = resetPasswordFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it("should provide detailed error info in safeParse result", () => {
      const data = {
        password: "weak",
        confirmPassword: "different",
      };

      const result = resetPasswordFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors = result.error.errors.filter((e) => e.path[0] === "password");
        const confirmErrors = result.error.errors.filter((e) => e.path[0] === "confirmPassword");

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(confirmErrors.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // TYPE INFERENCE
  // ==========================================================================

  describe("Type Inference", () => {
    it("should correctly infer ResetPasswordFormData type", () => {
      const data: ResetPasswordFormData = {
        password: "Password123",
        confirmPassword: "Password123",
      };

      const result = resetPasswordFormSchema.parse(data);

      // TypeScript should allow these without errors
      const password: string = result.password;
      const confirmPassword: string = result.confirmPassword;

      expect(password).toBe("Password123");
      expect(confirmPassword).toBe("Password123");
    });
  });
});
