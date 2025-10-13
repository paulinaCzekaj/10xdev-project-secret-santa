import type { APIRoute } from "astro";
import { z } from "zod";
import { ParticipantService } from "../../../../lib/services/participant.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type { CreateParticipantCommand, ApiErrorResponse } from "../../../../types";

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
 * Zod schema for validating participant creation input
 */
const CreateParticipantSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long").trim(),
  email: z.string().email("Invalid email format").optional(),
});

/**
 * POST /api/groups/:groupId/participants
 * Adds a new participant to a Secret Santa group
 *
 * Only the group creator can add participants, and only before the draw.
 * Generates a secure access token for the participant.
 *
 * @param {number} groupId - Group ID from URL parameter
 * @body CreateParticipantCommand (name, optional email)
 * @returns {ParticipantWithTokenDTO} 201 - Participant created with access token
 * @returns {ApiErrorResponse} 400 - Invalid input, duplicate email, or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Group not found
 * @returns {ApiErrorResponse} 422 - Missing required field (name)
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  console.log("[POST /api/groups/:groupId/participants] Endpoint hit", { groupId: params.groupId });

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
    let validatedData: CreateParticipantCommand;
    try {
      validatedData = CreateParticipantSchema.parse(body);
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

    // Call service to add participant
    const participantService = new ParticipantService(supabase);
    const participant = await participantService.addParticipantToGroup(groupId, userId, validatedData);

    // Success - return participant with access token
    return new Response(JSON.stringify(participant), {
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
            message: "Only the group creator can add participants",
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
            message: "Cannot add participants after draw has been completed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message === "DUPLICATE_EMAIL") {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DUPLICATE_EMAIL",
            message: "Email already exists in this group",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Log unexpected errors
    console.error("[POST /api/groups/:groupId/participants] Error:", {
      groupId: params.groupId,
      userId: DEFAULT_USER_ID,
      error,
    });

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to add participant. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
