import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordForm from "../ForgotPasswordForm";
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
delete (window as Window & typeof globalThis).location;
window.location = { href: "" } as Location & { href: string };

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("ForgotPasswordForm", () => {
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
  // RENDERING TESTS - FORM STATE
  // ===========================================================================

  describe("Rendering - Form State", () => {
    it("should render the forgot password form with all fields", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByRole("heading", { name: "Zapomniałeś hasła?" })).toBeInTheDocument();
      expect(
        screen.getByText("Nie martw się! Podaj swój adres email, a wyślemy Ci link do resetowania hasła.")
      ).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("twoj@email.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /wyślij link resetujący/i })).toBeInTheDocument();
    });

    it("should render sign in link", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByText("Pamiętasz hasło?")).toBeInTheDocument();
      const signInLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute("href", "/login");
    });

    it("should have submit button disabled by default", () => {
      render(<ForgotPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      expect(submitButton).toBeDisabled();
    });

    it("should render info box when user is logged in", () => {
      render(<ForgotPasswordForm isLoggedIn={true} />);

      expect(screen.getByText(/jesteś już zalogowany/i)).toBeInTheDocument();
      expect(screen.getByText(/możesz zmienić hasło w ustawieniach konta/i)).toBeInTheDocument();
    });

    it("should not render info box when user is not logged in", () => {
      render(<ForgotPasswordForm isLoggedIn={false} />);

      expect(screen.queryByText(/jesteś już zalogowany/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // RENDERING TESTS - SUCCESS STATE
  // ===========================================================================

  describe("Rendering - Success State", () => {
    it("should show success message after email is sent", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sprawdź swoją skrzynkę!" })).toBeInTheDocument();
      });

      expect(screen.getByText(/wysłaliśmy link do resetowania hasła na adres/i)).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should show info box in success state", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nie otrzymałeś emaila?")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/sprawdź folder spam. link wygasa po 1 godzinie/i)
      ).toBeInTheDocument();
    });

    it("should show back to login button in success state", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /wróć do logowania/i })).toBeInTheDocument();
      });
    });

    it("should navigate to login when clicking back to login button", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /wróć do logowania/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", { name: /wróć do logowania/i });
      await user.click(backButton);

      expect(window.location.href).toBe("/login");
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe("Validation", () => {
    it("should show validation error for invalid email format", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowy format email")).toBeInTheDocument();
      });
    });

    it("should show validation error for empty email", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test");
      await user.clear(emailInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Email jest wymagany")).toBeInTheDocument();
      });
    });

    it("should clear validation errors when user corrects input", async () => {
      render(<ForgotPasswordForm />);

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
  // USER INTERACTIONS
  // ===========================================================================

  describe("User Interactions", () => {
    it("should allow user to type in email field", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("should enable submit button when email is valid", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      expect(submitButton).toBeDisabled();

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it("should disable input during form submission", async () => {
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Wysyłanie...")).toBeInTheDocument();
      });

      expect(emailInput).toBeDisabled();
    });
  });

  // ===========================================================================
  // FORM SUBMISSION TESTS
  // ===========================================================================

  describe("Form Submission", () => {
    it("should submit form with valid email and show success", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        });
      });

      await waitFor(() => {
        expect(notify.success).toHaveBeenCalledWith("AUTH.PASSWORD_RESET_EMAIL_SENT");
      });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sprawdź swoją skrzynkę!" })).toBeInTheDocument();
      });
    });

    it("should display error message when API returns 404 (user not found)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            message: "Użytkownik z tym adresem email nie istnieje",
          },
        }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "nonexistent@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(notify.error).toHaveBeenCalledWith("AUTH.PASSWORD_RESET_ERROR");
      });

      await waitFor(() => {
        expect(screen.getByText("Użytkownik z tym adresem email nie istnieje")).toBeInTheDocument();
      });
    });

    it("should display error message when API returns 400 (bad request)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Nieprawidłowe dane wejściowe",
          },
        }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Nieprawidłowe dane wejściowe")).toBeInTheDocument();
      });
    });

    it("should display generic error message when API returns 500", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: "Wewnętrzny błąd serwera",
          },
        }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Wewnętrzny błąd serwera")).toBeInTheDocument();
      });
    });

    it("should handle network error gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(notify.error).toHaveBeenCalledWith("AUTH.PASSWORD_RESET_ERROR");
      });

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show API error persistently until next submission", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            message: "Użytkownik z tym adresem email nie istnieje",
          },
        }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "nonexistent@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Użytkownik z tym adresem email nie istnieje")).toBeInTheDocument();
      });

      // Error should persist even when user changes input
      await user.clear(emailInput);
      await user.type(emailInput, "newemail@example.com");

      // Error should still be visible
      expect(screen.getByText("Użytkownik z tym adresem email nie istnieje")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle very long email addresses", async () => {
      render(<ForgotPasswordForm />);

      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const emailInput = screen.getByPlaceholderText("twoj@email.com");

      await user.type(emailInput, longEmail);

      expect(emailInput).toHaveValue(longEmail);
    });

    it("should handle email with special characters", async () => {
      render(<ForgotPasswordForm />);

      const specialEmail = "user+tag@example.com";
      const emailInput = screen.getByPlaceholderText("twoj@email.com");

      await user.type(emailInput, specialEmail);

      expect(emailInput).toHaveValue(specialEmail);
    });

    it("should handle email with maximum valid length", async () => {
      render(<ForgotPasswordForm />);

      const longLocalPart = "a".repeat(64);
      const longDomain = "b".repeat(60) + ".com";
      const maxEmail = longLocalPart + "@" + longDomain;

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, maxEmail);

      expect(emailInput).toHaveValue(maxEmail);
    });

    it("should handle API response without error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Wystąpił błąd podczas wysyłania emaila")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe("Accessibility", () => {
    it("should have proper labels for form field", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes on input", () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("autoComplete", "email");
    });

    it("should have accessible submit button", () => {
      render(<ForgotPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("should show loading state in submit button during submission", async () => {
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

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });

      await user.type(emailInput, "test@example.com");

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Wysyłanie...")).toBeInTheDocument();
      });
    });

    it("should have accessible success state with icon", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText("twoj@email.com");
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /wyślij link resetujący/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Sprawdź swoją skrzynkę!" })).toBeInTheDocument();
      });
    });
  });
});
