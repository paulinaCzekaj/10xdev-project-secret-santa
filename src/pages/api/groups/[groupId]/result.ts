import type { APIRoute } from "astro";
import { z } from "zod";
import { ResultsService } from "../../../../lib/services/results.service";
import { requireApiAuth, requireGroupAccess } from "../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse, DrawResultResponseDTO } from "../../../../types";

export const prerender = false;

/**
 * Zod schema for validating group ID parameter
 */
const GroupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});

/**
 * GET /api/groups/:groupId/result
 * Retrieves the Secret Santa draw result for an authenticated participant
 *
 * Requires authentication and membership in the group.
 * Returns the participant's assigned recipient and wishlist information.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns {DrawResultResponseDTO} 200 - Complete draw result information
 * @returns {ApiErrorResponse} 400 - Invalid group ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - User is not a participant in this group
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 400 - Draw has not been completed yet
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required - user must be a participant in the group
 */
export const GET: APIRoute = async ({ params, locals, request }) => {
  console.log("[GET /api/groups/:groupId/result] Endpoint hit", { groupId: params.groupId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Authentication - get user ID
    const userIdOrResponse = requireApiAuth({ locals, request } as any);
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Guard 3: Check group access (user must be a participant)
    const accessOrResponse = await requireGroupAccess({ locals, request } as any, groupId);
    if (accessOrResponse !== true) {
      return accessOrResponse;
    }

    // Get Supabase client and initialize service
    const supabase = locals.supabase;
    const resultsService = new ResultsService(supabase);

    // Get draw result for authenticated user
    const result = await resultsService.getAuthenticatedUserResult(groupId, userId);

    console.log("[GET /api/groups/:groupId/result] Successfully retrieved draw result", {
      groupId,
      userId,
      participantId: result.participant.id,
      assignedToId: result.assigned_to.id,
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
    console.error("[GET /api/groups/:groupId/result] Error:", error);

    // Handle different error types
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid group ID format",
          details: error.errors,
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

    if (errorMessage === "GROUP_NOT_FOUND") {
      statusCode = 404;
      errorCode = "GROUP_NOT_FOUND";
      errorMessageText = "Group not found";
    } else if (errorMessage === "FORBIDDEN") {
      statusCode = 403;
      errorCode = "FORBIDDEN";
      errorMessageText = "You are not a participant in this group";
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
