import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "../RegisterForm";
import { notify } from "@/lib/notifications";

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
delete (window as any).location;
window.location = { href: "" } as any;

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("RegisterForm", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    window.location.href = "";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe("Rendering", () => {
    it("should render the registration form with all fields", () => {
      render(<RegisterForm />);

      expect(screen.getByText("Dołącz do Secret Santa!")).toBeInTheDocument();
      expect(screen.getByText("Utwórz konto i zacznij organizować wymiany prezentów.")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("twoj@email.com")).toBeInTheDocument();
      expect(screen.getByText("Hasło")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Wprowadź hasło")).toBeInTheDocument();
      expect(screen.getByText("Potwierdź hasło")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Potwierdź hasło")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zarejestruj się/i })).toBeInTheDocument();
    });

    it("should render password requirements list", () => {
      render(<RegisterForm />);

      expect(screen.getByText("Hasło musi zawierać:")).toBeInTheDocument();
      expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();
      expect(screen.getByText("Jedną małą literę (a-z)")).toBeInTheDocument();
      expect(screen.getByText("Jedną dużą literę (A-Z)")).toBeInTheDocument();
      expect(screen.getByText("Jedną cyfrę (0-9)")).toBeInTheDocument();
    });

    it("should render terms acceptance checkbox", () => {
      render(<RegisterForm />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText(/akceptuję/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /regulamin/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /politykę prywatności/i })).toBeInTheDocument();
    });

    it("should render sign in link", () => {
      render(<RegisterForm />);

      expect(screen.getByText("Masz już konto?")).toBeInTheDocument();
      const signInLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute("href", "/login");
    });

    it("should have submit button disabled by default", () => {
      render(<RegisterForm />);

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe("Validation", () => {
    it("should show validation error for invalid email format", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowy format email")).toBeInTheDocument();
      });
    });

    it("should show validation error for empty email", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test");
      await user.clear(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      });
    });

    it("should show validation error for password shorter than 8 characters", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      await user.type(passwordInput, "Pass1");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi mieć co najmniej 8 znaków")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without lowercase letter", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      await user.type(passwordInput, "PASSWORD123");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without uppercase letter", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      await user.type(passwordInput, "password123");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error for password without digit", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      await user.type(passwordInput, "PasswordABC");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).toBeInTheDocument();
      });
    });

    it("should show validation error when passwords do not match", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password456");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasła nie są identyczne")).toBeInTheDocument();
      });
    });

    it("should show validation error when confirmPassword is empty", async () => {
      render(<RegisterForm />);

      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      await user.type(confirmPasswordInput, "test");
      await user.clear(confirmPasswordInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Potwierdzenie hasła jest wymagane")).toBeInTheDocument();
      });
    });

    it("should keep submit button disabled when terms are not accepted", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      await waitFor(() => {
        // Submit button should still be disabled when terms not accepted
        const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it("should clear validation errors when user corrects input", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "invalid");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowy format email")).toBeInTheDocument();
      });

      await user.clear(emailInput);
      await user.type(emailInput, "valid@example.com");

      await waitFor(() => {
        expect(screen.queryByText("Nieprawidłowy format email")).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // PASSWORD REQUIREMENTS VISUAL FEEDBACK
  // ===========================================================================

  describe("Password Requirements Visual Feedback", () => {
    it("should update password requirements as user types", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");

      // Initially all requirements should show unmet state (○)
      expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();

      // Type password that meets length requirement
      await user.type(passwordInput, "12345678");

      // Type password that meets all requirements
      await user.clear(passwordInput);
      await user.type(passwordInput, "Password123");

      // All requirements should be visible
      expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();
      expect(screen.getByText("Jedną małą literę (a-z)")).toBeInTheDocument();
      expect(screen.getByText("Jedną dużą literę (A-Z)")).toBeInTheDocument();
      expect(screen.getByText("Jedną cyfrę (0-9)")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // USER INTERACTIONS
  // ===========================================================================

  describe("User Interactions", () => {
    it("should allow user to type in all input fields", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");

      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("Password123");
      expect(confirmPasswordInput).toHaveValue("Password123");
    });

    it("should allow user to check and uncheck terms checkbox", async () => {
      render(<RegisterForm />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("should show info notification when clicking terms link", async () => {
      render(<RegisterForm />);

      const termsButton = screen.getByRole("button", { name: /regulamin/i });
      await user.click(termsButton);

      expect(notify.info).toHaveBeenCalledWith("AUTH.TERMS_INFO");
    });

    it("should show info notification when clicking privacy policy link", async () => {
      render(<RegisterForm />);

      const privacyButton = screen.getByRole("button", { name: /politykę prywatności/i });
      await user.click(privacyButton);

      expect(notify.info).toHaveBeenCalledWith("AUTH.PRIVACY_INFO");
    });

    it("should enable submit button when all fields are valid and terms accepted", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      expect(submitButton).toBeDisabled();

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it("should disable all inputs during form submission", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              });
            }, 100);
          })
      );

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      // During submission
      await waitFor(() => {
        expect(screen.getByText("Tworzenie konta...")).toBeInTheDocument();
      });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(checkbox).toBeDisabled();
    });
  });

  // ===========================================================================
  // FORM SUBMISSION TESTS
  // ===========================================================================

  describe("Form Submission", () => {
    it("should submit form with valid data and redirect to dashboard", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "Password123",
          }),
        });
      });

      await waitFor(() => {
        expect(notify.success).toHaveBeenCalledWith("AUTH.REGISTER_SUCCESS");
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("should display error message when registration fails with 409 (email exists)", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            message: "Konto z tym adresem email już istnieje",
          },
        }),
      });

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "existing@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(notify.error).toHaveBeenCalledWith("AUTH.REGISTER_ERROR");
      });

      await waitFor(() => {
        expect(screen.getByText("Konto z tym adresem email już istnieje")).toBeInTheDocument();
      });
    });

    it("should display generic error message when API returns 500", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: "Internal server error",
          },
        }),
      });

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Internal server error")).toBeInTheDocument();
      });
    });

    it("should handle network error gracefully", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(notify.error).toHaveBeenCalledWith("AUTH.REGISTER_ERROR");
      });

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show API error persistently until next submission", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            message: "Konto z tym adresem email już istnieje",
          },
        }),
      });

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "existing@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Konto z tym adresem email już istnieje")).toBeInTheDocument();
      });

      // Error should persist even when user changes input
      await user.clear(emailInput);
      await user.type(emailInput, "newemail@example.com");

      // Error should still be visible
      expect(screen.getByText("Konto z tym adresem email już istnieje")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle very long email addresses", async () => {
      render(<RegisterForm />);

      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const emailInput = screen.getByPlaceholderText("twoj@email.com");

      await user.type(emailInput, longEmail);

      expect(emailInput).toHaveValue(longEmail);
    });

    it("should handle very long passwords", async () => {
      render(<RegisterForm />);

      const longPassword = "P" + "a".repeat(100) + "1";
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      await user.type(passwordInput, longPassword);
      await user.type(confirmPasswordInput, longPassword);

      expect(passwordInput).toHaveValue(longPassword);
      expect(confirmPasswordInput).toHaveValue(longPassword);
    });

    it("should prevent multiple submissions when button is clicked rapidly", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              });
            }, 100);
          })
      );

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      // Click submit button
      await user.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Wait for submission to complete
      await waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });
    });

    it("should handle password with special characters", async () => {
      render(<RegisterForm />);

      const specialPassword = "P@ssw0rd!#$%";
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      await user.type(passwordInput, specialPassword);
      await user.type(confirmPasswordInput, specialPassword);

      expect(passwordInput).toHaveValue(specialPassword);
      expect(confirmPasswordInput).toHaveValue(specialPassword);

      // Should not show any validation errors for password complexity
      expect(screen.queryByText("Hasło musi zawierać małą literę, dużą literę i cyfrę")).not.toBeInTheDocument();
    });

    it("should handle email with maximum valid length", async () => {
      render(<RegisterForm />);

      // Email max length is typically 254 characters
      const longLocalPart = "a".repeat(64);
      const longDomain = "b".repeat(60) + ".com";
      const maxEmail = longLocalPart + "@" + longDomain;

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, maxEmail);

      expect(emailInput).toHaveValue(maxEmail);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe("Accessibility", () => {
    it("should have proper labels for all form fields", () => {
      render(<RegisterForm />);

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Hasło")).toBeInTheDocument();
      expect(screen.getByText("Potwierdź hasło")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes on inputs", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("autoComplete", "email");
      expect(passwordInput).toHaveAttribute("autoComplete", "new-password");
      expect(confirmPasswordInput).toHaveAttribute("autoComplete", "new-password");
    });

    it("should have accessible submit button", () => {
      render(<RegisterForm />);

      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("should show loading state in submit button during submission", async () => {
      render(<RegisterForm />);

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              });
            }, 100);
          })
      );

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const passwordInput = screen.getByPlaceholderText("Wprowadź hasło");
      const confirmPasswordInput = screen.getByPlaceholderText("Potwierdź hasło");
      const checkbox = screen.getByRole("checkbox");
      const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "Password123");
      await user.type(confirmPasswordInput, "Password123");
      await user.click(checkbox);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Tworzenie konta...")).toBeInTheDocument();
      });
    });
  });
});
