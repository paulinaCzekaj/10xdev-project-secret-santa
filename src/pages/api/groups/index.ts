import type { APIRoute } from "astro";
import { z } from "zod";
import { GroupService } from "../../../lib/services/group.service";
import { requireApiAuth } from "../../../lib/utils/api-auth.utils";
import type { CreateGroupCommand, ApiErrorResponse, GroupsListQuery } from "../../../types";

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
 * Zod schema for validating groups list query parameters
 */
const GroupsListQuerySchema = z.object({
  filter: z.enum(["created", "joined", "all"]).optional().default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be between 1 and 100")
    .optional()
    .default(20),
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
 * @note Authentication required
 */
export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[POST /api/groups] Endpoint hit");

  // Guard 0: Authentication
  const userIdOrResponse = requireApiAuth({ locals, request } as any);
  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

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
    const user = locals.user;

    if (!user) {
      throw new Error("User not found");
    }

    const group = await groupService.createGroup(userId, validatedData, {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Unknown User",
      email: user.email || "user@example.com",
    });

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

/**
 * GET /api/groups
 * Retrieves a paginated list of groups the user has access to
 *
 * @query filter - Filter groups by relationship (created/joined/all)
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20, max: 100)
 * @returns 200 with PaginatedGroupsDTO on success
 * @returns 400 if invalid query parameters
 * @returns 401 if unauthorized (when auth is implemented)
 * @returns 500 if server error
 *
 * @note Authentication required
 */
export const GET: APIRoute = async ({ request, locals }) => {
  console.log("[GET /api/groups] Endpoint hit");

  // Guard 0: Authentication
  const userIdOrResponse = requireApiAuth({ locals, request } as any);
  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

  const supabase = locals.supabase;

  // Guard 1: Parse and validate query parameters
  const url = new URL(request.url);
  const queryParams = {
    filter: url.searchParams.get("filter") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  };

  let validatedQuery: GroupsListQuery;
  try {
    validatedQuery = GroupsListQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_INPUT",
          message: firstError.message,
          details: {
            field: firstError.path.join("."),
            value: queryParams[firstError.path[0] as keyof typeof queryParams],
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Unknown validation error
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Query parameter validation failed",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Call service to fetch groups
  try {
    const groupService = new GroupService(supabase);
    const result = await groupService.listGroups(userId, validatedQuery);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Optional: Add cache headers for performance
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("[GET /api/groups] Error:", error);

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to fetch groups. Please try again later.",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
