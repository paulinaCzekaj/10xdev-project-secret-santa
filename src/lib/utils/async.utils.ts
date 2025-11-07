/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-indexed)
 * @returns Delay in milliseconds (2^attempt * 1000)
 * @example
 * calculateBackoff(0) // 1000ms (1s)
 * calculateBackoff(1) // 2000ms (2s)
 * calculateBackoff(2) // 4000ms (4s)
 */
export function calculateBackoff(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

/**
 * Retry options for the retry utility
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Function to calculate backoff delay (defaults to exponential backoff) */
  calculateDelay?: (attempt: number) => number;
  /** Callback invoked before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Generic retry wrapper for async functions
 * @param fn Async function to retry
 * @param options Retry configuration
 * @returns Promise resolving to the function result
 * @throws The last error if all retries are exhausted
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetchData(),
 *   {
 *     maxRetries: 3,
 *     shouldRetry: (err) => isNetworkError(err),
 *     onRetry: (err, attempt, delay) => console.log(`Retry ${attempt} after ${delay}ms`)
 *   }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, shouldRetry = () => true, calculateDelay = calculateBackoff, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt >= maxRetries) {
        throw error;
      }

      // Check if error should trigger retry
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt);
      onRetry?.(error, attempt, delay);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
