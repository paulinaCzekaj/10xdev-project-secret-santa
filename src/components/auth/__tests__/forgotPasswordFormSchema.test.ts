import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { forgotPasswordFormSchema } from "../ForgotPasswordForm";

// =============================================================================
// FORGOT PASSWORD FORM SCHEMA TESTS
// =============================================================================

describe("forgotPasswordFormSchema", () => {
  // ===========================================================================
  // VALID INPUTS
  // ===========================================================================

  describe("Valid Inputs", () => {
    it("should validate correct email", () => {
      const validData = {
        email: "test@example.com",
      };

      const result = forgotPasswordFormSchema.parse(validData);

      expect(result).toEqual(validData);
    });

    it("should accept email with subdomain", () => {
      const data = {
        email: "user@mail.example.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("user@mail.example.com");
    });

    it("should accept email with plus sign", () => {
      const data = {
        email: "user+tag@example.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("user+tag@example.com");
    });

    it("should accept email with dots in local part", () => {
      const data = {
        email: "first.last@example.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("first.last@example.com");
    });

    it("should accept email with numbers", () => {
      const data = {
        email: "user123@example456.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("user123@example456.com");
    });

    it("should accept email with hyphens in domain", () => {
      const data = {
        email: "user@my-domain.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("user@my-domain.com");
    });

    it("should accept email with short TLD", () => {
      const data = {
        email: "user@example.co",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe("user@example.co");
    });
  });

  // ===========================================================================
  // EMAIL VALIDATION
  // ===========================================================================

  describe("Email Validation", () => {
    it("should reject empty email", () => {
      const data = {
        email: "",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        forgotPasswordFormSchema.parse(data);
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.errors.length).toBeGreaterThan(0);
        const emailError = zodError.errors.find((e) => e.path[0] === "email");
        expect(emailError).toBeDefined();
        expect(emailError?.message).toBe("Email jest wymagany");
      }
    });

    it("should reject email without @ symbol", () => {
      const data = {
        email: "invalidemail.com",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);

      try {
        forgotPasswordFormSchema.parse(data);
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        const emailError = zodError.errors.find((e) => e.path[0] === "email");
        expect(emailError?.message).toBe("Nieprawidłowy format email");
      }
    });

    it("should reject email without domain", () => {
      const data = {
        email: "user@",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email without local part", () => {
      const data = {
        email: "@example.com",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email with spaces", () => {
      const data = {
        email: "user name@example.com",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email with multiple @ symbols", () => {
      const data = {
        email: "user@@example.com",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject email without TLD", () => {
      const data = {
        email: "user@example",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject plaintext without domain", () => {
      const data = {
        email: "justtext",
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });
  });

  // ===========================================================================
  // EDGE CASES AND TYPE SAFETY
  // ===========================================================================

  describe("Edge Cases and Type Safety", () => {
    it("should reject null email", () => {
      const data = {
        email: null,
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject undefined email", () => {
      const data = {
        email: undefined,
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject number as email", () => {
      const data = {
        email: 12345,
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject boolean as email", () => {
      const data = {
        email: true,
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject array as email", () => {
      const data = {
        email: ["test@example.com"],
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject object as email", () => {
      const data = {
        email: { value: "test@example.com" },
      };

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should ignore extra fields not in schema", () => {
      const data = {
        email: "test@example.com",
        extraField: "should be ignored",
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result).toEqual({ email: "test@example.com" });
      expect(result).not.toHaveProperty("extraField");
    });

    it("should handle very long email addresses", () => {
      const longLocalPart = "a".repeat(64);
      const longDomain = "b".repeat(60) + ".com";
      const longEmail = longLocalPart + "@" + longDomain;

      const data = {
        email: longEmail,
      };

      const result = forgotPasswordFormSchema.parse(data);

      expect(result.email).toBe(longEmail);
    });

    it("should reject missing email field", () => {
      const data = {};

      expect(() => forgotPasswordFormSchema.parse(data)).toThrow(ZodError);
    });

    it("should reject completely empty object", () => {
      expect(() => forgotPasswordFormSchema.parse({})).toThrow(ZodError);
    });
  });

  // ===========================================================================
  // SAFEPARSE (NON-THROWING VALIDATION)
  // ===========================================================================

  describe("SafeParse (Non-throwing validation)", () => {
    it("should return success:true for valid data using safeParse", () => {
      const validData = {
        email: "test@example.com",
      };

      const result = forgotPasswordFormSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should return success:false for invalid data using safeParse", () => {
      const invalidData = {
        email: "invalid-email",
      };

      const result = forgotPasswordFormSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it("should provide detailed error info in safeParse result", () => {
      const invalidData = {
        email: "",
      };

      const result = forgotPasswordFormSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
        expect(result.error.errors[0].path).toContain("email");
      }
    });
  });

  // ===========================================================================
  // TYPE INFERENCE
  // ===========================================================================

  describe("Type Inference", () => {
    it("should correctly infer ForgotPasswordFormData type", () => {
      const data = {
        email: "test@example.com",
      };

      const result = forgotPasswordFormSchema.parse(data);

      // Type assertion to verify the type structure
      const typedResult: { email: string } = result;
      expect(typedResult.email).toBe("test@example.com");
    });
  });
});
