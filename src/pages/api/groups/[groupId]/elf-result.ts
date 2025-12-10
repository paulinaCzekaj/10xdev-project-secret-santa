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

    // Step 1: Find the participant for the current user in this group who is an elf
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, elf_for_participant_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .not("elf_for_participant_id", "is", null)
      .single();

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

    // Step 2: Use ElfService to get the elf result
    const elfService = new ElfService(supabase);
    const result: ElfResultResponseDTO = await elfService.getElfResult({
      participantId: participant.id,
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
