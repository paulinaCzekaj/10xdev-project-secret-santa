import type { APIRoute } from "astro";
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { WishlistService } from "@/lib/services/wishlist.service";
import { OpenRouterError, getUserFriendlyMessage } from "@/lib/services/openrouter.error";
import { requireApiAuth } from "@/lib/utils/api-auth.utils";
import { AI_PROMPT_MIN_LENGTH, AI_PROMPT_MAX_LENGTH } from "@/lib/constants/ai.constants";
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
 * FIX #5: Added to support dual authentication (Bearer + participant token)
 */
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});

/**
 * Zod schema for validating request body for AI generation
 * FIX #16: Added .trim() to validate AFTER trimming whitespace
 * FIX #8: Removed isRegistered - will be determined server-side from database
 */
const GenerateAISchema = z.object({
  prompt: z
    .string()
    .trim() // Trim before validation
    .min(AI_PROMPT_MIN_LENGTH, `Prompt must be at least ${AI_PROMPT_MIN_LENGTH} characters`)
    .max(AI_PROMPT_MAX_LENGTH, `Prompt cannot exceed ${AI_PROMPT_MAX_LENGTH} characters`),
});

/**
 * POST /api/participants/:participantId/wishlist/generate-ai
 * Generates a personalized Santa letter using AI based on user preferences
 *
 * FIX #5: Added dual authentication (Bearer token OR participant token)
 * FIX #3: Rate limit increment happens BEFORE AI generation to prevent race condition
 * FIX #6: Added end_date validation - blocks generation after event ends
 * FIX #8: isRegistered determined from database (participant.user_id) not client input
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @body GenerateAIRequest (required: prompt)
 * @returns {GenerateAIResponse} 200 - Generated Santa letter
 * @returns {ApiErrorResponse} 400 - Invalid input, rate limit exceeded, or end date passed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 429 - AI generation limit exceeded
 * @returns {ApiErrorResponse} 500 - Internal server error
 * @returns {ApiErrorResponse} 504 - Gateway timeout (AI took too long)
 */
