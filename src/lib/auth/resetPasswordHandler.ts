/**
 * Reset Password Handler
 *
 * Pure function that handles password reset using Supabase Auth.
 * Can be tested in isolation as a unit test.
 */

import { validatePassword } from "../validators/passwordValidators";

export interface ResetPasswordCredentials {
  password: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Error messages mapping for Supabase Auth errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  "Token has expired or is invalid": "Token jest nieprawidłowy lub wygasł",
  "User not found": "Użytkownik nie istnieje",
  "Invalid password": "Hasło nie spełnia wymagań",
  "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków",
  "New password should be different from the old password": "Nowe hasło musi różnić się od starego",
};

/**
 * Get translated error message for auth errors
 * @param error - Error from Supabase Auth
 * @returns Translated error message
 */
export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return ERROR_MESSAGES[message] || "Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.";
}

/**
 * Performs password reset using Supabase Auth
 * @param credentials - New password
 * @param updateUser - Supabase updateUser function (injected for testability)
 * @returns Promise with password reset result
 */
export async function performResetPassword(
  credentials: ResetPasswordCredentials,
  updateUser: (params: { password: string }) => Promise<{ error: Error | null }>
): Promise<ResetPasswordResult> {
  try {
    const { error: updateError } = await updateUser({
      password: credentials.password,
    });

    if (updateError) {
      return {
        success: false,
        error: {
          message: getAuthErrorMessage(updateError),
          code: (updateError as Error & { code?: string }).code,
        },
      };
    }

    // Success
    return {
      success: true,
    };
  } catch (error) {
    // Handle unexpected errors
    return {
      success: false,
      error: {
        message: getAuthErrorMessage(error),
      },
    };
  }
}

/**
 * Validates reset password credentials before API call
 * @param credentials - New password
 * @returns true if credentials are valid format, false otherwise
 */
export function validateResetPasswordCredentials(credentials: ResetPasswordCredentials): boolean {
  return validatePassword(credentials.password);
}
