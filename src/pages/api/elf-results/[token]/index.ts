import type { APIRoute } from "astro";
import { z } from "zod";
import { ElfService } from "../../../../lib/services/elf.service";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * Zod schema for validating access token parameter
 */
const AccessTokenParamSchema = z.object({
  token: z.string().min(1, "Access token cannot be empty").max(255, "Access token is too long"),
});

/**
 * GET /api/elf-results/:token
 * Retrieves the elf result for an unauthenticated elf using access token
 *
 * No authentication required - uses access token for authorization.
 * Returns the result of the participant that the elf is helping.
 *
 * @param {string} token - Elf participant's access token from URL parameter
 * @returns {ElfResultResponseDTO} 200 - Complete elf result information
 * @returns {ApiErrorResponse} 400 - Invalid token format
 * @returns {ApiErrorResponse} 403 - Participant is not an elf
 * @returns {ApiErrorResponse} 404 - Invalid or expired access token, or helped participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note No authentication required - uses access token instead
 */
export const GET: APIRoute = async ({ params, locals }) => {
  console.log("[GET /api/elf-results/:token] Endpoint hit", { token: params.token });

  try {
    // Guard 1: Validate token parameter
    const { token } = AccessTokenParamSchema.parse({ token: params.token });

    // Get Supabase client and initialize service
    const supabase = locals.supabase;
    const elfService = new ElfService(supabase);

    // Get elf result using token-based access
    const result = await elfService.getElfResultByToken({ token });

    console.log("[GET /api/elf-results/:token] Successfully retrieved elf result", {
      helpedParticipantId: result.helpedParticipant.id,
      groupId: result.group.id,
    });

    // Success - return elf result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache", // Don't cache sensitive result data
      },
    });
  } catch (error) {
    console.error("[GET /api/elf-results/:token] Error:", error);

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
    let errorMessageText = "Failed to retrieve elf result";

    if (errorMessage === "INVALID_TOKEN") {
      statusCode = 404;
      errorCode = "INVALID_TOKEN";
      errorMessageText = "Invalid or expired access token";
    } else if (errorMessage === "FORBIDDEN") {
      statusCode = 403;
      errorCode = "FORBIDDEN";
      errorMessageText = "Participant is not an elf";
    } else if (errorMessage === "NOT_FOUND") {
      statusCode = 404;
      errorCode = "NOT_FOUND";
      errorMessageText = "Helped participant or assignment not found";
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
