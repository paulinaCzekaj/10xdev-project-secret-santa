import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordForm from "../ResetPasswordForm";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock window.location.href
const originalLocation = window.location;
delete (window as Window & typeof globalThis).location;
window.location = { ...originalLocation, href: "" } as Location;

// Mock hooks
let mockTokenVerification: {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
} = {
  isValid: true,
  isLoading: false,
  error: null,
};

let mockResetPassword: {
  resetPassword: ReturnType<typeof vi.fn>;
  isSubmitting: boolean;
  error: string | null;
} = {
  resetPassword: vi.fn(),
  isSubmitting: false,
  error: null,
};

vi.mock("@/hooks/useTokenVerification", () => ({
  useTokenVerification: () => mockTokenVerification,
}));

vi.mock("@/hooks/useResetPassword", () => ({
  useResetPassword: () => mockResetPassword,
}));

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("ResetPasswordForm", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    window.location.href = "";

    // Reset mocks to default state
    mockTokenVerification = {
      isValid: true,
      isLoading: false,
      error: null,
    };

    mockResetPassword = {
      resetPassword: vi.fn(),
      isSubmitting: false,
      error: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // TOKEN VERIFICATION STATES
  // ===========================================================================

  describe("Token Verification States", () => {
    it("should show loading state while verifying token", () => {
      mockTokenVerification.isLoading = true;
      render(<ResetPasswordForm code="test-code" />);

      expect(screen.getByText("Weryfikowanie linku...")).toBeInTheDocument();
      expect(screen.getByText("Sprawdzamy ważność linku resetowania hasła.")).toBeInTheDocument();
    });

    it("should show error state when token is invalid", () => {
      mockTokenVerification.isValid = false;
      mockTokenVerification.error = "Token jest nieprawidłowy lub wygasł";
      render(<ResetPasswordForm code="invalid-code" />);

      expect(screen.getByText("Link nieprawidłowy")).toBeInTheDocument();
      expect(screen.getByText("Token jest nieprawidłowy lub wygasł")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /wygeneruj nowy link/i })).toBeInTheDocument();
    });

    it("should navigate to forgot-password page when clicking 'Generate new link' button", async () => {
      mockTokenVerification.isValid = false;
      mockTokenVerification.error = "Token jest nieprawidłowy lub wygasł";
      render(<ResetPasswordForm code="invalid-code" />);

      const generateButton = screen.getByRole("button", { name: /wygeneruj nowy link/i });
      await user.click(generateButton);

      expect(window.location.href).toBe("/forgot-password");
    });

    it("should show form when token is valid", () => {
      mockTokenVerification.isValid = true;
      mockTokenVerification.isLoading = false;
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByRole("heading", { name: "Ustaw nowe hasło" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Minimum 8 znaków")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Wprowadź hasło ponownie")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // RENDERING TESTS (FORM STATE)
  // ===========================================================================

  describe("Rendering - Form State", () => {
    it("should render the reset password form with all fields", () => {
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByRole("heading", { name: "Ustaw nowe hasło" })).toBeInTheDocument();
      expect(screen.getByText("Wprowadź nowe hasło dla swojego konta Secret Santa.")).toBeInTheDocument();
      expect(screen.getByText("Nowe hasło")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Minimum 8 znaków")).toBeInTheDocument();
      expect(screen.getByText("Potwierdź nowe hasło")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Wprowadź hasło ponownie")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ustaw nowe hasło/i })).toBeInTheDocument();
    });

    it("should render password requirements info", () => {
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByText("Wymagania hasła")).toBeInTheDocument();
      expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();
      expect(screen.getByText("Jedna mała litera (a-z)")).toBeInTheDocument();
      expect(screen.getByText("Jedna duża litera (A-Z)")).toBeInTheDocument();
      expect(screen.getByText("Jedna cyfra (0-9)")).toBeInTheDocument();
    });

    it("should have submit button disabled by default", () => {
      render(<ResetPasswordForm code="valid-code" />);

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe("Validation", () => {
    it("should show validation error for password shorter than 8 characters", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "Pass1");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi mieć co najmniej 8 znaków")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without lowercase letter", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "PASSWORD123");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without uppercase letter", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "password123");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without digit", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "PasswordABC");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error when passwords do not match", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password456");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();
      });
    });

    it("should show validation error when confirmPassword is empty", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      await user.type(confirmPasswordInput, "test");
      await user.clear(confirmPasswordInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Potwierdzenie hasła jest wymagane")).toBeInTheDocument();
      });
    });

    it("should clear validation errors when user corrects input", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "short");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi mieć co najmniej 8 znaków")).toBeInTheDocument();
      });

      await user.clear(passwordInput);
      await user.type(passwordInput, "ValidPassword123");

      await waitFor(() => {
        expect(screen.queryByText("Hasło musi mieć co najmniej 8 znaków")).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // USER INTERACTIONS
  // ===========================================================================

  describe("User Interactions", () => {
    it("should allow user to type in password fields", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      expect(passwordInput).toHaveValue("Password123");
      expect(confirmPasswordInput).toHaveValue("Password123");
    });

    it("should enable submit button when both passwords are valid and match", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      expect(submitButton).toBeDisabled();

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it("should disable all inputs during form submission", async () => {
      mockResetPassword.isSubmitting = true;
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustawianie hasła.../i });

      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // FORM SUBMISSION TESTS
  // ===========================================================================

  describe("Form Submission", () => {
    it("should submit form with valid data and redirect to login", async () => {
      const mockResetPasswordFn = vi.fn().mockResolvedValue(undefined);
      mockResetPassword.resetPassword = mockResetPasswordFn;

      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPasswordFn).toHaveBeenCalledWith({
          password: "Password123",
          confirmPassword: "Password123",
        });
      });
    });

    it("should display error message when password reset fails with token expired", async () => {
      mockResetPassword.error = "Token jest nieprawidłowy lub wygasł";
      const mockResetPasswordFn = vi.fn().mockRejectedValue(new Error("Token has expired or is invalid"));
      mockResetPassword.resetPassword = mockResetPasswordFn;

      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Token jest nieprawidłowy lub wygasł")).toBeInTheDocument();
      });
    });

    it("should display error message when password is invalid", async () => {
      mockResetPassword.error = "Hasło nie spełnia wymagań";
      const mockResetPasswordFn = vi.fn().mockRejectedValue(new Error("Invalid password"));
      mockResetPassword.resetPassword = mockResetPasswordFn;

      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Hasło nie spełnia wymagań")).toBeInTheDocument();
      });
    });

    it("should display error message when user not found", async () => {
      mockResetPassword.error = "Użytkownik nie istnieje";
      const mockResetPasswordFn = vi.fn().mockRejectedValue(new Error("User not found"));
      mockResetPassword.resetPassword = mockResetPasswordFn;

      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Użytkownik nie istnieje")).toBeInTheDocument();
      });
    });

    it("should handle network error gracefully", async () => {
      mockResetPassword.error = "Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.";
      const mockResetPasswordFn = vi.fn().mockRejectedValue(new Error("Network error"));
      mockResetPassword.resetPassword = mockResetPasswordFn;

      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");
      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.")
        ).toBeInTheDocument();
      });
    });

    it("should show API error persistently until next submission", async () => {
      mockResetPassword.error = "Token jest nieprawidłowy lub wygasł";
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByText("Token jest nieprawidłowy lub wygasł")).toBeInTheDocument();

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      await user.type(passwordInput, "NewPassword456");

      // Error should still be visible
      expect(screen.getByText("Token jest nieprawidłowy lub wygasł")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle very long passwords", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const longPassword = "P" + "a".repeat(100) + "1";
      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      await user.type(passwordInput, longPassword);
      await user.type(confirmPasswordInput, longPassword);

      expect(passwordInput).toHaveValue(longPassword);
      expect(confirmPasswordInput).toHaveValue(longPassword);
    });

    it("should handle password with special characters", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const specialPassword = "P@ssw0rd!#$%";
      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      await user.type(passwordInput, specialPassword);
      await user.type(confirmPasswordInput, specialPassword);

      expect(passwordInput).toHaveValue(specialPassword);
      expect(confirmPasswordInput).toHaveValue(specialPassword);

      // Should not show any validation errors for password complexity
      expect(screen.queryByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).not.toBeInTheDocument();
    });

    it("should handle password with spaces", async () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordWithSpaces = "Pass Word 123";
      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      await user.type(passwordInput, passwordWithSpaces);
      await user.type(confirmPasswordInput, passwordWithSpaces);

      expect(passwordInput).toHaveValue(passwordWithSpaces);
      expect(confirmPasswordInput).toHaveValue(passwordWithSpaces);
    });

    it("should accept code parameter passed as prop", () => {
      render(<ResetPasswordForm code="prop-code-123" />);

      expect(screen.getByRole("heading", { name: "Ustaw nowe hasło" })).toBeInTheDocument();
    });

    it("should accept accessToken parameter passed as prop", () => {
      render(<ResetPasswordForm accessToken="prop-token-abc" />);

      expect(screen.getByRole("heading", { name: "Ustaw nowe hasło" })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe("Accessibility", () => {
    it("should have proper labels for all form fields", () => {
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByText("Nowe hasło")).toBeInTheDocument();
      expect(screen.getByText("Potwierdź nowe hasło")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes on inputs", () => {
      render(<ResetPasswordForm code="valid-code" />);

      const passwordInput = screen.getByPlaceholderText("Minimum 8 znaków");
      const confirmPasswordInput = screen.getByPlaceholderText("Wprowadź hasło ponownie");

      expect(passwordInput).toHaveAttribute("autoComplete", "new-password");
      expect(confirmPasswordInput).toHaveAttribute("autoComplete", "new-password");
    });

    it("should have accessible submit button", () => {
      render(<ResetPasswordForm code="valid-code" />);

      const submitButton = screen.getByRole("button", { name: /ustaw nowe hasło/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("should show loading state in submit button during submission", () => {
      mockResetPassword.isSubmitting = true;
      render(<ResetPasswordForm code="valid-code" />);

      expect(screen.getByText("Ustawianie hasła...")).toBeInTheDocument();
    });

    it("should have accessible error state with icon", () => {
      mockTokenVerification.isValid = false;
      mockTokenVerification.error = "Token jest nieprawidłowy lub wygasł";
      render(<ResetPasswordForm code="invalid-code" />);

      expect(screen.getByText("Link nieprawidłowy")).toBeInTheDocument();
      expect(screen.getByText("Token jest nieprawidłowy lub wygasł")).toBeInTheDocument();
    });

    it("should have accessible loading state with spinner", () => {
      mockTokenVerification.isLoading = true;
      render(<ResetPasswordForm code="test-code" />);

      expect(screen.getByText("Weryfikowanie linku...")).toBeInTheDocument();
    });
  });
});
