import type { APIRoute } from "astro";
import { z } from "zod";
import { GroupService } from "../../../../lib/services/group.service";
import { AssignmentsService } from "../../../../lib/services/assignments.service";
import { DrawService } from "../../../../lib/services/draw.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type { DrawResultDTO, ApiErrorResponse } from "../../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating group ID parameter
 */
const GroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Group ID must be a positive integer",
  }),
});

/**
 * POST /api/groups/:id/draw
 * Executes Secret Santa draw for a group
 *
 * This endpoint performs the complete draw operation:
 * - Validates group exists and user is creator
 * - Checks minimum 3 participants
 * - Verifies draw hasn't been executed yet
 * - Validates exclusion rules allow a valid draw
 * - Executes backtracking algorithm to find assignments
 * - Saves all assignments atomically in database
 *
 * @param {number} id - Group ID from URL parameter
 * @returns {DrawResultDTO} 200 - Draw completed successfully
 * @returns {ApiErrorResponse} 400 - Invalid input, insufficient participants, draw already completed, or impossible draw
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - User is not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error or algorithm timeout
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const POST: APIRoute = async ({ params, locals }) => {
  console.log("[POST /api/groups/:id/draw] Endpoint hit", { groupId: params.id });

  try {
    // ========================================================================
    // STEP 1: Validate Parameters and Authentication
    // ========================================================================

    // Guard 1: Validate id parameter
    const { id: groupId } = GroupIdParamSchema.parse({ id: params.id });

    // Guard 2: Check authentication
    // TODO: Replace DEFAULT_USER_ID with actual user ID from auth when implemented
    const userId = DEFAULT_USER_ID;
    if (!userId) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] User authenticated", { userId, groupId });

    // Get Supabase client and initialize services
    const supabase = locals.supabase;
    const groupService = new GroupService(supabase);
    const assignmentsService = new AssignmentsService(supabase);
    const drawService = new DrawService();

    // ========================================================================
    // STEP 2: Verify Group and Authorization
    // ========================================================================

    // Fetch group to verify it exists
    const group = await groupService.getGroupById(groupId, userId);

    // Guard 3: Check if group exists
    if (!group) {
      console.log("[POST /api/groups/:id/draw] Group not found", { groupId });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GROUP_NOT_FOUND",
          message: "Group not found",
          details: { group_id: groupId },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 4: Verify user is the group creator
    if (!group.is_creator) {
      console.log("[POST /api/groups/:id/draw] User is not creator", {
        userId,
        groupId,
        creatorId: group.creator_id,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "Only the group creator can execute the draw",
          details: {
            creator_id: group.creator_id,
            current_user: userId,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] User is creator - authorized", { groupId });

    // ========================================================================
    // STEP 3: Pre-Draw Validation
    // ========================================================================

    // Guard 5: Check if draw has already been executed
    const hasDrawn = await assignmentsService.hasDrawBeenExecuted(groupId);
    if (hasDrawn) {
      const drawnAt = await assignmentsService.getDrawTimestamp(groupId);
      console.log("[POST /api/groups/:id/draw] Draw already completed", {
        groupId,
        drawnAt,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DRAW_ALREADY_COMPLETED",
          message: "Draw has already been completed for this group",
          details: {
            drawn_at: drawnAt,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] Draw not yet executed - proceeding", { groupId });

    // Guard 6: Fetch participants and validate count
    const participants = await groupService.getParticipantsForDraw(groupId);
    if (participants.length < 3) {
      console.log("[POST /api/groups/:id/draw] Insufficient participants", {
        groupId,
        count: participants.length,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INSUFFICIENT_PARTICIPANTS",
          message: "At least 3 participants are required to execute a draw",
          details: {
            current_count: participants.length,
            required_minimum: 3,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] Participant count valid", {
      groupId,
      count: participants.length,
    });

    // Fetch exclusion rules
    const exclusions = await groupService.getExclusionsForDraw(groupId);

    console.log("[POST /api/groups/:id/draw] Exclusion rules fetched", {
      groupId,
      exclusionsCount: exclusions.length,
    });

    // ========================================================================
    // STEP 4: Validate Draw Possibility
    // ========================================================================

    // Guard 7: Check if draw is possible with current exclusion rules
    if (!drawService.isDrawPossible(participants, exclusions)) {
      console.log("[POST /api/groups/:id/draw] Draw is impossible with current rules", {
        groupId,
        participantsCount: participants.length,
        exclusionsCount: exclusions.length,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "IMPOSSIBLE_DRAW",
          message: "Draw is impossible with current exclusion rules",
          details: {
            reason: "Exclusion rules create an impossible configuration",
            suggestion: "Review and remove some exclusion rules",
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] Draw is possible - executing algorithm", { groupId });

    // ========================================================================
    // STEP 5: Execute Draw Algorithm
    // ========================================================================

    const assignments = drawService.executeDrawAlgorithm(participants, exclusions);

    // Guard 8: Check if algorithm found a solution
    if (!assignments) {
      console.error("[POST /api/groups/:id/draw] Algorithm failed to find solution", {
        groupId,
        participantsCount: participants.length,
        exclusionsCount: exclusions.length,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DRAW_EXECUTION_ERROR",
          message: "Failed to execute draw algorithm. This may be due to timeout or impossible configuration.",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/groups/:id/draw] Algorithm completed successfully", {
      groupId,
      assignmentsCount: assignments.length,
    });

    // ========================================================================
    // STEP 6: Save Assignments to Database
    // ========================================================================

    try {
      await assignmentsService.createBatch(groupId, assignments);
      console.log("[POST /api/groups/:id/draw] Assignments saved to database", {
        groupId,
        assignmentsCount: assignments.length,
      });
    } catch (error) {
      console.error("[POST /api/groups/:id/draw] Failed to save assignments", {
        groupId,
        error,
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DATABASE_ERROR",
          message: "An error occurred while saving the draw results",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // STEP 7: Return Success Response
    // ========================================================================

    const response: DrawResultDTO = {
      success: true,
      message: "Draw completed successfully",
      group_id: groupId,
      drawn_at: new Date().toISOString(),
      participants_notified: participants.length,
    };

    console.log("[POST /api/groups/:id/draw] Draw completed successfully", {
      groupId,
      participantsNotified: participants.length,
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
      console.log("[POST /api/groups/:id/draw] Validation error", {
        groupId: params.id,
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
    console.error("[POST /api/groups/:id/draw] Unexpected error", {
      groupId: params.id,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while executing the draw",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
