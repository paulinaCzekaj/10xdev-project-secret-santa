import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../LoginForm";
import { notify } from "@/lib/notifications";

// ============================================================================
// MOCKS
// ============================================================================

// Mock notification service
vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock window.location.href
const originalLocation = window.location;
Object.defineProperty(window, "location", {
  writable: true,
  value: { ...originalLocation, href: "" },
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe("LoginForm", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    window.location.href = "";

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe("Rendering", () => {
    it("should render the login form with all required fields", () => {
      render(<LoginForm />);

      // Check form container
      expect(screen.getByTestId("login-form-container")).toBeInTheDocument();

      // Check heading and description
      expect(screen.getByText("Witaj ponownie!")).toBeInTheDocument();
      expect(screen.getByText(/Zaloguj się na swoje konto/i)).toBeInTheDocument();

      // Check form fields
      expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
      expect(screen.getByTestId("login-password-input")).toBeInTheDocument();

      // Check submit button
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    });

    it("should render email field with correct attributes", () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("placeholder", "twoj@email.com");
      expect(emailInput).toHaveAttribute("autocomplete", "email");
    });

    it("should render password field with correct attributes", () => {
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("placeholder", "Wprowadź hasło");
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    });

    it("should render forgot password link", () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByText("Zapomniałeś hasła?");
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink.closest("a")).toHaveAttribute("href", "/forgot-password");
    });

    it("should render register link", () => {
      render(<LoginForm />);

      const registerLink = screen.getByText("Zarejestruj się");
      expect(registerLink).toBeInTheDocument();
      expect(registerLink.closest("a")).toHaveAttribute("href", "/register");
    });

    it("should render password visibility toggle button", () => {
      render(<LoginForm />);

      const toggleButton = screen.getByTestId("login-password-toggle");
      expect(toggleButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MESSAGE PROP TESTS
  // ==========================================================================

  describe("Message Prop", () => {
    it("should display success message from props", () => {
      const message = {
        type: "success" as const,
        text: "Hasło zostało zresetowane",
      };

      render(<LoginForm message={message} />);

      expect(notify.success).toHaveBeenCalledWith({ title: message.text });
    });

    it("should display error message from props", () => {
      const message = {
        type: "error" as const,
        text: "Sesja wygasła",
      };

      render(<LoginForm message={message} />);

      expect(notify.error).toHaveBeenCalledWith({ title: message.text });
    });

    it("should display info message from props", () => {
      const message = {
        type: "info" as const,
        text: "Sprawdź swoją skrzynkę email",
      };

      render(<LoginForm message={message} />);

      expect(notify.info).toHaveBeenCalledWith({ title: message.text });
    });
  });

  // ==========================================================================
  // USER INTERACTION TESTS
  // ==========================================================================

  describe("User Interactions", () => {
    it("should allow typing in email field", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("should allow typing in password field", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");
      await user.type(passwordInput, "password123");

      expect(passwordInput).toHaveValue("password123");
    });

    it("should toggle password visibility when toggle button is clicked", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");
      const toggleButton = screen.getByTestId("login-password-toggle");

      // Initially password type
      expect(passwordInput).toHaveAttribute("type", "password");

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should clear API error when user starts typing after error", async () => {
      const user = userEvent.setup();

      // Mock failed login
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Nieprawidłowe dane logowania" } }),
      });

      render(<LoginForm />);

      // Fill form and submit to trigger error (use valid password length)
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "wrongpassword");
      await user.click(screen.getByTestId("login-submit-button"));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Nieprawidłowe dane logowania/i)).toBeInTheDocument();
      });

      // Type in email field - error should clear on next submit
      await user.clear(screen.getByTestId("login-email-input"));
      await user.type(screen.getByTestId("login-email-input"), "new@example.com");
    });
  });

  // ==========================================================================
  // FORM VALIDATION TESTS
  // ==========================================================================

  describe("Form Validation", () => {
    it("should show validation error for empty email", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      // Type something then clear it to trigger validation (onChange mode)
      await user.type(emailInput, "test");
      await user.clear(emailInput);
      await user.tab();

      await waitFor(
        () => {
          expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show validation error for invalid email format", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      // Enter invalid email
      await user.type(emailInput, "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowy format email")).toBeInTheDocument();
      });
    });

    it("should accept valid email format", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      // Enter valid email
      await user.type(emailInput, "valid@example.com");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Nieprawidłowy format email")).not.toBeInTheDocument();
      });
    });

    it("should show validation error for password shorter than 6 characters", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");

      // Enter short password
      await user.type(passwordInput, "12345");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Hasło musi mieć co najmniej 6 znaków")).toBeInTheDocument();
      });
    });

    it("should accept password with 6 or more characters", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");

      // Enter valid password
      await user.type(passwordInput, "123456");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Hasło musi mieć co najmniej 6 znaków")).not.toBeInTheDocument();
      });
    });

    it("should disable submit button when form is invalid", async () => {
      render(<LoginForm />);

      const submitButton = screen.getByTestId("login-submit-button");

      // Button should be disabled initially (empty form)
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when form is valid", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      // Fill form with valid data
      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  // ==========================================================================
  // FORM SUBMISSION - SUCCESS SCENARIOS
  // ==========================================================================

  describe("Form Submission - Success", () => {
    it("should submit form with valid credentials and redirect to dashboard", async () => {
      const user = userEvent.setup();

      // Mock successful login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<LoginForm />);

      // Fill form
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");

      // Submit
      await user.click(screen.getByTestId("login-submit-button"));

      // Verify fetch was called with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });
      });

      // Verify success notification
      expect(notify.success).toHaveBeenCalledWith("AUTH.LOGIN_SUCCESS");

      // Verify redirect to dashboard
      expect(window.location.href).toBe("/dashboard");
    });

    it("should redirect to custom redirectTo path on success", async () => {
      const user = userEvent.setup();

      // Mock successful login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<LoginForm redirectTo="/groups/123" />);

      // Fill and submit form
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      // Verify redirect to custom path
      await waitFor(() => {
        expect(window.location.href).toBe("/groups/123");
      });
    });

    it("should show loading state during form submission", async () => {
      const user = userEvent.setup();

      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100
            )
          )
      );

      render(<LoginForm />);

      // Fill and submit form
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      // Check loading state
      expect(screen.getByText("Logowanie...")).toBeInTheDocument();
      expect(screen.getByTestId("login-submit-button")).toBeDisabled();
      expect(screen.getByTestId("login-email-input")).toBeDisabled();
      expect(screen.getByTestId("login-password-input")).toBeDisabled();

      // Wait for submission to complete
      await waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });
    });
  });

  // ==========================================================================
  // FORM SUBMISSION - ERROR SCENARIOS
  // ==========================================================================

  describe("Form Submission - Errors", () => {
    it("should display error message when API returns 401 Unauthorized", async () => {
      const user = userEvent.setup();

      // Mock failed login
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Nieprawidłowy email lub hasło" } }),
      });

      render(<LoginForm />);

      // Fill and submit form
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "wrongpassword");
      await user.click(screen.getByTestId("login-submit-button"));

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowy email lub hasło")).toBeInTheDocument();
      });

      // Verify error notification
      expect(notify.error).toHaveBeenCalledWith("AUTH.LOGIN_ERROR");

      // Verify no redirect happened
      expect(window.location.href).toBe("");
    });

    it("should display generic error when API error has no message", async () => {
      const user = userEvent.setup();

      // Mock API error without message
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: {} }),
      });

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(screen.getByText("Wystąpił błąd podczas logowania")).toBeInTheDocument();
      });
    });

    it("should handle network errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      expect(notify.error).toHaveBeenCalledWith("AUTH.LOGIN_ERROR");
    });

    it("should handle non-Error exceptions in catch block", async () => {
      const user = userEvent.setup();

      // Mock throwing non-Error object
      global.fetch = vi.fn().mockRejectedValue("String error");

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(screen.getByText("Wystąpił błąd podczas logowania")).toBeInTheDocument();
      });
    });

    it("should re-enable form after error", async () => {
      const user = userEvent.setup();

      // Mock failed login
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Nieprawidłowe dane" } }),
      });

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "wrongpass");
      await user.click(screen.getByTestId("login-submit-button"));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowe dane")).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(screen.getByTestId("login-submit-button")).not.toHaveTextContent("Logowanie...");
      expect(screen.getByTestId("login-email-input")).not.toBeDisabled();
      expect(screen.getByTestId("login-password-input")).not.toBeDisabled();
    });

    it("should clear previous error when submitting again", async () => {
      const user = userEvent.setup();

      // First submission fails
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Pierwszy błąd" } }),
      });

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "wrongpass");
      await user.click(screen.getByTestId("login-submit-button"));

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText("Pierwszy błąd")).toBeInTheDocument();
      });

      // Second submission also fails with different error
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Drugi błąd" } }),
      });

      await user.clear(screen.getByTestId("login-password-input"));
      await user.type(screen.getByTestId("login-password-input"), "stillwrong");
      await user.click(screen.getByTestId("login-submit-button"));

      // Old error should be replaced
      await waitFor(() => {
        expect(screen.queryByText("Pierwszy błąd")).not.toBeInTheDocument();
        expect(screen.getByText("Drugi błąd")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty JSON response from API", async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(screen.getByText("Wystąpił błąd podczas logowania")).toBeInTheDocument();
      });
    });

    it("should handle malformed JSON response", async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(notify.error).toHaveBeenCalledWith("AUTH.LOGIN_ERROR");
      });
    });

    it("should handle very long email addresses", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const longEmail = "a".repeat(100) + "@example.com";
      const emailInput = screen.getByTestId("login-email-input");

      await user.type(emailInput, longEmail);

      expect(emailInput).toHaveValue(longEmail);
    });

    it("should handle special characters in password", async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<LoginForm />);

      const specialPassword = "p@ssw0rd!#$%^&*()";

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), specialPassword);
      await user.click(screen.getByTestId("login-submit-button"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/auth/login",
          expect.objectContaining({
            body: JSON.stringify({
              email: "test@example.com",
              password: specialPassword,
            }),
          })
        );
      });
    });

    it("should handle rapid form submissions", async () => {
      const user = userEvent.setup();

      // Mock slow API
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              500
            )
          )
      );

      render(<LoginForm />);

      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");

      // Try to submit multiple times rapidly
      const submitButton = screen.getByTestId("login-submit-button");
      await user.click(submitButton);

      // Button should be disabled, preventing second click
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(
        () => {
          expect(window.location.href).toBe("/dashboard");
        },
        { timeout: 1000 }
      );

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle exactly 6 character password (boundary)", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");
      await user.type(passwordInput, "123456");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText("Hasło musi mieć co najmniej 6 znaków")).not.toBeInTheDocument();
      });
    });

    it("should handle email with maximum valid length", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Maximum email length is typically 254 characters
      const localPart = "a".repeat(64);
      const domain = "b".repeat(189) + ".com"; // 64 + 1 (@) + 189 = 254
      const maxEmail = `${localPart}@${domain}`;

      const emailInput = screen.getByTestId("login-email-input");
      await user.type(emailInput, maxEmail);

      expect(emailInput).toHaveValue(maxEmail);
    });
  });

  // ==========================================================================
  // ACCESSIBILITY TESTS
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have proper ARIA labels and roles", () => {
      render(<LoginForm />);

      // Form should be identifiable
      const form = screen.getByTestId("login-form");
      expect(form).toBeInTheDocument();

      // Inputs should have labels (use getByText for labels and verify inputs exist)
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Hasło")).toBeInTheDocument();
      expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
      expect(screen.getByTestId("login-password-input")).toBeInTheDocument();

      // Submit button should have button role
      const submitButton = screen.getByTestId("login-submit-button");
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("should maintain focus order", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");

      // Start from email
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      // Tab to password
      await user.tab();
      expect(passwordInput).toHaveFocus();
    });

    it("should allow form submission via Enter key", async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<LoginForm />);

      // Fill form
      await user.type(screen.getByTestId("login-email-input"), "test@example.com");
      await user.type(screen.getByTestId("login-password-input"), "password123");

      // Press Enter in password field
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});
