import type { APIRoute } from "astro";
import { z } from "zod";
import { ParticipantService } from "../../../lib/services/participant.service";
import { requireApiAuth, requireGroupOwner } from "../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse, UpdateParticipantCommand } from "../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating participant ID parameter
 */
const ParticipantIdParamSchema = z.object({
  participantId: z.coerce.number().int().positive({
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
 * PATCH /api/participants/:participantId
 * Updates an existing participant's information
 *
 * Only the group creator can update participants, and only before the draw.
 * Validates email uniqueness within the group if email is being updated.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @body UpdateParticipantCommand (optional fields: name, email)
 * @returns {ParticipantDTO} 200 - Updated participant details
 * @returns {ApiErrorResponse} 400 - Invalid input, email exists, or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  console.log("[PATCH /api/participants/:participantId] Endpoint hit", { participantId: params.participantId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request, params });
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

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
    const validatedData: UpdateParticipantCommand = UpdateParticipantSchema.parse(body);

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const participantService = new ParticipantService(supabase);

    // Guard 5: Check if participant exists and get group info
    const participant = await participantService.getParticipantWithGroupInfo(participantId);
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

    // Guard 6: Check if user is group owner
    const ownerOrResponse = await requireGroupOwner({ locals, request } as any, participant.group_id);
    if (ownerOrResponse !== true) {
      return ownerOrResponse;
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
      const emailExists = await participantService.checkEmailUniqueness(
        validatedData.email,
        participant.group_id,
        participantId
      );
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
    const updatedParticipant = await participantService.updateParticipant(participantId, validatedData);

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
    console.error("[PATCH /api/participants/:participantId] Error:", {
      participantId: params.participantId,
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
 * DELETE /api/participants/:participantId
 * Deletes a participant from a Secret Santa group
 *
 * Only the group creator can delete participants, and only before the draw.
 * Prevents deletion of the group creator to avoid orphaning the group.
 * Cascades to delete related records (exclusion rules, wishes, assignments).
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @returns 204 - No content (success)
 * @returns {ApiErrorResponse} 400 - Invalid ID, cannot delete creator, or draw completed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not the group creator
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required
 */
export const DELETE: APIRoute = async ({ params, locals, request }) => {
  console.log("[DELETE /api/participants/:participantId] Endpoint hit", { participantId: params.participantId });

  let userId: string | undefined;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Authentication
    const userIdOrResponse = requireApiAuth({ locals, request, params });
    if (typeof userIdOrResponse !== "string") {
      return userIdOrResponse;
    }
    userId = userIdOrResponse;

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const participantService = new ParticipantService(supabase);

    // Guard 3: Check if participant exists and get group info
    const participant = await participantService.getParticipantWithGroupInfo(participantId);
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

    // Guard 4: Check if user is group owner
    const ownerOrResponse = await requireGroupOwner({ locals, request } as any, participant.group_id);
    if (ownerOrResponse !== true) {
      return ownerOrResponse;
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
    const isParticipantCreator = await participantService.isParticipantCreator(participantId, participant.group_id);
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
    await participantService.deleteParticipant(participantId);

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
    console.error("[DELETE /api/participants/:participantId] Error:", {
      participantId: params.participantId,
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
