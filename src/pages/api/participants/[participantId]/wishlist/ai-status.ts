import type { APIRoute } from "astro";
import { z } from "zod";
import { WishlistService } from "@/lib/services/wishlist.service";
import { requireApiAuth } from "@/lib/utils/api-auth.utils";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * Zod schema for validating participant ID parameter
 */
const ParticipantIdParamSchema = z.object({
  participantId: z.coerce.number().int().positive({
    message: "Participant ID must be a positive integer",
  }),
});

/**
 * Zod schema for validating participant token query parameter
 */
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});

/**
 * GET /api/participants/:participantId/wishlist/ai-status
 * Returns current AI generation usage status for a participant
 *
 * FIX #1: NEW dedicated endpoint for checking AI generation status
 * Allows frontend to check quota before prompting user to generate
 *
 * Supports two authentication methods:
 * - Registered users: Bearer token in Authorization header
 * - Unregistered users: participant token in 'token' query parameter
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @returns {AIGenerationStatusResponse} 200 - AI generation status
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
  console.log("[GET /api/participants/:participantId/wishlist/ai-status] Endpoint hit", {
    participantId: params.participantId,
  });

  let authUserId: string | null = null;
  let participantToken: string | null = null;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse and validate query parameters for participant token
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    const { token: queryToken } = ParticipantTokenQuerySchema.parse(queryParams);

    // Guard 3: Authentication - participant token in URL takes priority over Bearer token
    if (queryToken) {
      // PRIORITY: Use participant token from URL if provided
      authUserId = null;
      participantToken = queryToken;
      console.log("[GET /api/participants/:participantId/wishlist/ai-status] Using participant token from URL (priority over Bearer)");
    } else {
      // Fallback: Try Bearer token
      const userIdOrResponse = requireApiAuth({ locals });

      if (typeof userIdOrResponse === "string") {
        // Bearer token authentication successful
        authUserId = userIdOrResponse;
        participantToken = null;
        console.log("[GET /api/participants/:participantId/wishlist/ai-status] Using Bearer token authentication");
      } else {
        // No authentication provided
        console.log("[GET /api/participants/:participantId/wishlist/ai-status] No authentication provided");
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required (Bearer token or participant token)",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Initialize services
    const supabase = locals.supabase;
    const wishlistService = new WishlistService(supabase);

    // Guard 4: Validate participant exists and get group info
    const participantWithGroup = await wishlistService.getParticipantWithGroupInfo(participantId);
    if (!participantWithGroup) {
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

    // Guard 5: Validate access permissions
    // For AI status checking, allow participants to check their own status
    if (!authUserId && !participantToken) {
      throw new Error("FORBIDDEN");
    }

    // If using participant token, validate it
    if (participantToken) {
      if (participantWithGroup.access_token !== participantToken) {
        throw new Error("FORBIDDEN");
      }
    }
    // If using Bearer token, check if user can access this participant
    else if (authUserId) {
      // Allow access if user owns this participant OR if this participant belongs to the user
      // (participant may have user_id set, or may be linked by email)
      const isOwner = participantWithGroup.user_id === authUserId;

      if (!isOwner) {
        // For result viewing context, check if this participant could belong to the authenticated user
        // This happens when participant was added by email and user later registered
        const { data: userProfile } = await supabase.auth.getUser();
        const userEmail = userProfile?.user?.email;

        if (userEmail && participantWithGroup.email === userEmail) {
          // Participant belongs to this user via email matching
          console.log("[GET /api/participants/:participantId/wishlist/ai-status] Access granted via email match");
        } else {
          // Check if user has any participant in this group (for result viewing context)
          const { data: userParticipants, error } = await supabase
            .from("participants")
            .select("id")
            .eq("group_id", participantWithGroup.group.id)
            .or(`user_id.eq.${authUserId},email.eq.${userEmail || ""}`);

          if (error || !userParticipants || userParticipants.length === 0) {
            console.log(
              "[GET /api/participants/:participantId/wishlist/ai-status] Access denied - user has no participants in this group",
              {
                authUserId,
                userEmail,
                groupId: participantWithGroup.group.id,
                participantId,
              }
            );
            throw new Error("FORBIDDEN");
          }

          console.log("[GET /api/participants/:participantId/wishlist/ai-status] Access granted via group membership");
        }
      } else {
        console.log("[GET /api/participants/:participantId/wishlist/ai-status] Access granted via direct ownership");
      }
    }

    console.log("[GET /api/participants/:participantId/wishlist/ai-status] Access validation passed");

    // Determine isRegistered based on authentication method
    // If user is authenticated with Bearer token, they are registered
    // If using participant token, check if participant has user_id set
    const isRegistered = authUserId ? true : !!participantWithGroup.user_id;

    // Get AI generation status
    const rateLimitStatus = await wishlistService.validateAIGenerationLimit(participantId, isRegistered);

    // Build response matching API spec exactly
    const responseData = {
      ai_generation_count: rateLimitStatus.generationsUsed,
      remaining_generations: rateLimitStatus.generationsRemaining,
      max_generations: rateLimitStatus.maxGenerations,
      can_generate: rateLimitStatus.canGenerate,
      is_registered: isRegistered,
      last_generated_at: rateLimitStatus.lastGeneratedAt ? rateLimitStatus.lastGeneratedAt.toISOString() : null,
    };

    console.log("[GET /api/participants/:participantId/wishlist/ai-status] Status retrieved successfully", {
      participantId,
      ...responseData,
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": import.meta.env.PUBLIC_SITE_URL || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  } catch (error) {
    console.error("[GET /api/participants/:participantId/wishlist/ai-status] Error:", error);

    // Handle service-specific errors
    if (error instanceof Error) {
      switch (error.message) {
        case "PARTICIPANT_NOT_FOUND": {
          const notFoundResponse: ApiErrorResponse = {
            error: {
              code: "NOT_FOUND",
              message: "Participant not found",
            },
          };
          return new Response(JSON.stringify(notFoundResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "FORBIDDEN": {
          const forbiddenResponse: ApiErrorResponse = {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to access AI generation status for this participant",
            },
          };
          return new Response(JSON.stringify(forbiddenResponse), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

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

    // Handle unexpected errors
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił nieoczekiwany błąd podczas pobierania statusu AI",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
