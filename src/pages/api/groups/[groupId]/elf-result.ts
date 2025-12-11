import type { APIRoute } from "astro";
import { z } from "zod";
import { ElfService } from "../../../../lib/services/elf.service";
import { requireApiAuth, requireGroupAccess } from "../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse, ElfResultResponseDTO } from "../../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating group ID parameter
 */
const GroupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});

/**
 * GET /api/groups/:groupId/elf-result
 * Retrieves the draw result that an elf can see for the current authenticated user
 *
 * This endpoint automatically finds the participant (elf) for the current user in the group
 * and returns the result of the participant they are helping.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns {ElfResultResponseDTO} 200 - Elf result with assignment, group, and helped participant info
 * @returns {ApiErrorResponse} 400 - Invalid group ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated (missing/invalid Bearer token)
 * @returns {ApiErrorResponse} 403 - Not authorized (not a member, not an elf, or draw not completed)
 * @returns {ApiErrorResponse} 404 - Group, participant, or assignment not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required (Bearer token only)
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  console.log("[GET /api/groups/:groupId/elf-result] Endpoint hit", {
    groupId: params.groupId,
    method: request.method,
  });

  try {
    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Parse query parameters
    const url = new URL(request.url);
    const helpedParticipantIdParam = url.searchParams.get("helpedParticipantId");
    const helpedParticipantId = helpedParticipantIdParam ? parseInt(helpedParticipantIdParam) : null;

    // Guard 2: Authentication - require Bearer token
    const userIdOrResponse = requireApiAuth({ locals });
    if (typeof userIdOrResponse === "object") {
      // Authentication failed - return error response
      return userIdOrResponse;
    }
    const userId = userIdOrResponse;

    // Guard 3: Check group access
    const accessOrResponse = await requireGroupAccess({ locals }, groupId);
    if (accessOrResponse !== true) {
      return accessOrResponse;
    }

    // Get Supabase client and create service
    const supabase = locals.supabase;

    // Step 1: Find the participant for the current user in this group
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (participantError || !participant) {
      console.log("[GET /api/groups/:groupId/elf-result] User has no participant in this group", {
        groupId,
        userId: userId.substring(0, 8) + "...",
        error: participantError?.message,
      });

      const forbiddenResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "You are not a participant in this group",
        },
      };
      return new Response(JSON.stringify(forbiddenResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Find all participants this user helps as an elf
    const { data: allHelpedParticipants, error: elfCheckError } = await supabase
      .from("participants")
      .select("id")
      .eq("elf_participant_id", participant.id)
      .eq("group_id", groupId);

    if (elfCheckError) {
      console.error("[GET /api/groups/:groupId/elf-result] Error checking elf relationships:", elfCheckError);
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check elf relationships",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!allHelpedParticipants || allHelpedParticipants.length === 0) {
      console.log("[GET /api/groups/:groupId/elf-result] User is not an elf in this group", {
        groupId,
        userId: userId.substring(0, 8) + "...",
        participantId: participant.id,
      });

      const forbiddenResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "You are not an elf in this group",
        },
      };
      return new Response(JSON.stringify(forbiddenResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 3: Determine which participant to show result for
    let targetHelpedParticipantId: number;

    if (helpedParticipantId) {
      // Check if the requested participant is actually helped by this elf
      const isValidTarget = allHelpedParticipants.some((p: { id: number }) => p.id === helpedParticipantId);
      if (!isValidTarget) {
        console.log("[GET /api/groups/:groupId/elf-result] Requested participant is not helped by this elf", {
          groupId,
          userId: userId.substring(0, 8) + "...",
          requestedHelpedParticipantId: helpedParticipantId,
          validHelpedParticipantIds: allHelpedParticipants.map((p: { id: number }) => p.id),
        });

        const forbiddenResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "You cannot view results for this participant",
          },
        };
        return new Response(JSON.stringify(forbiddenResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      targetHelpedParticipantId = helpedParticipantId;
    } else {
      // No specific participant requested - use the first one
      targetHelpedParticipantId = allHelpedParticipants[0].id;
    }

    if (participantError || !participant) {
      console.log("[GET /api/groups/:groupId/elf-result] User is not an elf in this group", {
        groupId,
        userId: userId.substring(0, 8) + "...",
        error: participantError?.message,
      });

      const forbiddenResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "You are not an elf in this group",
        },
      };
      return new Response(JSON.stringify(forbiddenResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Use ElfService to get the elf result for the target participant
    const elfService = new ElfService(supabase);
    const result: ElfResultResponseDTO = await elfService.getElfResult({
      participantId: participant.id,
      userId,
      helpedParticipantId: targetHelpedParticipantId,
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

        case "NOT_FOUND": {
          const notFoundResponse: ApiErrorResponse = {
            error: {
              code: "NOT_FOUND",
              message: "The requested resource was not found",
            },
          };
          return new Response(JSON.stringify(notFoundResponse), {
            status: 404,
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
    console.error("[GET /api/groups/:groupId/elf-result] Unexpected error:", {
      groupId: params.groupId,
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
