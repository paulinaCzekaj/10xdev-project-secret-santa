import type { APIRoute } from "astro";
import { z } from "zod";
import { GroupService } from "../../../../lib/services/group.service";
import { requireApiAuth, requireGroupAccess, requireGroupOwner } from "../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse } from "../../../../types";

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
 * Zod schema for validating group update input
 */
const UpdateGroupSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long").trim().optional(),
    budget: z.number().positive("Budget must be greater than 0").finite("Budget must be a valid number").optional(),
    end_date: z.string().datetime("Invalid date format. Use ISO 8601 format (e.g., 2025-12-25T23:59:59Z)").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * GET /api/groups/:groupId
 * Retrieves detailed information about a specific Secret Santa group
 *
 * Requires authentication and membership/ownership of the group.
 * Returns group details with participants, exclusions, and computed fields.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns {GroupDetailDTO} 200 - Group details with participants and exclusions
 * @returns {ApiErrorResponse} 400 - Invalid group ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - No access to group
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const GET: APIRoute = async ({ params, locals, request }) => {
  console.log("[GET /api/groups/:groupId] Endpoint hit", { groupId: params.groupId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate ID parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request } as any);
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Guard 3: Check group access (owner or participant)
    const accessOrResponse = await requireGroupAccess({ locals, request } as any, groupId);
    if (accessOrResponse !== true) {
      return accessOrResponse;
    }

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to get group details
    const groupService = new GroupService(supabase);
    const groupDetails = await groupService.getGroupById(groupId, userId);

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
    console.error("[GET /api/groups/:groupId] Error:", {
      groupId: params.groupId,
      userId,
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

/**
 * PATCH /api/groups/:groupId
 * Updates an existing Secret Santa group
 *
 * Only the group creator can update the group, and only before the draw.
 * All fields in the request body are optional, but at least one must be provided.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @body UpdateGroupCommand (optional fields: name, budget, end_date)
 * @returns {GroupDTO} 200 - Updated group details
 * @returns {ApiErrorResponse} 400 - Invalid input or draw already completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  console.log("[PATCH /api/groups/:groupId] Endpoint hit", { groupId: params.groupId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate ID parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request } as any);
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Guard 3: Check if user is group owner
    const ownerOrResponse = await requireGroupOwner({ locals, request } as any, groupId);
    if (ownerOrResponse !== true) {
      return ownerOrResponse;
    }

    // Guard 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON in request body",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 4: Validate request body
    const validatedData = UpdateGroupSchema.parse(body);

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to update group
    const groupService = new GroupService(supabase);
    const updatedGroup = await groupService.updateGroup(groupId, userId, validatedData);

    // Success - return updated group
    return new Response(JSON.stringify(updatedGroup), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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

    // Handle service errors
    if (error instanceof Error) {
      if (error.message === "GROUP_NOT_FOUND") {
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

      if (error.message === "FORBIDDEN") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "Only the group creator can update this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "DRAW_COMPLETED") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DRAW_COMPLETED",
            message: "Cannot update group after draw has been completed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[PATCH /api/groups/:groupId] Error:", {
      groupId: params.groupId,
      userId,
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

/**
 * DELETE /api/groups/:groupId
 * Deletes a Secret Santa group and all related data
 *
 * Only the group creator can delete the group.
 * This operation cascades and deletes all related records:
 * - participants
 * - exclusion_rules
 * - assignments
 * - wishes (via participants cascade)
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns 204 - No content (success)
 * @returns {ApiErrorResponse} 400 - Invalid group ID
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const DELETE: APIRoute = async ({ params, locals, request }) => {
  console.log("[DELETE /api/groups/:groupId] Endpoint hit", { groupId: params.groupId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate ID parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request } as any);
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Guard 3: Check if user is group owner
    const ownerOrResponse = await requireGroupOwner({ locals, request } as any, groupId);
    if (ownerOrResponse !== true) {
      return ownerOrResponse;
    }

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to delete group
    const groupService = new GroupService(supabase);
    await groupService.deleteGroup(groupId, userId);

    // Success - return 204 No Content
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
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

    // Handle service errors
    if (error instanceof Error) {
      if (error.message === "GROUP_NOT_FOUND") {
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

      if (error.message === "FORBIDDEN") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "FORBIDDEN",
            message: "Only the group creator can delete this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[DELETE /api/groups/:groupId] Error:", {
      groupId: params.groupId,
      userId,
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
