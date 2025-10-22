import type { APIRoute } from "astro";
import { z } from "zod";
import { ResultsService } from "../../../../lib/services/results.service";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * Zod schema for validating access token parameter
 */
const AccessTokenParamSchema = z.object({
  token: z.string().min(1, "Access token cannot be empty").max(255, "Access token is too long"),
});

/**
 * GET /api/results/:token
 * Retrieves the Secret Santa draw result for an unregistered participant using access token
 *
 * No authentication required - uses access token for authorization.
 * Returns the participant's assigned recipient and wishlist information.
 *
 * @param {string} token - Participant access token from URL parameter
 * @returns {DrawResultResponseDTO} 200 - Complete draw result information
 * @returns {ApiErrorResponse} 400 - Invalid token format
 * @returns {ApiErrorResponse} 404 - Invalid or expired access token
 * @returns {ApiErrorResponse} 400 - Draw has not been completed yet
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note No authentication required - uses access token instead
 */
export const GET: APIRoute = async ({ params, locals }) => {
  console.log("[GET /api/results/:token] Endpoint hit", { token: params.token });

  try {
    // Guard 1: Validate token parameter
    const { token } = AccessTokenParamSchema.parse({ token: params.token });

    // Get Supabase client and initialize service
    const supabase = locals.supabase;
    const resultsService = new ResultsService(supabase);

    // Get draw result using token-based access
    const result = await resultsService.getTokenBasedResult(token);

    console.log("[GET /api/results/:token] Successfully retrieved draw result", {
      participantId: result.participant.id,
      assignedToId: result.assigned_to.id,
      groupId: result.group.id,
    });

    // Success - return draw result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache", // Don't cache sensitive result data
      },
    });
  } catch (error) {
    console.error("[GET /api/results/:token] Error:", error);

    // Handle different error types
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid access token format",
          details: { errors: error.errors },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Map service errors to appropriate HTTP status codes
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let errorMessageText = "Failed to retrieve draw result";

    if (errorMessage === "INVALID_TOKEN") {
      statusCode = 404;
      errorCode = "INVALID_TOKEN";
      errorMessageText = "Invalid or expired access token";
    } else if (errorMessage === "DRAW_NOT_COMPLETED") {
      statusCode = 400;
      errorCode = "DRAW_NOT_COMPLETED";
      errorMessageText = "Draw has not been completed yet for this group";
    }

    const errorResponse: ApiErrorResponse = {
      error: {
        code: errorCode,
        message: errorMessageText,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
};
