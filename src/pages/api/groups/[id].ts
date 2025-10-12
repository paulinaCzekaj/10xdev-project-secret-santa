import type { APIRoute } from "astro";
import { z } from "zod";
import { GroupService } from "../../../lib/services/group.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import type { ApiErrorResponse } from "../../../types";

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
 * GET /api/groups/:id
 * Retrieves detailed information about a specific Secret Santa group
 *
 * Requires authentication and membership/ownership of the group.
 * Returns group details with participants, exclusions, and computed fields.
 *
 * @param {number} id - Group ID from URL parameter
 * @returns {GroupDetailDTO} 200 - Group details with participants and exclusions
 * @returns {ApiErrorResponse} 400 - Invalid group ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - No access to group
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const GET: APIRoute = async ({ params, locals }) => {
  console.log("[GET /api/groups/:id] Endpoint hit", { groupId: params.id });

  try {
    // Guard 1: Validate ID parameter
    const { id } = GroupIdParamSchema.parse({ id: params.id });

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

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to get group details
    const groupService = new GroupService(supabase);
    const groupDetails = await groupService.getGroupById(id, userId);

    // Guard 3: Check if group exists and user has access
    if (!groupDetails) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "GROUP_NOT_FOUND",
          message: "Group not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - return group details
    return new Response(JSON.stringify(groupDetails), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
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
    console.error("[GET /api/groups/:id] Error:", {
      groupId: params.id,
      userId: DEFAULT_USER_ID,
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
