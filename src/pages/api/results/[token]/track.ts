import type { APIRoute } from "astro";
import { z } from "zod";
import { ParticipantService } from "../../../../lib/services/participant.service";
import type { ApiErrorResponse, ResultAccessTrackingDTO } from "../../../../types";

export const prerender = false;

/**
 * Zod schema for validating access token parameter
 */
const AccessTokenParamSchema = z.object({
  token: z.string().min(1, "Access token cannot be empty").max(255, "Access token is too long"),
});

/**
 * POST /api/results/:token/track
 * Tracks when an unregistered participant accesses their Secret Santa result
 *
 * Updates the participant's result_viewed_at timestamp to track access.
 * This is used to show status "Zobaczył"/"Nie zobaczył" in group views.
 *
 * @param {string} token - Participant access token from URL parameter
 * @returns {ResultAccessTrackingDTO} 200 - Access tracking information
 * @returns {ApiErrorResponse} 400 - Invalid token format
 * @returns {ApiErrorResponse} 404 - Participant not found or invalid token
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note No authentication required - uses access token
 */
export const POST: APIRoute = async ({ params, locals, request }) => {
  console.log("[POST /api/results/:token/track] Endpoint hit", { token: params.token });

  try {
    // Guard 1: Validate token parameter
    const { token } = AccessTokenParamSchema.parse({ token: params.token });

    // Get Supabase instance
    const supabase = locals.supabase;
    const participantService = new ParticipantService(supabase);

    // Track the access
    const result = await participantService.trackResultAccess(token);

    console.log("[POST /api/results/:token/track] Successfully tracked result access", {
      participantId: result.participant_id,
      accessCount: result.access_count,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[POST /api/results/:token/track] Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid access token format",
            details: error.errors,
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    let statusCode = 500;
    if (errorMessage.includes("PARTICIPANT_NOT_FOUND")) {
      statusCode = 404;
    }

    return new Response(
      JSON.stringify({
        error: {
          code: errorMessage.includes("PARTICIPANT_NOT_FOUND") ? "PARTICIPANT_NOT_FOUND" : "INTERNAL_ERROR",
          message: errorMessage.includes("PARTICIPANT_NOT_FOUND")
            ? "Participant not found or invalid access token"
            : "Failed to track result access",
        },
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
