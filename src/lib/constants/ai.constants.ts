/**
 * FIX #21: AI and Wishlist Constants
 *
 * Centralized constants for AI generation and wishlist management.
 * Extracted from various files to avoid magic numbers and improve maintainability.
 */

// === AI PROMPT VALIDATION ===

/** Minimum length for AI generation prompt (characters) */
export const AI_PROMPT_MIN_LENGTH = 10;

/** Maximum length for AI generation prompt (characters) */
export const AI_PROMPT_MAX_LENGTH = 2000;

// === AI GENERATION LIMITS ===

/** Maximum AI generations for unregistered users (per group) */
export const AI_MAX_GENERATIONS_UNREGISTERED = 3;

/** Maximum AI generations for registered users (per group) */
export const AI_MAX_GENERATIONS_REGISTERED = 5;

// === AI CONTENT LIMITS ===

/** Maximum length for AI-generated Santa letter (characters) */
export const AI_LETTER_MAX_LENGTH = 2000;

/** Maximum number of suggested gifts from AI (unlimited) */
export const AI_MAX_SUGGESTED_GIFTS = Number.MAX_SAFE_INTEGER;

// === WISHLIST LIMITS ===

/** Maximum length for wishlist content (characters) */
export const WISHLIST_MAX_LENGTH = 10000;

/** Minimum length for wishlist content (characters) */
export const WISHLIST_MIN_LENGTH = 1;

// === AI PRICING (gpt-4o-mini as of 2025) ===

/** Cost per 1K prompt tokens in USD */
export const AI_PROMPT_COST_PER_1K = 0.00015; // $0.150 per 1M tokens

/** Cost per 1K completion tokens in USD */
export const AI_COMPLETION_COST_PER_1K = 0.0006; // $0.600 per 1M tokens

// === API TIMEOUTS ===

/** Timeout for AI generation requests (milliseconds) */
export const AI_REQUEST_TIMEOUT_MS = 15000; // 15 seconds

/** Maximum retries for failed AI requests */
export const AI_MAX_RETRIES = 2;

/** Base delay for exponential backoff (milliseconds) */
export const AI_RETRY_BASE_DELAY_MS = 1000; // 1 second
