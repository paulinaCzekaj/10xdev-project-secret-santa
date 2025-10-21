import type { APIContext } from "astro";
import type { ApiErrorResponse } from "@/types";

/**
 * Type for authentication context - minimal required properties from APIContext
 */
type AuthContext = Pick<APIContext, "locals">;

/**
 * Weryfikuje sesję użytkownika w endpoincie API
 * Zwraca user_id lub odpowiedź 401
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
 * Sprawdza czy użytkownik jest twórcą grupy
 * Zwraca true lub odpowiedź 403
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
 * Sprawdza czy użytkownik ma dostęp do grupy (jako twórca lub uczestnik)
 */
export async function requireGroupAccess(context: AuthContext, groupId: number): Promise<true | Response> {
  const userIdOrResponse = requireApiAuth(context);

  if (typeof userIdOrResponse !== "string") {
    return userIdOrResponse;
  }

  const userId = userIdOrResponse;
  const { supabase } = context.locals;

  // Sprawdź czy użytkownik jest twórcą
  const { data: group } = await supabase.from("groups").select("creator_id").eq("id", groupId).single();

  if (group?.creator_id === userId) {
    return true;
  }

  // Sprawdź czy użytkownik jest uczestnikiem
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (participant) {
    return true;
  }

  // Brak dostępu
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