export const POST: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
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
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Using participant token from URL (priority over Bearer)");
    } else {
      // Fallback: Try Bearer token
      const userIdOrResponse = requireApiAuth({ locals });

      if (typeof userIdOrResponse === "string") {
        // Bearer token authentication successful
        authUserId = userIdOrResponse;
        participantToken = null;
        console.log(
          "[POST /api/participants/:participantId/wishlist/generate-ai] Using Bearer token authentication"
        );
      } else {
        // No authentication provided
        console.log("[POST /api/participants/:participantId/wishlist/generate-ai] No authentication provided");
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

    // Guard 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
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

    // Guard 5: Validate request body
    const validatedData = GenerateAISchema.parse(body);
    const { prompt } = validatedData;

    // Initialize services
    const supabase = locals.supabase;

    // Get OpenRouter API key from runtime environment (Cloudflare Pages)
    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Checking for API key", {
      hasRuntime: !!locals.runtime,
      hasRuntimeEnv: !!locals.runtime?.env,
      hasRuntimeKey: !!locals.runtime?.env?.OPENROUTER_API_KEY,
      hasImportMetaKey: !!import.meta.env.OPENROUTER_API_KEY,
      hasProcessEnvKey: !!process.env.OPENROUTER_API_KEY,
      localsKeys: Object.keys(locals),
    });

    // Try multiple ways to access environment variables in Cloudflare Pages
    const openRouterApiKey =
      locals.runtime?.env?.OPENROUTER_API_KEY || // platformProxy local dev
      import.meta.env.OPENROUTER_API_KEY || // Build-time fallback
      process.env.OPENROUTER_API_KEY; // Node.js dev mode fallback

    if (!openRouterApiKey) {
      console.error(
        "[POST /api/participants/:participantId/wishlist/generate-ai] OPENROUTER_API_KEY not found in environment",
        {
          localsKeys: Object.keys(locals),
          runtimeKeys: locals.runtime ? Object.keys(locals.runtime) : null,
          envKeys: locals.runtime?.env ? Object.keys(locals.runtime.env) : null,
        }
      );
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "AI service configuration error",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openRouterService = new OpenRouterService(supabase, { apiKey: openRouterApiKey });
    const wishlistService = new WishlistService(supabase);

    // Guard 6: Validate participant exists and get group info
    // FIX #5: Validate access permissions (was missing!)
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

    // Guard 7: Validate access permissions
    // For AI generation, allow participants to generate for their own status
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
          console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Access granted via email match");
        } else {
          // Check if user has any participant in this group (for result viewing context)
          const { data: userParticipants, error } = await supabase
            .from("participants")
            .select("id")
            .eq("group_id", participantWithGroup.group.id)
            .or(`user_id.eq.${authUserId},email.eq.${userEmail || ""}`);

          if (error || !userParticipants || userParticipants.length === 0) {
            console.log(
              "[POST /api/participants/:participantId/wishlist/generate-ai] Access denied - user has no participants in this group",
              {
                authUserId,
                userEmail,
                groupId: participantWithGroup.group.id,
                participantId,
              }
            );
            throw new Error("FORBIDDEN");
          }

          console.log(
            "[POST /api/participants/:participantId/wishlist/generate-ai] Access granted via group membership"
          );
        }
      } else {
        console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Access granted via direct ownership");
      }
    }

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Access validation passed");

    // Guard 8: Check if group end date has passed
    // FIX #6: Added end_date validation (was completely missing!)
    const now = new Date();
    const endDate = new Date(participantWithGroup.group.end_date);
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (nowDate > endDateOnly) {
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] End date passed", {
        participantId,
        endDate: participantWithGroup.group.end_date,
        endDateOnly: endDateOnly.toISOString(),
        nowDate: nowDate.toISOString(),
      });
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "END_DATE_PASSED",
          message: "Cannot generate AI wishlist after group end date has passed",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] End date validation passed");

    // Guard 9: Determine isRegistered based on authentication method
    // If user is authenticated with Bearer token, they are registered
    // If using participant token, check if participant has user_id set
    const isRegistered = authUserId ? true : !!participantWithGroup.user_id;
    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Registration status", {
      participantId,
      isRegistered,
    });

    // Guard 10: Check rate limit
    const rateLimitStatus = await openRouterService.validateRateLimit(participantId.toString(), isRegistered);

    if (!rateLimitStatus.canGenerate) {
      const rateLimitResponse: ApiErrorResponse = {
        error: {
          code: "AI_GENERATION_LIMIT_REACHED",
          message: "Wykorzystałeś wszystkie dostępne generowania AI",
        },
      };
      return new Response(JSON.stringify(rateLimitResponse), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Rate limit check passed", {
      participantId,
      generationsRemaining: rateLimitStatus.generationsRemaining,
    });

    // Happy path: Generate Santa letter FIRST
    let result;
    try {
      result = await openRouterService.generateSantaLetter(prompt, {
        participantName: participantWithGroup.name,
      });
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] AI generation successful", {
        participantId,
        participantName: participantWithGroup.name,
        letterLength: result.letterContent.length,
        suggestedGiftsCount: result.suggestedGifts.length,
      });

      // INCREMENT COUNTER AFTER SUCCESSFUL generation to prevent users losing generations on errors
      await openRouterService.incrementGenerationCount(participantId.toString());
      console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Generation counter incremented");
    } catch (error) {
      // Generation failed - counter is NOT incremented, user doesn't lose a generation
      console.error(
        "[POST /api/participants/:participantId/wishlist/generate-ai] AI generation failed (counter not incremented)",
        {
          participantId,
          error,
        }
      );
      throw error;
    }

    // Return success response
    // FIX #10: Response structure matches API spec (no extra metadata/suggested_gifts)
    const responseData = {
      generated_content: result.letterContent,
      remaining_generations: rateLimitStatus.generationsRemaining - 1, // Now decremented after success
      can_generate_more: rateLimitStatus.generationsRemaining - 1 > 0,
    };

    // FIX #19: Added CORS headers
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": import.meta.env.PUBLIC_SITE_URL || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  } catch (error) {
    console.error("[POST /api/participants/:participantId/wishlist/generate-ai] Error:", error);

    // Handle OpenRouter-specific errors
    if (error instanceof OpenRouterError) {
      let statusCode = 500;

      // Map error codes to HTTP status codes
      switch (error.code) {
        case "INVALID_INPUT":
        case "INVALID_REQUEST":
          statusCode = 400;
          break;
        case "RATE_LIMIT_EXCEEDED":
        case "GENERATION_LIMIT_EXCEEDED":
          statusCode = 429;
          break;
        case "UNAUTHORIZED":
          statusCode = 401;
          break;
        case "FORBIDDEN":
          statusCode = 403;
          break;
        case "NOT_FOUND":
          statusCode = 404;
          break;
        // FIX #2: Correct timeout mapping (504 Gateway Timeout, not 408)
        case "GATEWAY_TIMEOUT":
        case "TIMEOUT":
          statusCode = 504;
          break;
        case "NETWORK_ERROR":
          statusCode = 503;
          break;
        default:
          statusCode = 500;
      }

      const errorResponse: ApiErrorResponse = {
        error: {
          code: error.code,
          message: getUserFriendlyMessage(error),
          ...(error.isRetryable && { details: { isRetryable: true } }),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

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
              message: "You do not have permission to generate AI wishlist for this participant",
            },
          };
          return new Response(JSON.stringify(forbiddenResponse), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "END_DATE_PASSED": {
          const endDateResponse: ApiErrorResponse = {
            error: {
              code: "END_DATE_PASSED",
              message: "Cannot generate AI wishlist after group end date has passed",
            },
          };
          return new Response(JSON.stringify(endDateResponse), {
            status: 400,
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
    console.error("[POST /api/participants/:participantId/wishlist/generate-ai] Unexpected error details:", {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił nieoczekiwany błąd podczas generowania listy",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
