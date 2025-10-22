import type { APIRoute } from "astro";
import { z } from "zod";
import { requireApiAuth, requireGroupOwner } from "../../../../../lib/utils/api-auth.utils";
import { GroupService } from "../../../../../lib/services/group.service";
import { DrawService } from "../../../../../lib/services/draw.service";
import type { DrawValidationDTO, ApiErrorResponse } from "../../../../../types";

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
 * POST /api/groups/:groupId/draw/validate
 * Validates if a Secret Santa draw is possible for a group
 *
 * This endpoint performs a "dry run" validation to check if the current
 * exclusion rules between participants allow for a valid Secret Santa assignment.
 * It returns validation status, participant count, exclusion count, and a
 * descriptive message about the validation result.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns {DrawValidationDTO} 200 - Validation completed (valid or invalid draw)
 * @returns {ApiErrorResponse} 400 - Invalid input parameters
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - User is not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 * @note Only group creator can validate draw possibility
 */
export const POST: APIRoute = async ({ params, locals, request }) => {
  console.log("[POST /api/groups/:groupId/draw/validate] Endpoint hit", { groupId: params.groupId });

  let userId: string | undefined;

  try {
    // ========================================================================
    // STEP 1: Validate Parameters and Authentication
    // ========================================================================

    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals });
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    console.log("[POST /api/groups/:groupId/draw/validate] User authenticated", { userId, groupId });

    // Guard 3: Check if user is group owner
    const ownerOrResponse = await requireGroupOwner({ locals }, groupId);
    if (ownerOrResponse !== true) {
      return ownerOrResponse;
    }

    // Get Supabase client and initialize services
    const supabase = locals.supabase;
    const groupService = new GroupService(supabase);
    const drawService = new DrawService();

    console.log("[POST /api/groups/:groupId/draw/validate] User is creator - authorized", { groupId });

    // ========================================================================
    // STEP 2: Fetch Group Data
    // ========================================================================

    // Fetch participants for the group
    const participants = await groupService.getParticipantsForDraw(groupId);

    console.log("[POST /api/groups/:groupId/draw/validate] Participants fetched", {
      groupId,
      participantsCount: participants.length,
    });

    // Fetch exclusion rules for the group
    const exclusions = await groupService.getExclusionsForDraw(groupId);

    console.log("[POST /api/groups/:groupId/draw/validate] Exclusion rules fetched", {
      groupId,
      exclusionsCount: exclusions.length,
    });

    // ========================================================================
    // STEP 3: Validate Draw Possibility
    // ========================================================================

    // Validate draw possibility using the DrawService algorithm
    // This performs a comprehensive check to ensure that:
    // - There are at least 3 participants
    // - Exclusion rules don't create impossible assignment scenarios
    // - Each participant has at least one valid recipient
    // - The exclusion graph allows for a perfect matching
    const isValid = drawService.isDrawPossible(participants, exclusions);

    console.log("[POST /api/groups/:groupId/draw/validate] Draw validation completed", {
      groupId,
      isValid,
      participantsCount: participants.length,
      exclusionsCount: exclusions.length,
    });

    // ========================================================================
    // STEP 4: Prepare and Return Validation Response
    // ========================================================================

    // Prepare user-friendly messages based on validation result
    let message: string;
    let details: string | undefined;

    if (isValid) {
      // Draw is possible - provide confirmation message
      message = "Draw can be executed successfully";
    } else {
      // Draw is impossible - provide clear error message with actionable details
      message = "Draw is impossible with current exclusion rules";
      details =
        "Too many exclusions create an impossible scenario. Consider removing some exclusion rules to allow the draw to proceed.";
    }

    const response: DrawValidationDTO = {
      valid: isValid,
      participants_count: participants.length,
      exclusions_count: exclusions.length,
      message,
      details,
    };

    console.log("[POST /api/groups/:groupId/draw/validate] Validation completed", {
      groupId,
      valid: response.valid,
      participantsCount: response.participants_count,
      exclusionsCount: response.exclusions_count,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // ========================================================================
    // Error Handling
    // ========================================================================

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      console.log("[POST /api/groups/:groupId/draw/validate] Validation error", {
        groupId: params.groupId,
        error: firstError.message,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid group ID format",
          details: {
            field: firstError.path.join("."),
            message: firstError.message,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log unexpected errors
    console.error("[POST /api/groups/:groupId/draw/validate] Unexpected error", {
      groupId: params.groupId,
      userId,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while validating the draw",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
