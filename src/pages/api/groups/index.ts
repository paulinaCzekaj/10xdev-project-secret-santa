import type { APIRoute } from "astro";
import { z } from "zod";
import { GroupService } from "../../../lib/services/group.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import type { CreateGroupCommand, ApiErrorResponse } from "../../../types";

export const prerender = false;
export const trailingSlash = "never";

/**
 * Zod schema for validating group creation input
 */
const CreateGroupSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long").trim(),
  budget: z.number().positive("Budget must be greater than 0").finite("Budget must be a valid number"),
  end_date: z.string().datetime("Invalid date format. Use ISO 8601 format (e.g., 2025-12-25T23:59:59Z)"),
});

/**
 * POST /api/groups
 * Creates a new Secret Santa group
 *
 * @body CreateGroupCommand
 * @returns 201 with GroupListItemDTO on success
 * @returns 400 if invalid input
 * @returns 422 if missing required fields
 * @returns 500 if server error
 *
 * @note Authentication is not implemented yet - uses DEFAULT_USER_ID
 */
export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[POST /api/groups] Endpoint hit");
  const supabase = locals.supabase;

  // Guard 1: Parse request body
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
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Guard 2: Validate input data
  let validatedData: CreateGroupCommand;
  try {
    validatedData = CreateGroupSchema.parse(body);
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

  // Call service to create group
  try {
    const groupService = new GroupService(supabase);
    // TODO: Replace DEFAULT_USER_ID with actual user ID from auth when implemented
    const group = await groupService.createGroup(DEFAULT_USER_ID, validatedData);

    return new Response(JSON.stringify(group), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[POST /api/groups] Error:", error);

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create group. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
