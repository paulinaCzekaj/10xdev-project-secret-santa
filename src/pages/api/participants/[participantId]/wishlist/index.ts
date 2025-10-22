import type { APIRoute } from "astro";
import { z } from "zod";
import { WishlistService } from "../../../../../lib/services/wishlist.service";
import { requireApiAuth } from "../../../../../lib/utils/api-auth.utils";
import type { ApiErrorResponse, CreateOrUpdateWishlistCommand, WishlistWithHtmlDTO } from "../../../../../types";

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
 * Zod schema for validating participant token query parameter
 */
const ParticipantTokenQuerySchema = z.object({
  token: z.string().optional(),
});

/**
 * Zod schema for validating wishlist update input
 *
 * Wishlist content must be provided and not empty.
 */
const CreateOrUpdateWishlistSchema = z.object({
  wishlist: z.string().min(1, "Wishlist content cannot be empty").max(10000, "Wishlist content is too long"),
});

/**
 * PUT /api/participants/:participantId/wishlist
 * Creates or updates a participant's wishlist
 *
 * Supports two authentication methods:
 * - Registered users: Bearer token in Authorization header
 * - Unregistered users: participant token in 'token' query parameter
 *
 * Blocks updates after the group end_date has passed.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @body CreateOrUpdateWishlistCommand (required: wishlist)
 * @returns {WishlistDTO} 200 - Created/updated wishlist details
 * @returns {ApiErrorResponse} 400 - End date passed or invalid input
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized to edit this wishlist
 * @returns {ApiErrorResponse} 404 - Participant not found
 * @returns {ApiErrorResponse} 422 - Missing required wishlist field
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required (Bearer token OR participant token)
 */
