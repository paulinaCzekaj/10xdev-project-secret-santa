/**
 * Register API Handler
 *
 * Pure function that handles registration API calls without React dependencies.
 * Can be tested in isolation as a unit test.
 */

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  error?: {
    message: string;
    statusCode?: number;
  };
}

export interface RegisterApiResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
}

/**
 * Performs registration API call
 * @param credentials - User email and password
 * @returns Promise with registration result
 */
export async function performRegister(credentials: RegisterCredentials): Promise<RegisterResult> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const result: RegisterApiResponse = await response.json();

    if (!response.ok) {
      // Handle API error
      const errorMessage = result.error?.message || "Wystąpił błąd podczas rejestracji";
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
    const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas rejestracji";
    return {
      success: false,
      error: {
        message: errorMessage,
      },
    };
  }
}

/**
 * Validates registration credentials before API call
 * @param credentials - User email and password
 * @returns true if credentials are valid format, false otherwise
 */
export function validateRegisterCredentials(credentials: RegisterCredentials): boolean {
  // Basic validation before API call
  if (!credentials.email || !credentials.password) {
    return false;
  }

  if (credentials.email.length === 0 || credentials.password.length < 8) {
    return false;
  }

  // Check password complexity (min requirements)
  const hasLowercase = /[a-z]/.test(credentials.password);
  const hasUppercase = /[A-Z]/.test(credentials.password);
  const hasDigit = /\d/.test(credentials.password);

  return hasLowercase && hasUppercase && hasDigit;
}
