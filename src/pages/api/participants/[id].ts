import type { APIRoute } from "astro";
import { z } from "zod";
import { ParticipantService } from "../../../lib/services/participant.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import type { ApiErrorResponse, UpdateParticipantCommand } from "../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating participant ID parameter
 */
const ParticipantIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Participant ID must be a positive integer",
  }),
});

/**
 * Zod schema for validating participant update input
 *
 * At least one field (name or email) must be provided for update.
 * Email must be in valid format if provided.
 */
const UpdateParticipantSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long").trim().optional(),
    email: z.string().email("Invalid email format").optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field (name or email) must be provided",
  });

/**
 * PATCH /api/participants/:id
 * Updates an existing participant's information
 *
 * Only the group creator can update participants, and only before the draw.
 * Validates email uniqueness within the group if email is being updated.
 *
 * @param {number} id - Participant ID from URL parameter
 * @body UpdateParticipantCommand (optional fields: name, email)
 * @returns {ParticipantDTO} 200 - Updated participant details
 * @returns {ApiErrorResponse} 400 - Invalid input, email exists, or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  console.log("[PATCH /api/participants/:id] Endpoint hit", { participantId: params.id });

  try {
    // Guard 1: Validate ID parameter
    const { id } = ParticipantIdParamSchema.parse({ id: params.id });

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

    // Guard 4: Validate request body
    const validatedData: UpdateParticipantCommand = UpdateParticipantSchema.parse(body);

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const participantService = new ParticipantService(supabase);

    // Guard 5: Check if participant exists and get group info
    const participant = await participantService.getParticipantWithGroupInfo(id);
    if (!participant) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Participant not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 6: Check authorization - user must be group creator
    const isCreator = await participantService.checkUserIsGroupCreator(userId, participant.group_id);
    if (!isCreator) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "Only group creator can update participants",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 7: Check if draw has been completed
    const drawCompleted = await participantService.checkDrawCompleted(participant.group_id);
    if (drawCompleted) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DRAW_COMPLETED",
          message: "Cannot update participant after draw has been completed",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 8: If email is being updated, check uniqueness
    if (validatedData.email) {
      const emailExists = await participantService.checkEmailUniqueness(validatedData.email, participant.group_id, id);
      if (emailExists) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "EMAIL_EXISTS",
            message: "Email already exists in this group",
            details: { email: validatedData.email },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Happy path: Update participant
    const updatedParticipant = await participantService.updateParticipant(id, validatedData);

    return new Response(JSON.stringify(updatedParticipant), {
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

    // Log unexpected errors
    console.error("[PATCH /api/participants/:id] Error:", {
      participantId: params.id,
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

/**
 * DELETE /api/participants/:id
 * Deletes a participant from a Secret Santa group
 *
 * Only the group creator can delete participants, and only before the draw.
 * Prevents deletion of the group creator to avoid orphaning the group.
 * Cascades to delete related records (exclusion rules, wishes, assignments).
 *
 * @param {number} id - Participant ID from URL parameter
 * @returns 204 - No content (success)
 * @returns {ApiErrorResponse} 400 - Invalid ID, cannot delete creator, or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  console.log("[DELETE /api/participants/:id] Endpoint hit", { participantId: params.id });

  try {
    // Guard 1: Validate ID parameter
    const { id } = ParticipantIdParamSchema.parse({ id: params.id });

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

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const participantService = new ParticipantService(supabase);

    // Guard 3: Check if participant exists and get group info
    const participant = await participantService.getParticipantWithGroupInfo(id);
    if (!participant) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Participant not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 4: Check authorization - user must be group creator
    const isCreator = await participantService.checkUserIsGroupCreator(userId, participant.group_id);
    if (!isCreator) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "FORBIDDEN",
          message: "Only group creator can delete participants",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 5: Check if draw has been completed
    const drawCompleted = await participantService.checkDrawCompleted(participant.group_id);
    if (drawCompleted) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DRAW_COMPLETED",
          message: "Cannot delete participant after draw has been completed",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard 6: Check if participant is group creator
    const isParticipantCreator = await participantService.isParticipantCreator(id, participant.group_id);
    if (isParticipantCreator) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "CANNOT_DELETE_CREATOR",
          message: "Cannot delete group creator",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Happy path: Delete participant
    await participantService.deleteParticipant(id);

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

    // Log unexpected errors
    console.error("[DELETE /api/participants/:id] Error:", {
      participantId: params.id,
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
