import type { APIRoute } from "astro";
import { z } from "zod";
import { ResultsService } from "../../../../lib/services/results.service";
import { requireApiAuth } from "../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse } from "../../../../types";

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
 * POST /api/participants/:participantId/reveal
 * Tracks when a participant reveals their Secret Santa result
 *
 * Updates the result_viewed_at timestamp to indicate the participant has seen their result.
 * This prevents the gift from being opened multiple times.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @returns {object} 200 - Success confirmation
 * @returns {ApiErrorResponse} 400 - Invalid participant ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized to access this participant
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required - user must be the participant or have access
 */
export const POST: APIRoute = async ({ params, locals, request, url }) => {
  console.log("[POST /api/participants/:participantId/reveal] Endpoint hit", {
    participantId: params.participantId,
  });

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({
      participantId: params.participantId,
    });

    // Check for token-based authentication (for non-logged-in users)
    const token = url.searchParams.get("token");
    let isAuthenticated = false;

    if (token) {
      // Verify token exists and belongs to the participant
      const { data: participant } = await locals.supabase
        .from("participants")
        .select("id")
        .eq("access_token", token)
        .eq("id", participantId)
        .single();

      if (participant) {
        isAuthenticated = true;
      }
    } else {
      // Check for regular authentication
      const userIdOrResponse = requireApiAuth({ locals, request } as any);
      if (typeof userIdOrResponse === "string") {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get Supabase instance and services
    const supabase = locals.supabase;
    const resultsService = new ResultsService(supabase);

    // Track the result reveal
    await resultsService.trackResultReveal(participantId);

    console.log("[POST /api/participants/:participantId/reveal] Successfully tracked result reveal", {
      participantId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Result reveal tracked successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/participants/:participantId/reveal] Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid participant ID format",
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
    } else if (errorMessage.includes("NOT_AUTHORIZED")) {
      statusCode = 403;
    }

    return new Response(
      JSON.stringify({
        error: {
          code: errorMessage.includes("PARTICIPANT_NOT_FOUND")
            ? "PARTICIPANT_NOT_FOUND"
            : errorMessage.includes("NOT_AUTHORIZED")
              ? "NOT_AUTHORIZED"
              : "INTERNAL_ERROR",
          message: errorMessage.includes("PARTICIPANT_NOT_FOUND")
            ? "Participant not found"
            : errorMessage.includes("NOT_AUTHORIZED")
              ? "Not authorized to access this participant"
              : "Failed to track result reveal",
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