export const PUT: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[PUT /api/participants/:participantId/wishlist] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  let authUserId: string | null = null;
  let participantToken: string | null = null;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse and validate query parameters
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    const { token: queryToken } = ParticipantTokenQuerySchema.parse(queryParams);

    // Guard 3: Authentication - try Bearer token first, then participant token
    const userIdOrResponse = requireApiAuth({ locals, request, params });

    if (typeof userIdOrResponse === "string") {
      // Bearer token authentication successful
      authUserId = userIdOrResponse;
      participantToken = null;
      console.log("[PUT /api/participants/:participantId/wishlist] Bearer token authentication successful");
    } else {
      // Bearer token failed, try participant token
      if (!queryToken) {
        console.log("[PUT /api/participants/:participantId/wishlist] No authentication provided");
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

      // Use participant token
      authUserId = null;
      participantToken = queryToken;
      console.log("[PUT /api/participants/:participantId/wishlist] Using participant token authentication");
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
    const validatedData: CreateOrUpdateWishlistCommand = CreateOrUpdateWishlistSchema.parse(body);

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const wishlistService = new WishlistService(supabase);

    // Happy path: Create or update wishlist
    const wishlist = await wishlistService.createOrUpdateWishlist(
      participantId,
      validatedData,
      authUserId,
      participantToken
    );

    return new Response(JSON.stringify(wishlist), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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
              message: "You do not have permission to edit this wishlist",
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
              message: "Cannot update wishlist after group end date has passed",
            },
          };
          return new Response(JSON.stringify(endDateResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "Failed to create/update wishlist": {
          const dbErrorResponse: ApiErrorResponse = {
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to save wishlist",
            },
          };
          return new Response(JSON.stringify(dbErrorResponse), {
            status: 500,
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

      // Special handling for missing wishlist field
      if (error.errors.some((e) => e.path.includes("wishlist") && e.code === "too_small")) {
        errorResponse.error.code = "MISSING_REQUIRED_FIELD";
        return new Response(JSON.stringify(errorResponse), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log unexpected errors
    console.error("[PUT /api/participants/:participantId/wishlist] Unexpected error:", {
      participantId: params.participantId,
      authUserId,
      hasParticipantToken: !!participantToken,
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
 * GET /api/participants/:participantId/wishlist
 * Retrieves a participant's wishlist with HTML rendering and edit permissions
 *
 * Supports two authentication methods:
 * - Registered users: Bearer token in Authorization header
 * - Unregistered users: participant token in 'token' query parameter
 *
 * Returns wishlist with auto-linked URLs and information about edit permissions.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @returns {WishlistWithHtmlDTO} 200 - Wishlist with HTML content and edit permissions
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized to access this wishlist
 * @returns {ApiErrorResponse} 404 - Participant or wishlist not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required (Bearer token OR participant token)
 */
export const GET: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[GET /api/participants/:participantId/wishlist] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  let authUserId: string | null = null;
  let participantToken: string | null = null;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse and validate query parameters
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    const { token: queryToken } = ParticipantTokenQuerySchema.parse(queryParams);

    // Guard 3: Authentication - try Bearer token first, then participant token
    const userIdOrResponse = requireApiAuth({ locals, request, params });

    if (typeof userIdOrResponse === "string") {
      // Bearer token authentication successful
      authUserId = userIdOrResponse;
      participantToken = null;
      console.log("[GET /api/participants/:participantId/wishlist] Bearer token authentication successful");
    } else {
      // Bearer token failed, try participant token
      if (!queryToken) {
        console.log("[GET /api/participants/:participantId/wishlist] No authentication provided");
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

      // Use participant token
      authUserId = null;
      participantToken = queryToken;
      console.log("[GET /api/participants/:participantId/wishlist] Using participant token authentication");
    }

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const wishlistService = new WishlistService(supabase);

    // Happy path: Retrieve wishlist
    const wishlist: WishlistWithHtmlDTO = await wishlistService.getWishlist(
      participantId,
      authUserId,
      participantToken
    );

    return new Response(JSON.stringify(wishlist), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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

        case "WISHLIST_NOT_FOUND": {
          const wishlistNotFoundResponse: ApiErrorResponse = {
            error: {
              code: "NOT_FOUND",
              message: "Wishlist not found",
            },
          };
          return new Response(JSON.stringify(wishlistNotFoundResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "FORBIDDEN": {
          const forbiddenResponse: ApiErrorResponse = {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to access this wishlist",
            },
          };
          return new Response(JSON.stringify(forbiddenResponse), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "Failed to retrieve wishlist": {
          const dbErrorResponse: ApiErrorResponse = {
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to retrieve wishlist",
            },
          };
          return new Response(JSON.stringify(dbErrorResponse), {
            status: 500,
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

    // Log unexpected errors
    console.error("[GET /api/participants/:participantId/wishlist] Unexpected error:", {
      participantId: params.participantId,
      authUserId,
      hasParticipantToken: !!participantToken,
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
 * DELETE /api/participants/:participantId/wishlist
 * Deletes a participant's wishlist
 *
 * Supports two authentication methods:
 * - Registered users: Bearer token in Authorization header
 * - Unregistered users: participant token in 'token' query parameter
 *
 * Blocks deletion after the group end_date has passed.
 *
 * @param {number} participantId - Participant ID from URL parameter
 * @query {string} [token] - Access token for unregistered users (alternative to Bearer token)
 * @returns {void} 204 - Wishlist deleted successfully (no content)
 * @returns {ApiErrorResponse} 400 - End date passed
 * @returns {ApiErrorResponse} 401 - Not authenticated
 * @returns {ApiErrorResponse} 403 - Not authorized to delete this wishlist
 * @returns {ApiErrorResponse} 404 - Participant or wishlist not found
 * @returns {ApiErrorResponse} 500 - Internal server error
 *
 * @note Authentication required (Bearer token OR participant token)
 */
export const DELETE: APIRoute = async ({ params, request, locals, url }) => {
  console.log("[DELETE /api/participants/:participantId/wishlist] Endpoint hit", {
    participantId: params.participantId,
    method: request.method,
  });

  let authUserId: string | null = null;
  let participantToken: string | null = null;

  try {
    // Guard 1: Validate participantId parameter
    const { participantId } = ParticipantIdParamSchema.parse({ participantId: params.participantId });

    // Guard 2: Parse and validate query parameters
    const urlSearchParams = new URL(url).searchParams;
    const queryParams = Object.fromEntries(urlSearchParams.entries());
    const { token: queryToken } = ParticipantTokenQuerySchema.parse(queryParams);

    // Guard 3: Authentication - try Bearer token first, then participant token
    const userIdOrResponse = requireApiAuth({ locals, request, params });

    if (typeof userIdOrResponse === "string") {
      // Bearer token authentication successful
      authUserId = userIdOrResponse;
      participantToken = null;
      console.log("[DELETE /api/participants/:participantId/wishlist] Bearer token authentication successful");
    } else {
      // Bearer token failed, try participant token
      if (!queryToken) {
        console.log("[DELETE /api/participants/:participantId/wishlist] No authentication provided");
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

      // Use participant token
      authUserId = null;
      participantToken = queryToken;
      console.log("[DELETE /api/participants/:participantId/wishlist] Using participant token authentication");
    }

    // Get Supabase client and create service
    const supabase = locals.supabase;
    const wishlistService = new WishlistService(supabase);

    // Happy path: Delete wishlist
    await wishlistService.deleteWishlist(participantId, authUserId, participantToken);

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
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

        case "WISHLIST_NOT_FOUND": {
          const wishlistNotFoundResponse: ApiErrorResponse = {
            error: {
              code: "NOT_FOUND",
              message: "Wishlist not found",
            },
          };
          return new Response(JSON.stringify(wishlistNotFoundResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "FORBIDDEN": {
          const forbiddenResponse: ApiErrorResponse = {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to delete this wishlist",
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
              message: "Cannot delete wishlist after group end date has passed",
            },
          };
          return new Response(JSON.stringify(endDateResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        case "Failed to delete wishlist": {
          const dbErrorResponse: ApiErrorResponse = {
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to delete wishlist",
            },
          };
          return new Response(JSON.stringify(dbErrorResponse), {
            status: 500,
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

    // Log unexpected errors
    console.error("[DELETE /api/participants/:participantId/wishlist] Unexpected error:", {
      participantId: params.participantId,
      authUserId,
      hasParticipantToken: !!participantToken,
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
