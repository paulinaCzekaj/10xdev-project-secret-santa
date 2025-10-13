import type { APIRoute } from "astro";
import { z } from "zod";
import { ExclusionRuleService } from "../../../../lib/services/exclusion-rule.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type {
  CreateExclusionRuleCommand,
  ApiErrorResponse,
  ExclusionRuleDTO,
  ExclusionRuleListItemDTO,
} from "../../../../types";

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
 * Zod schema for validating exclusion rule creation input
 * Includes custom refinement to ensure blocker and blocked participants are different
 */
const CreateExclusionRuleSchema = z
  .object({
    blocker_participant_id: z.coerce.number().int().positive({
      message: "Blocker participant ID must be a positive integer",
    }),
    blocked_participant_id: z.coerce.number().int().positive({
      message: "Blocked participant ID must be a positive integer",
    }),
  })
  .refine((data) => data.blocker_participant_id !== data.blocked_participant_id, {
    message: "Blocker and blocked participants cannot be the same",
    path: ["blocked_participant_id"],
  });

/**
 * GET /api/groups/:groupId/exclusions
 * Retrieves all exclusion rules for a Secret Santa group with participant names
 *
 * Returns a list of exclusion rules including the names of both the blocker
 * and blocked participants. Only group participants (creator or members) can
 * access this information.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @returns {ExclusionRuleListItemDTO[]} 200 - Array of exclusion rules with participant names
 * @returns {ApiErrorResponse} 400 - Invalid group ID format
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - User is not a participant in the group
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  console.log("[GET /api/groups/:groupId/exclusions] Endpoint hit", { groupId: params.groupId });

  try {
    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

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

    // Call service to get exclusion rules
    const exclusionRuleService = new ExclusionRuleService(supabase);
    const exclusionRules = await exclusionRuleService.getExclusionRulesForGroup(groupId, userId);

    // Success - return exclusion rules list
    return new Response(JSON.stringify({ data: exclusionRules }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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
            message: "Only group participants can view exclusion rules",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle validation errors (from Zod)
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join("."),
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log unexpected errors
    console.error("[GET /api/groups/:groupId/exclusions] Error:", {
      groupId: params.groupId,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to retrieve exclusion rules. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/groups/:groupId/exclusions
 * Creates a new exclusion rule for a Secret Santa group
 *
 * An exclusion rule specifies that one participant (blocker) cannot be assigned
 * to give a gift to another participant (blocked). Only the group creator can
 * add exclusion rules, and only before the draw has been executed.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @body CreateExclusionRuleCommand (blocker_participant_id, blocked_participant_id)
 * @returns {ExclusionRuleDTO} 201 - Exclusion rule created successfully
 * @returns {ApiErrorResponse} 400 - Invalid input, same participants, draw completed, duplicate rule, or invalid participants
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - User is not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 422 - Missing required fields
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  console.log("[POST /api/groups/:groupId/exclusions] Endpoint hit", { groupId: params.groupId });

  try {
    // Guard 1: Validate groupId parameter
    const { groupId } = GroupIdParamSchema.parse({ groupId: params.groupId });

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

    // Guard 3: Parse request body
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

    // Guard 4: Validate input data
    let validatedData: CreateExclusionRuleCommand;
    try {
      validatedData = CreateExclusionRuleSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const errorResponse: ApiErrorResponse = {
          error: {
            code: firstError.message.includes("required") ? "MISSING_FIELD" : "INVALID_INPUT",
            message: firstError.message,
            details: {
              field: firstError.path.join("."),
              value: (body as any)?.[firstError.path[0]],
            },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: firstError.message.includes("required") ? 422 : 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Unknown validation error
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to create exclusion rule
    const exclusionRuleService = new ExclusionRuleService(supabase);
    const exclusionRule = await exclusionRuleService.createExclusionRule(groupId, userId, validatedData);

    // Success - return created exclusion rule
    return new Response(JSON.stringify(exclusionRule), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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
            message: "Only the group creator can add exclusion rules",
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
            message: "Cannot add exclusion rules after draw has been completed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "SAME_PARTICIPANT") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "SAME_PARTICIPANT",
            message: "Blocker and blocked participants cannot be the same",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "INVALID_PARTICIPANTS") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_PARTICIPANTS",
            message: "One or both participants do not belong to this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "DUPLICATE_RULE") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DUPLICATE_RULE",
            message: "This exclusion rule already exists",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[POST /api/groups/:groupId/exclusions] Error:", {
      groupId: params.groupId,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create exclusion rule. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
