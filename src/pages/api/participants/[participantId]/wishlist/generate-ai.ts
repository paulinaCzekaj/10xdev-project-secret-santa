import type { APIRoute } from "astro";
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { WishlistService } from "@/lib/services/wishlist.service";
import { OpenRouterError, getUserFriendlyMessage } from "@/lib/services/openrouter.error";
import { requireApiAuth } from "@/lib/utils/api-auth.utils";
import { AI_PROMPT_MIN_LENGTH, AI_PROMPT_MAX_LENGTH } from "@/lib/constants/ai.constants";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * Zod schema for validating participant ID parameter
 */
const ParticipantIdParamSchema = z.object({
  participantId: z.coerce.number().int().positive({
    message: "Participant ID must be a positive integer",
  }),
});

/**
 * Zod schema for validating participant token query parameter
 * FIX #5: Added to support dual authentication (Bearer + participant token)
 */
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});

/**
 * Zod schema for validating request body for AI generation
 * FIX #16: Added .trim() to validate AFTER trimming whitespace
 * FIX #8: Removed isRegistered - will be determined server-side from database
 */
const GenerateAISchema = z.object({
  prompt: z
    .string()
    .trim() // Trim before validation
    .min(AI_PROMPT_MIN_LENGTH, `Prompt must be at least ${AI_PROMPT_MIN_LENGTH} characters`)
    .max(AI_PROMPT_MAX_LENGTH, `Prompt cannot exceed ${AI_PROMPT_MAX_LENGTH} characters`),
});

/**
 * POST /api/participants/:participantId/wishlist/generate-ai
 * Generates a personalized Santa letter using AI based on user preferences
 *
 * FIX #5: Added dual authentication (Bearer token OR participant token)
 * FIX #3: Rate limit increment happens BEFORE AI generation to prevent race condition
 * FIX #6: Added end_date validation - blocks generation after event ends
 * FIX #8: isRegistered determined from database (participant.user_id) not client input
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @body GenerateAIRequest (required: prompt)
 * @returns {GenerateAIResponse} 200 - Generated Santa letter
 * @returns {ApiErrorResponse} 400 - Invalid input, rate limit exceeded, or end date passed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 429 - AI generation limit exceeded
 * @returns {ApiErrorResponse} 500 - Internal server error
 * @returns {ApiErrorResponse} 504 - Gateway timeout (AI took too long)
 */
