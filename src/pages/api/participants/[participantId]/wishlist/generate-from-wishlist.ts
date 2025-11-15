import type { APIRoute } from "astro";
import { z } from "zod";
import { WishlistService } from "@/lib/services/wishlist.service";
import { OpenRouterError, getUserFriendlyMessage } from "@/lib/services/openrouter.error";
import { requireApiAuth } from "@/lib/utils/api-auth.utils";
import type { ApiErrorResponse, GenerateSantaLetterFromWishlistResponse } from "@/types";

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
 */
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});

/**
 * Zod schema for validating request body for generation options
 */
const GenerateFromWishlistSchema = z.object({
  language: z.enum(["pl", "en"]).default("pl").optional(),
});

/**
 * POST /api/participants/:participantId/wishlist/generate-from-wishlist
 * Generates a personalized Santa letter using AI based on participant's existing wishlist content
 *
 * Uses the participant's wishlist as input for AI generation instead of requiring a custom prompt.
 * Validates access permissions, rate limits, group end date, and ensures wishlist exists.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @body GenerateFromWishlistRequest (optional: language)
 * @returns {GenerateSantaLetterFromWishlistResponse} 200 - Generated Santa letter
 * @returns {ApiErrorResponse} 400 - Invalid input, rate limit exceeded, end date passed, or wishlist issues
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized
 * @returns {ApiErrorResponse} 404 - Participant or wishlist not found
 * @returns {ApiErrorResponse} 429 - AI generation limit exceeded
 * @returns {ApiErrorResponse} 500 - Internal server error
 * @returns {ApiErrorResponse} 504 - Gateway timeout (AI took too long)
 */
export const POST: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[POST /api/participants/:participantId/wishlist/generate-from-wishlist] Endpoint hit", {
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
    const userIdOrResponse = requireApiAuth({ locals });

    if (typeof userIdOrResponse === "string") {
      // Bearer token authentication successful
      authUserId = userIdOrResponse;
      participantToken = null;
      console.log(
        "[POST /api/participants/:participantId/wishlist/generate-from-wishlist] Bearer token authentication successful"
      );
    } else {
      // Bearer token failed, try participant token
      if (!queryToken) {
        console.log(
          "[POST /api/participants/:participantId/wishlist/generate-from-wishlist] No authentication provided"
        );
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
        "[POST /api/participants/:participantId/wishlist/generate-from-wishlist] Using participant token authentication"
      );
    }

    // Guard 4: Parse request body (optional generation options)
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
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
    const validatedData = GenerateFromWishlistSchema.parse(body);
    const { language } = validatedData;

    // Initialize service
    const supabase = locals.supabase;
    const wishlistService = new WishlistService(supabase);

    // Get OpenRouter API key from runtime environment (Cloudflare Pages)
    const openRouterApiKey =
      locals.runtime?.env?.OPENROUTER_API_KEY || // platformProxy local dev
      import.meta.env.OPENROUTER_API_KEY || // Build-time fallback
      process.env.OPENROUTER_API_KEY; // Node.js dev mode fallback

    if (!openRouterApiKey) {
      console.error(
        "[POST /api/participants/:participantId/wishlist/generate-from-wishlist] OPENROUTER_API_KEY not found in environment"
      );
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "AI service configuration error",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Happy path: Generate Santa letter from wishlist
    const result = await wishlistService.generateSantaLetterFromWishlist(
      participantId,
      authUserId,
      participantToken,
      {
        language,
      },
      openRouterApiKey
    );

    console.log("[POST /api/participants/:participantId/wishlist/generate-from-wishlist] Generation successful", {
      participantId,
      letterLength: result.letter.letterContent.length,
      suggestedGiftsCount: result.letter.suggestedGifts.length,
      remainingGenerations: result.remainingGenerations,
    });

    // Return success response
    const responseData: GenerateSantaLetterFromWishlistResponse = {
      generated_content: result.letter.letterContent,
      suggested_gifts: result.letter.suggestedGifts,
      remaining_generations: result.remainingGenerations,
      can_generate_more: result.canGenerateMore,
      is_registered: result.isRegistered,
      metadata: {
        model: result.letter.metadata.model,
        tokens_used: result.letter.metadata.tokensUsed,
        generation_time: result.letter.metadata.generationTime,
      },
    };

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
    console.error("[POST /api/participants/:participantId/wishlist/generate-from-wishlist] Error:", error);

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
              message: "You do not have permission to generate AI content for this participant",
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
              message: "Cannot generate AI content after group end date has passed",
            },
          };
          return new Response(JSON.stringify(endDateResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "WISHLIST_NOT_FOUND": {
          const wishlistResponse: ApiErrorResponse = {
            error: {
              code: "WISHLIST_NOT_FOUND",
              message: "No wishlist found for this participant. Please create a wishlist first.",
            },
          };
          return new Response(JSON.stringify(wishlistResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "WISHLIST_EMPTY": {
          const emptyResponse: ApiErrorResponse = {
            error: {
              code: "WISHLIST_EMPTY",
              message: "Wishlist is empty. Please add some content to your wishlist before generating AI content.",
            },
          };
          return new Response(JSON.stringify(emptyResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "RATE_LIMIT_EXCEEDED": {
          const rateLimitResponse: ApiErrorResponse = {
            error: {
              code: "AI_GENERATION_LIMIT_REACHED",
              message: "You have reached your AI generation limit",
            },
          };
          return new Response(JSON.stringify(rateLimitResponse), {
            status: 429,
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
        message: "An unexpected error occurred while generating AI content",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
