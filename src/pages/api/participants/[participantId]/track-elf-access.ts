import type { APIRoute } from "astro";
import { z } from "zod";
import { ElfService } from "../../../../lib/services/elf.service";
import { requireApiAuth } from "../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse, TrackElfAccessResponseDTO } from "../../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating participant ID parameter
 */
const ParticipantIdParamSchema = z.object({
  participantId: z.coerce.number().int().positive({
    message: "Participant ID must be a positive integer",
  }),
});

/**
 * POST /api/participants/:participantId/track-elf-access
 * Tracks when an elf first accesses the result of the participant they are helping
 *
 * This endpoint is idempotent - it only sets the elf_accessed_at timestamp if it's currently NULL.
 * Subsequent calls will not change the timestamp, allowing analytics on first access time.
 *
 * Only authenticated elves can access this endpoint. An elf is a participant who has
 * been assigned to help another participant (elf_for_participant_id is set).
 *
 * @param {number} participantId - Participant ID from URL parameter (must be an elf)
 * @returns {TrackElfAccessResponseDTO} 200 - Success confirmation
 * @returns {ApiErrorResponse} 400 - Invalid participant ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated (missing/invalid Bearer token)
 * @returns {ApiErrorResponse} 403 - Not authorized (not an elf or doesn't own participant)
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required (Bearer token only)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  console.log("[POST /api/participants/:participantId/track-elf-access] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Authentication - require Bearer token
    const userIdOrResponse = requireApiAuth({ locals });
    if (typeof userIdOrResponse === "object") {
      // Authentication failed - return error response
      return userIdOrResponse;
    }
    const userId = userIdOrResponse;

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const elfService = new ElfService(supabase);

    // Happy path: Track elf access
    const result: TrackElfAccessResponseDTO = await elfService.trackElfAccess({
      participantId,
      userId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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
              message: "You are not authorized to access this resource",
            },
          };
          return new Response(JSON.stringify(forbiddenResponse), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "INTERNAL_ERROR": {
          const internalErrorResponse: ApiErrorResponse = {
            error: {
              code: "INTERNAL_ERROR",
              message: "An internal error occurred",
            },
          };
          return new Response(JSON.stringify(internalErrorResponse), {
            status: 500,
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

    // Log unexpected errors
    console.error("[POST /api/participants/:participantId/track-elf-access] Unexpected error:", {
      participantId: params.participantId,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
