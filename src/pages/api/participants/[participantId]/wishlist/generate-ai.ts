import type { APIRoute } from "astro";
import { z } from "zod";
import { OpenRouterService } from "@/lib/services/openrouter.service";
import { OpenRouterError, getUserFriendlyMessage } from "@/lib/services/openrouter.error";
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
 * Zod schema for validating request body for AI generation
 */
const GenerateAISchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(1000, "Prompt cannot exceed 1000 characters"),
  isRegistered: z.boolean().optional().default(false),
});

/**
 * POST /api/participants/:participantId/wishlist/generate-ai
 * Generates a personalized Santa letter using AI based on user preferences
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @body GenerateAIRequest (required: prompt, optional: isRegistered)
 * @returns {GenerateAIResponse} 200 - Generated Santa letter and suggestions
 * @returns {ApiErrorResponse} 400 - Invalid input or rate limit exceeded
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 429 - Rate limit exceeded
 * @returns {ApiErrorResponse} 500 - Internal server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  console.log("[POST /api/participants/:participantId/wishlist/generate-ai] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse request body
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

    // Guard 3: Validate request body
    const validatedData = GenerateAISchema.parse(body);
    const { prompt, isRegistered } = validatedData;

    // Initialize OpenRouter service
    const supabase = locals.supabase;
    const openRouterService = new OpenRouterService(supabase);

    // Guard 4: Check rate limit
    const rateLimitStatus = await openRouterService.validateRateLimit(participantId.toString(), isRegistered);

    if (!rateLimitStatus.canGenerate) {
      const rateLimitResponse: ApiErrorResponse = {
        error: {
          code: "GENERATION_LIMIT_EXCEEDED",
          message: "Wykorzystałeś wszystkie dostępne generowania AI",
        },
      };
      return new Response(JSON.stringify(rateLimitResponse), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Happy path: Generate Santa letter
    const result = await openRouterService.generateSantaLetter(prompt, { language: "pl" });

    // Increment generation count
    await openRouterService.incrementGenerationCount(participantId.toString());

    // Return success response
    const responseData = {
      generated_content: result.letterContent,
      suggested_gifts: result.suggestedGifts,
      remaining_generations: rateLimitStatus.generationsRemaining - 1,
      can_generate_more: rateLimitStatus.generationsRemaining - 1 > 0,
      metadata: result.metadata,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
        case "TIMEOUT":
        case "NETWORK_ERROR":
          statusCode = 408;
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
        message: "Wystąpił nieoczekiwany błąd podczas generowania listy",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
