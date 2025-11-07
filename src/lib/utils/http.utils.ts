/**
 * Check if HTTP status code should trigger a retry
 * @param status HTTP status code
 * @returns true if status is 500, 502, 503, or 504
 */
export function isRetryableStatusCode(status: number): boolean {
  return [500, 502, 503, 504].includes(status);
}

/**
 * Check if error is a network error (typically a TypeError from fetch)
 * @param err Error to check
 * @returns true if error is a network error
 */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * Build authorization headers based on token availability
 * @param token Query parameter token (for unregistered users)
 * @param accessToken Bearer token from session (for registered users)
 * @returns Headers object with Content-Type and optional Authorization
 */
export function buildAuthHeaders(token: string | undefined, accessToken: string | undefined): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // If using token query param, don't add Authorization header
  if (!token && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Fetch with timeout support using AbortController
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds
 * @returns Promise resolving to Response
 * @throws Error with message "GATEWAY_TIMEOUT" if timeout is reached
 */
export async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("GATEWAY_TIMEOUT");
    }
    throw error;
  }
}
