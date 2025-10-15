/**
 * Utility functions for generating secure tokens
 */

/**
 * Generates a cryptographically secure access token using UUID v4
 *
 * @returns A random UUID v4 string (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 *
 * @example
 * const token = generateAccessToken();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 *
 * @note
 * Uses crypto.randomUUID() which is cryptographically secure
 * Collision probability is extremely low (~10^-18)
 * This is sufficient for MVP - future enhancement could use dedicated token table
 */
export function generateAccessToken(): string {
  return crypto.randomUUID();
}
