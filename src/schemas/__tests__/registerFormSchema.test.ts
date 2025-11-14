import { describe, it, expect } from "vitest";
import { registerFormSchema, type RegisterFormData } from "@/schemas/auth.schemas";
import { ZodError } from "zod";

// ============================================================================
// UNIT TESTS FOR registerFormSchema (Zod Validation Schema)
// ============================================================================

describe("registerFormSchema", () => {
  // ==========================================================================
  // VALID INPUTS - SHOULD PASS VALIDATION
  // ==========================================================================

  describe("Valid Inputs", () => {
    it("should validate correct email, password, confirmPassword, and acceptTerms", () => {
      const validData = {
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(validData);

      expect(result).toEqual(validData);
      expect(result.email).toBe("test@example.com");
      expect(result.password).toBe("Password123");
      expect(result.confirmPassword).toBe("Password123");
      expect(result.acceptTerms).toBe(true);
    });

    it("should accept password with exactly 8 characters meeting all requirements", () => {
      const data = {
        email: "user@test.com",
        password: "Abcd1234",
        confirmPassword: "Abcd1234",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe("Abcd1234");
      expect(result.password.length).toBe(8);
    });

    it("should accept password with more than 8 characters", () => {
      const data = {
        email: "user@test.com",
        password: "VeryLongPassword123",
        confirmPassword: "VeryLongPassword123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe("VeryLongPassword123");
    });

    it("should accept password with special characters", () => {
      const data = {
        email: "user@test.com",
        password: "P@ssw0rd!#$",
        confirmPassword: "P@ssw0rd!#$",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe("P@ssw0rd!#$");
    });

    it("should accept password with multiple uppercase and lowercase letters", () => {
      const data = {
        email: "user@test.com",
        password: "ABCDefgh123",
        confirmPassword: "ABCDefgh123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe("ABCDefgh123");
    });

    it("should accept password with multiple digits", () => {
      const data = {
        email: "user@test.com",
        password: "Password1234567890",
        confirmPassword: "Password1234567890",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe("Password1234567890");
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION - VALID FORMATS
  // ==========================================================================

  describe("Email Validation - Valid Formats", () => {
    it("should accept standard email format", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.email).toBe("user@example.com");
    });

    it("should accept email with subdomain", () => {
      const data = {
        email: "user@mail.example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.email).toBe("user@mail.example.com");
    });

    it("should accept email with plus sign", () => {
      const data = {
        email: "user+test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.email).toBe("user+test@example.com");
    });

    it("should accept email with dots in local part", () => {
      const data = {
        email: "first.last@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.email).toBe("first.last@example.com");
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION - INVALID FORMATS (SHOULD FAIL)
  // ==========================================================================

  describe("Email Validation - Invalid Formats", () => {
    it("should reject empty email", () => {
      const data = {
        email: "",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const emailError = error.errors.find((e) => e.path[0] === "email");
          expect(emailError?.message).toBe("Email jest wymagany");
        }
      }
    });

    it("should reject email without @ symbol", () => {
      const data = {
        email: "userexample.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const emailError = error.errors.find((e) => e.path[0] === "email");
          expect(emailError?.message).toBe("Nieprawidłowy format email");
        }
      }
    });

    it("should reject email without domain", () => {
      const data = {
        email: "user@",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email without local part", () => {
      const data = {
        email: "@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // PASSWORD VALIDATION - COMPLEXITY REQUIREMENTS
  // ==========================================================================

  describe("Password Validation - Complexity Requirements", () => {
    it("should reject password shorter than 8 characters", () => {
      const data = {
        email: "user@example.com",
        password: "Pass123",
        confirmPassword: "Pass123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi mieć co najmniej 8 znaków");
        }
      }
    });

    it("should reject password with 7 characters (boundary - 1)", () => {
      const data = {
        email: "user@example.com",
        password: "Pass123",
        confirmPassword: "Pass123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password without lowercase letter", () => {
      const data = {
        email: "user@example.com",
        password: "PASSWORD123",
        confirmPassword: "PASSWORD123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password without uppercase letter", () => {
      const data = {
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password without digit", () => {
      const data = {
        email: "user@example.com",
        password: "PasswordOnly",
        confirmPassword: "PasswordOnly",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi zawierać małą literę, dużą literę i cyfrę");
        }
      }
    });

    it("should reject password missing multiple requirements (no uppercase, no digit)", () => {
      const data = {
        email: "user@example.com",
        password: "passwordonly",
        confirmPassword: "passwordonly",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password with only lowercase and uppercase (no digit)", () => {
      const data = {
        email: "user@example.com",
        password: "PasswordOnly",
        confirmPassword: "PasswordOnly",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject empty password", () => {
      const data = {
        email: "user@example.com",
        password: "",
        confirmPassword: "",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // CONFIRM PASSWORD VALIDATION
  // ==========================================================================

  describe("Confirm Password Validation", () => {
    it("should reject when confirmPassword is empty", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const confirmError = error.errors.find((e) => e.path[0] === "confirmPassword");
          expect(confirmError).toBeDefined();
        }
      }
    });

    it("should reject when passwords do not match", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password456",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const confirmError = error.errors.find((e) => e.path[0] === "confirmPassword");
          expect(confirmError?.message).toBe("Hasła nie są identyczne");
        }
      }
    });

    it("should reject when passwords differ by case", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "password123",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject when passwords differ by trailing space", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123 ",
        acceptTerms: true,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should accept when both passwords match exactly", () => {
      const data = {
        email: "user@example.com",
        password: "Password123!@#",
        confirmPassword: "Password123!@#",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe(result.confirmPassword);
    });
  });

  // ==========================================================================
  // ACCEPT TERMS VALIDATION
  // ==========================================================================

  describe("Accept Terms Validation", () => {
    it("should reject when acceptTerms is false", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: false,
      };

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);

      try {
        registerFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          const termsError = error.errors.find((e) => e.path[0] === "acceptTerms");
          expect(termsError?.message).toBe("Musisz zaakceptować regulamin");
        }
      }
    });

    it("should accept when acceptTerms is true", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.acceptTerms).toBe(true);
    });

    it("should reject when acceptTerms is missing", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      } as unknown as RegisterFormData;

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // MULTIPLE VALIDATION ERRORS
  // ==========================================================================

  describe("Multiple Validation Errors", () => {
    it("should return multiple errors when multiple fields are invalid", () => {
      const data = {
        email: "",
        password: "weak",
        confirmPassword: "different",
        acceptTerms: false,
      };

      try {
        registerFormSchema.parse(data);
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors.length).toBeGreaterThan(0);

          // Should have errors for email, password, confirmPassword, acceptTerms
          const emailError = error.errors.find((e) => e.path[0] === "email");
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          const termsError = error.errors.find((e) => e.path[0] === "acceptTerms");

          expect(emailError).toBeDefined();
          expect(passwordError).toBeDefined();
          expect(termsError).toBeDefined();
        }
      }
    });

    it("should return both password complexity error and mismatch error", () => {
      const data = {
        email: "user@example.com",
        password: "weak",
        confirmPassword: "different",
        acceptTerms: true,
      };

      try {
        registerFormSchema.parse(data);
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
  });

  // ==========================================================================
  // EDGE CASES AND TYPE SAFETY
  // ==========================================================================

  describe("Edge Cases and Type Safety", () => {
    it("should reject null email", () => {
      const data = {
        email: null,
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      } as unknown as RegisterFormData;

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined password", () => {
      const data = {
        email: "user@example.com",
        password: undefined,
        confirmPassword: "Password123",
        acceptTerms: true,
      } as unknown as RegisterFormData;

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject number as acceptTerms", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: 1,
      } as unknown as RegisterFormData;

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject string 'true' as acceptTerms", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: "true",
      } as unknown as RegisterFormData;

      expect(() => registerFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should ignore extra fields not in schema", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
        extraField: "should be ignored",
      } as unknown as RegisterFormData;

      const result = registerFormSchema.parse(data);

      expect((result as Record<string, unknown>).extraField).toBeUndefined();
    });

    it("should handle very long password", () => {
      const longPassword = "Password123" + "a".repeat(100);
      const data = {
        email: "user@example.com",
        password: longPassword,
        confirmPassword: longPassword,
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      expect(result.password).toBe(longPassword);
    });
  });

  // ==========================================================================
  // SAFEPARSE (NON-THROWING VALIDATION)
  // ==========================================================================

  describe("SafeParse (Non-throwing validation)", () => {
    it("should return success:true for valid data using safeParse", () => {
      const data = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("Password123");
        expect(result.data.acceptTerms).toBe(true);
      }
    });

    it("should return success:false for invalid data using safeParse", () => {
      const data = {
        email: "invalid",
        password: "weak",
        confirmPassword: "different",
        acceptTerms: false,
      };

      const result = registerFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // TYPE INFERENCE
  // ==========================================================================

  describe("Type Inference", () => {
    it("should correctly infer RegisterFormData type", () => {
      const data: RegisterFormData = {
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        acceptTerms: true,
      };

      const result = registerFormSchema.parse(data);

      // TypeScript should allow these without errors
      const email: string = result.email;
      const password: string = result.password;
      const confirmPassword: string = result.confirmPassword;
      const acceptTerms: boolean = result.acceptTerms;

      expect(email).toBe("user@example.com");
      expect(password).toBe("Password123");
      expect(confirmPassword).toBe("Password123");
      expect(acceptTerms).toBe(true);
    });
  });
});
