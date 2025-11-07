/**
 * Pure functions for forgot password (password reset request) logic
 * Separated from React components for better testability
 */

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  error?: {
    message: string;
  };
}

/**
 * Validates forgot password credentials
 * @param credentials - The email to send reset link to
 * @returns true if valid, throws error if invalid
 */
export function validateForgotPasswordCredentials(credentials: ForgotPasswordCredentials): boolean {
  if (!credentials.email || credentials.email.trim() === "") {
    throw new Error("Email jest wymagany");
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    throw new Error("Nieprawidłowy format email");
  }

  return true;
}

/**
 * Performs forgot password request (sends reset link to email)
 * @param credentials - The email credentials
 * @returns Promise with result indicating success or error
 */
export async function performForgotPassword(credentials: ForgotPasswordCredentials): Promise<ForgotPasswordResult> {
  try {
    // Validate credentials first
    validateForgotPasswordCredentials(credentials);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error?.message || "Wystąpił błąd podczas wysyłania emaila";
      return {
        success: false,
        error: {
          message: errorMessage,
        },
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    // Handle network errors or validation errors
    // If it's a validation error, return it directly
    if (
      error instanceof Error &&
      (error.message === "Email jest wymagany" || error.message === "Nieprawidłowy format email")
    ) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }

    // Otherwise, return generic network error
    return {
      success: false,
      error: {
        message: "Wystąpił błąd połączenia. Sprawdź połączenie z internetem i spróbuj ponownie.",
      },
    };
  }
}