export const POST: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  let authUserId: string | null = null;
  let participantToken: string | null = null;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse and validate query parameters for participant token
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    const { token: queryToken } = ParticipantTokenQuerySchema.parse(queryParams);

    // Guard 3: Authentication - try Bearer token first, then participant token
    // FIX #5: Added authentication (was completely missing!)
    const userIdOrResponse = requireApiAuth({ locals });

    if (typeof userIdOrResponse === "string") {
      // Bearer token authentication successful
      authUserId = userIdOrResponse;
      participantToken = null;
      console.log(
        "[POST /api/participants/:participantId/wishlist/generate-ai] Bearer token authentication successful"
      );
    } else {
      // Bearer token failed, try participant token
      if (!queryToken) {
        console.log("[POST /api/participants/:participantId/wishlist/generate-ai] No authentication provided");
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required (Bearer token or participant token)",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Use participant token
      authUserId = null;
      participantToken = queryToken;
      console.log(
        "[POST /api/participants/:participantId/wishlist/generate-ai] Using participant token authentication"
      );
    }

    // Guard 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 5: Validate request body
    const validatedData = GenerateAISchema.parse(body);
    const { prompt } = validatedData;

    // Initialize services
    const supabase = locals.supabase;
    const openRouterService = new OpenRouterService(supabase);
    const wishlistService = new WishlistService(supabase);

    // Guard 6: Validate participant exists and get group info
    // FIX #5: Validate access permissions (was missing!)
    const participantWithGroup = await wishlistService.getParticipantWithGroupInfo(participantId);
    if (!participantWithGroup) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Participant not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 7: Validate wishlist access permissions
    // FIX #5: Check if user/token has permission to generate for this participant
    await wishlistService.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup);

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Access validation passed");

    // Guard 8: Check if group end date has passed
    // FIX #6: Added end_date validation (was completely missing!)
    const now = new Date();
    const endDate = new Date(participantWithGroup.group.end_date);
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (nowDate > endDateOnly) {
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] End date passed", {
        participantId,
        endDate: participantWithGroup.group.end_date,
        endDateOnly: endDateOnly.toISOString(),
        nowDate: nowDate.toISOString(),
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "END_DATE_PASSED",
          message: "Cannot generate AI wishlist after group end date has passed",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] End date validation passed");

    // Guard 9: Determine isRegistered from database (not client input!)
    // FIX #8: Server-side determination prevents quota manipulation
    const isRegistered = !!participantWithGroup.user_id;
    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Registration status", {
      participantId,
      isRegistered,
    });

    // Guard 10: Check rate limit
    const rateLimitStatus = await openRouterService.validateRateLimit(participantId.toString(), isRegistered);

    if (!rateLimitStatus.canGenerate) {
      const rateLimitResponse: ApiErrorResponse = {
        error: {
          code: "AI_GENERATION_LIMIT_REACHED",
          message: "Wykorzystałeś wszystkie dostępne generowania AI",
        },
      };
      return new Response(JSON.stringify(rateLimitResponse), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Rate limit check passed", {
      participantId,
      generationsRemaining: rateLimitStatus.generationsRemaining,
    });

    // FIX #3: INCREMENT COUNTER FIRST (BEFORE generation) to prevent race condition
    // This ensures that concurrent requests can't bypass the quota limit
    await openRouterService.incrementGenerationCount(participantId.toString());
    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Generation counter incremented");

    // Happy path: Generate Santa letter (after incrementing counter)
    let result;
    try {
      result = await openRouterService.generateSantaLetter(prompt, { language: "pl" });
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] AI generation successful", {
        participantId,
        letterLength: result.letterContent.length,
        suggestedGiftsCount: result.suggestedGifts.length,
      });
    } catch (error) {
      // NOTE: Counter is NOT rolled back on generation failure
      // This prevents abuse through repeated failed attempts
      console.error(
        "[POST /api/participants/:participantId/wishlist/generate-ai] AI generation failed (counter already incremented)",
        {
          participantId,
          error,
        }
      );
      throw error;
    }

    // Return success response
    // FIX #10: Response structure matches API spec (no extra metadata/suggested_gifts)
    const responseData = {
      generated_content: result.letterContent,
      remaining_generations: rateLimitStatus.generationsRemaining - 1, // Already decremented
      can_generate_more: rateLimitStatus.generationsRemaining - 1 > 0,
    };

    // FIX #19: Added CORS headers
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": import.meta.env.PUBLIC_SITE_URL || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  } catch (error) {
    console.error("[POST /api/participants/:participantId/wishlist/generate-ai] Error:", error);

    // Handle OpenRouter-specific errors
    if (error instanceof OpenRouterError) {
      let statusCode = 500;

      // Map error codes to HTTP status codes
      switch (error.code) {
        case "INVALID_INPUT":
        case "INVALID_REQUEST":
          statusCode = 400;
          break;
        case "RATE_LIMIT_EXCEEDED":
        case "GENERATION_LIMIT_EXCEEDED":
          statusCode = 429;
          break;
        case "UNAUTHORIZED":
          statusCode = 401;
          break;
        case "FORBIDDEN":
          statusCode = 403;
          break;
        case "NOT_FOUND":
          statusCode = 404;
          break;
        // FIX #2: Correct timeout mapping (504 Gateway Timeout, not 408)
        case "GATEWAY_TIMEOUT":
        case "TIMEOUT":
          statusCode = 504;
          break;
        case "NETWORK_ERROR":
          statusCode = 503;
          break;
        default:
          statusCode = 500;
      }

      const errorResponse: ApiErrorResponse = {
        error: {
          code: error.code,
          message: getUserFriendlyMessage(error),
          ...(error.isRetryable && { details: { isRetryable: true } }),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle service-specific errors
    if (error instanceof Error) {
      switch (error.message) {
        case "PARTICIPANT_NOT_FOUND": {
          const notFoundResponse: ApiErrorResponse = {
            error: {
              code: "NOT_FOUND",
              message: "Participant not found",
            },
          };
          return new Response(JSON.stringify(notFoundResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "FORBIDDEN": {
          const forbiddenResponse: ApiErrorResponse = {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to generate AI wishlist for this participant",
            },
          };
          return new Response(JSON.stringify(forbiddenResponse), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "END_DATE_PASSED": {
          const endDateResponse: ApiErrorResponse = {
            error: {
              code: "END_DATE_PASSED",
              message: "Cannot generate AI wishlist after group end date has passed",
            },
          };
          return new Response(JSON.stringify(endDateResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: error.errors[0].message,
          details: { errors: error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił nieoczekiwany błąd podczas generowania listy",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
