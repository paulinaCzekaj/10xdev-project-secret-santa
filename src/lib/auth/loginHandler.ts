/**
 * Login API Handler
 *
 * Pure function that handles login API calls without React dependencies.
 * Can be tested in isolation as a unit test.
 */

import { validatePassword } from "../validators/passwordValidators";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: {
    message: string;
    statusCode?: number;
  };
}

export interface LoginApiResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
}

/**
 * Performs login API call
 * @param credentials - User email and password
 * @returns Promise with login result
 */
export async function performLogin(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const result: LoginApiResponse = await response.json();

    if (!response.ok) {
      // Handle API error
      const errorMessage = result.error?.message || "Wystąpił błąd podczas logowania";
      return {
        success: false,
        error: {
          message: errorMessage,
          statusCode: response.status,
        },
      };
    }

    // Success
    return {
      success: true,
    };
  } catch (error) {
    // Handle network or parsing errors
    const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas logowania";
    return {
      success: false,
      error: {
        message: errorMessage,
      },
    };
  }
}

/**
 * Validates login credentials before API call
 * @param credentials - User email and password
 * @returns true if credentials are valid format, false otherwise
 */
export function validateLoginCredentials(credentials: LoginCredentials): boolean {
  // Basic validation before API call
  if (!credentials.email || !credentials.password) {
    return false;
  }

  if (credentials.email.length === 0) {
    return false;
  }

  return validatePassword(credentials.password);
}
