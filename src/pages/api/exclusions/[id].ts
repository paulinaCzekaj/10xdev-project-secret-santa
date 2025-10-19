import type { APIRoute } from "astro";
import { z } from "zod";
import { ExclusionRuleService } from "../../../lib/services/exclusion-rule.service";
import { requireApiAuth } from "../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse } from "../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating exclusion rule ID parameter
 */
const ExclusionRuleIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Exclusion rule ID must be a positive integer",
  }),
});

/**
 * DELETE /api/exclusions/:id
 * Deletes an exclusion rule from a Secret Santa group
 *
 * Only the group creator can delete exclusion rules, and only before the draw
 * has been completed. This ensures the integrity of the Secret Santa process.
 *
 * @param {number} id - Exclusion rule ID from URL parameter
 * @returns 204 - No content (success)
 * @returns {ApiErrorResponse} 400 - Invalid ID or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Exclusion rule not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  console.log("[DELETE /api/exclusions/:id] Endpoint hit", { id: params.id });

  let userId: string | undefined;

  try {
    // Guard 1: Validate exclusion rule ID parameter
    const { id: exclusionRuleId } = ExclusionRuleIdParamSchema.parse({ id: params.id });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request } as any);
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Get Supabase client
    const supabase = locals.supabase;

    // Call service to delete exclusion rule
    const exclusionRuleService = new ExclusionRuleService(supabase);
    await exclusionRuleService.deleteExclusionRule(exclusionRuleId, userId);

    // Success - return 204 No Content
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // Handle service errors
    if (error instanceof Error) {
      if (error.message === "EXCLUSION_RULE_NOT_FOUND") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "EXCLUSION_RULE_NOT_FOUND",
            message: "Exclusion rule not found",
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
            message: "Only the group creator can delete exclusion rules",
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
            message: "Cannot delete exclusion rules after draw has been completed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
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
    console.error("[DELETE /api/exclusions/:id] Error:", {
      exclusionRuleId: params.id,
      userId,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to delete exclusion rule. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
