/**
 * Password validation utilities for form validation
 */

/**
 * Validates password strength requirements
 * @param password - Password to validate
 * @returns true if password meets requirements, false otherwise
 */
export function validatePassword(password: string): boolean {
  if (!password) {
    return false;
  }

  if (password.length < 8) {
    return false;
  }

  // Check password complexity (min requirements)
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  return hasLowercase && hasUppercase && hasDigit;
}
