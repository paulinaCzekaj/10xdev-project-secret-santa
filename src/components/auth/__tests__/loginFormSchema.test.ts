import { describe, it, expect } from "vitest";
import { loginFormSchema, type LoginFormData } from "../LoginForm";
import { ZodError } from "zod";

// ============================================================================
// UNIT TESTS FOR loginFormSchema (Zod Validation Schema)
// ============================================================================

describe("loginFormSchema", () => {
  // ==========================================================================
  // VALID INPUTS - SHOULD PASS VALIDATION
  // ==========================================================================

  describe("Valid Inputs", () => {
    it("should validate correct email and password", () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(validData);

      expect(result).toEqual(validData);
      expect(result.email).toBe("test@example.com");
      expect(result.password).toBe("password123");
    });

    it("should accept password with exactly 6 characters (boundary)", () => {
      const data = {
        email: "user@test.com",
        password: "123456",
      };

      const result = loginFormSchema.parse(data);

      expect(result.password).toBe("123456");
      expect(result.password.length).toBe(6);
    });

    it("should accept password with more than 6 characters", () => {
      const data = {
        email: "user@test.com",
        password: "verylongpassword123456789",
      };

      const result = loginFormSchema.parse(data);

      expect(result.password).toBe("verylongpassword123456789");
    });

    it("should accept password with special characters", () => {
      const data = {
        email: "user@test.com",
        password: "p@ssw0rd!#$%^&*()",
      };

      const result = loginFormSchema.parse(data);

      expect(result.password).toBe("p@ssw0rd!#$%^&*()");
    });

    it("should accept password with spaces", () => {
      const data = {
        email: "user@test.com",
        password: "pass word 123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.password).toBe("pass word 123");
    });

    it("should accept password with Unicode characters", () => {
      const data = {
        email: "user@test.com",
        password: "пароль123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.password).toBe("пароль123");
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION - VALID FORMATS
  // ==========================================================================

  describe("Email Validation - Valid Formats", () => {
    it("should accept standard email format", () => {
      const data = {
        email: "user@example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user@example.com");
    });

    it("should accept email with subdomain", () => {
      const data = {
        email: "user@mail.example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user@mail.example.com");
    });

    it("should accept email with plus sign", () => {
      const data = {
        email: "user+test@example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user+test@example.com");
    });

    it("should accept email with dots in local part", () => {
      const data = {
        email: "first.last@example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("first.last@example.com");
    });

    it("should accept email with numbers", () => {
      const data = {
        email: "user123@example456.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user123@example456.com");
    });

    it("should accept email with hyphens in domain", () => {
      const data = {
        email: "user@my-domain.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user@my-domain.com");
    });

    it("should accept email with country TLD", () => {
      const data = {
        email: "user@example.co.uk",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe("user@example.co.uk");
    });

    it("should accept very long valid email", () => {
      const longLocal = "a".repeat(64);
      const longEmail = `${longLocal}@example.com`;

      const data = {
        email: longEmail,
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      expect(result.email).toBe(longEmail);
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION - INVALID FORMATS (SHOULD FAIL)
  // ==========================================================================

  describe("Email Validation - Invalid Formats", () => {
    it("should reject empty email", () => {
      const data = {
        email: "",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Email jest wymagany");
        }
      }
    });

    it("should reject email without @ symbol", () => {
      const data = {
        email: "userexample.com",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Nieprawidłowy format email");
        }
      }
    });

    it("should reject email without domain", () => {
      const data = {
        email: "user@",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Nieprawidłowy format email");
        }
      }
    });

    it("should reject email without local part", () => {
      const data = {
        email: "@example.com",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Nieprawidłowy format email");
        }
      }
    });

    it("should reject email with spaces", () => {
      const data = {
        email: "user @example.com",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email with multiple @ symbols", () => {
      const data = {
        email: "user@@example.com",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email without TLD", () => {
      const data = {
        email: "user@example",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject plain text as email", () => {
      const data = {
        email: "plaintext",
        password: "password123",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ==========================================================================
  // PASSWORD VALIDATION - INVALID INPUTS (SHOULD FAIL)
  // ==========================================================================

  describe("Password Validation - Invalid Inputs", () => {
    it("should reject empty password", () => {
      const data = {
        email: "user@example.com",
        password: "",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
        }
      }
    });

    it("should reject password with less than 6 characters", () => {
      const data = {
        email: "user@example.com",
        password: "12345",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
        }
      }
    });

    it("should reject password with 1 character", () => {
      const data = {
        email: "user@example.com",
        password: "a",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject password with 5 characters (boundary - 1)", () => {
      const data = {
        email: "user@example.com",
        password: "abcde",
      };

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);

      try {
        loginFormSchema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].path[0]).toBe("password");
          expect(error.errors[0].message).toBe("Hasło musi mieć co najmniej 6 znaków");
        }
      }
    });
  });

  // ==========================================================================
  // MULTIPLE VALIDATION ERRORS
  // ==========================================================================

  describe("Multiple Validation Errors", () => {
    it("should return both email and password errors when both invalid", () => {
      const data = {
        email: "",
        password: "123",
      };

      try {
        loginFormSchema.parse(data);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          // Empty email generates multiple errors (min length + email format)
          expect(error.errors.length).toBeGreaterThan(0);

          // Find email error
          const emailError = error.errors.find((e) => e.path[0] === "email");
          expect(emailError).toBeDefined();
          expect(emailError?.message).toBe("Email jest wymagany");

          // Find password error
          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError).toBeDefined();
          expect(passwordError?.message).toBe("Hasło musi mieć co najmniej 6 znaków");
        }
      }
    });

    it("should return both errors when email invalid and password too short", () => {
      const data = {
        email: "invalid-email",
        password: "12345",
      };

      try {
        loginFormSchema.parse(data);
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors).toHaveLength(2);

          const emailError = error.errors.find((e) => e.path[0] === "email");
          expect(emailError?.message).toBe("Nieprawidłowy format email");

          const passwordError = error.errors.find((e) => e.path[0] === "password");
          expect(passwordError?.message).toBe("Hasło musi mieć co najmniej 6 znaków");
        }
      }
    });
  });

  // ==========================================================================
  // EDGE CASES AND TYPE SAFETY
  // ==========================================================================

  describe("Edge Cases and Type Safety", () => {
    it("should reject missing email field", () => {
      const data = {
        password: "password123",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject missing password field", () => {
      const data = {
        email: "user@example.com",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject null email", () => {
      const data = {
        email: null,
        password: "password123",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject null password", () => {
      const data = {
        email: "user@example.com",
        password: null,
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined email", () => {
      const data = {
        email: undefined,
        password: "password123",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined password", () => {
      const data = {
        email: "user@example.com",
        password: undefined,
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject number as email", () => {
      const data = {
        email: 12345,
        password: "password123",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject number as password", () => {
      const data = {
        email: "user@example.com",
        password: 123456,
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject object as email", () => {
      const data = {
        email: { value: "test@example.com" },
        password: "password123",
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject array as password", () => {
      const data = {
        email: "user@example.com",
        password: ["p", "a", "s", "s"],
      } as any;

      expect(() => loginFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should ignore extra fields not in schema", () => {
      const data = {
        email: "user@example.com",
        password: "password123",
        extraField: "should be ignored",
      } as any;

      const result = loginFormSchema.parse(data);

      expect(result).toEqual({
        email: "user@example.com",
        password: "password123",
      });
      expect((result as any).extraField).toBeUndefined();
    });
  });

  // ==========================================================================
  // SAFEPARSING (NON-THROWING VALIDATION)
  // ==========================================================================

  describe("SafeParse (Non-throwing validation)", () => {
    it("should return success:true for valid data using safeParse", () => {
      const data = {
        email: "user@example.com",
        password: "password123",
      };

      const result = loginFormSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("password123");
      }
    });

    it("should return success:false for invalid data using safeParse", () => {
      const data = {
        email: "invalid",
        password: "123",
      };

      const result = loginFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it("should provide detailed error info in safeParse result", () => {
      const data = {
        email: "",
        password: "abc",
      };

      const result = loginFormSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.errors.find((e) => e.path[0] === "email");
        const passwordError = result.error.errors.find((e) => e.path[0] === "password");

        expect(emailError?.message).toBe("Email jest wymagany");
        expect(passwordError?.message).toBe("Hasło musi mieć co najmniej 6 znaków");
      }
    });
  });

  // ==========================================================================
  // TYPE INFERENCE
  // ==========================================================================

  describe("Type Inference", () => {
    it("should correctly infer LoginFormData type", () => {
      const data: LoginFormData = {
        email: "user@example.com",
        password: "password123",
      };

      const result = loginFormSchema.parse(data);

      // TypeScript should allow these without errors
      const email: string = result.email;
      const password: string = result.password;

      expect(email).toBe("user@example.com");
      expect(password).toBe("password123");
    });
  });
});
