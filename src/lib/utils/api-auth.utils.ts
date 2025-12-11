import type { APIContext } from "astro";
import type { ApiErrorResponse } from "@/types";

/**
 * Type for authentication context - minimal required properties from APIContext
 */
type AuthContext = Pick<APIContext, "locals">;

/**
 * Validates user session in API endpoint
 * Returns user_id or 401 response
 */
export function requireApiAuth(context: AuthContext): string | Response {
  const { user } = context.locals;

  if (!user) {
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

  return user.id;
}

/**
 * Checks if user is the owner of the group
 * Returns true or 403 response
 */
export async function requireGroupOwner(context: AuthContext, groupId: number): Promise<true | Response> {
  const userIdOrResponse = requireApiAuth(context);

  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  const { supabase } = context.locals;

  const { data: group, error } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (error || !group) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Group not found",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (group.creator_id !== userId) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return true;
}

/**
 * Checks if user has access to the group (as owner or participant)
 * Checks participation both by user_id and email (for users added before account creation)
 */
export async function requireGroupAccess(context: AuthContext, groupId: number): Promise<true | Response> {
  const userIdOrResponse = requireApiAuth(context);

  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  const { supabase, user } = context.locals;
  const userEmail = user?.email || "";

  // Check if user is the owner
  const { data: group } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (group?.creator_id === userId) {
    return true;
  }

  // Check if user is a participant (by user_id or email)
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("group_id", groupId)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .single();

  if (participant) {
    return true;
  }

  // No access
  const errorResponse: ApiErrorResponse = {
    error: {
      code: "FORBIDDEN",
      message: "You do not have access to this group",
    },
  };
  return new Response(JSON.stringify(errorResponse), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
