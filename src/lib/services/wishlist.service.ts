import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateOrUpdateWishlistCommand,
  WishlistDTO,
  WishlistWithHtmlDTO,
  ParticipantWithGroupDTO,
  UserId,
} from "../../types";
import { OpenRouterService } from "./openrouter.service";
import type { SantaLetterResponse, GenerationOptions, RateLimitStatus } from "./openrouter.types";
import { AI_MAX_GENERATIONS_REGISTERED, AI_MAX_GENERATIONS_UNREGISTERED } from "../../lib/constants/ai.constants";

/**
 * Service for managing Secret Santa participant wishlists
 */
export class WishlistService {
  private openRouterService: OpenRouterService | null = null;

  constructor(private supabase: SupabaseClient) {
    // OpenRouterService will be created lazily when needed
  }

  private getOpenRouterService(apiKey?: string): OpenRouterService {
    if (!this.openRouterService) {
      this.openRouterService = new OpenRouterService(this.supabase, apiKey ? { apiKey } : undefined);
    }
    return this.openRouterService;
  }

  /**
   * Creates or updates a participant's wishlist
   *
   * Validates access permissions, checks group end date, and performs UPSERT operation.
   * For registered users: verifies Bearer token ownership.
   * For unregistered users: verifies participant token.
   *
   * @param participantId - The participant ID whose wishlist to update
   * @param command - The wishlist content
   * @param authUserId - User ID from Bearer token (null for unregistered users)
   * @param participantToken - Access token from query param (null for registered users)
   * @returns WishlistDTO with the created/updated wishlist data
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the wishlist or token is invalid
   * @throws {Error} "END_DATE_PASSED" - If group end date has passed
   * @throws {Error} "Failed to create/update wishlist" - If database operation fails
   *
   * @example
   * const wishlist = await wishlistService.createOrUpdateWishlist(
   *   1,
   *   { wishlist: "I want a book and some chocolates" },
   *   "user-123",
   *   null
   * );
   * // Returns: { id: 1, participant_id: 1, wishlist: "...", updated_at: "2025-10-14T10:00:00Z" }
   */
  async createOrUpdateWishlist(
    participantId: number,
    command: CreateOrUpdateWishlistCommand,
    authUserId: UserId | null,
    participantToken: string | null
  ): Promise<WishlistDTO> {
    console.log("[WishlistService.createOrUpdateWishlist] Starting", {
      participantId,
      hasAuthUserId: !!authUserId,
      hasParticipantToken: !!participantToken,
      wishlistLength: command.wishlist.length,
    });

    try {
      // Step 1: Validate participant exists and get group info
      const participantWithGroup = await this.getParticipantWithGroupInfo(participantId);
      if (!participantWithGroup) {
        console.log("[WishlistService.createOrUpdateWishlist] Participant not found", { participantId });
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      console.log("[WishlistService.createOrUpdateWishlist] Participant found", {
        participantId,
        groupId: participantWithGroup.group_id,
        groupEndDate: participantWithGroup.group.end_date,
      });

      // Step 2: Validate access permissions
      // For wishlist editing, allow participants to edit their own wishlist
      // Access is granted if either participant token is valid OR Bearer token permissions are satisfied
      let hasAccess = false;

      // Check participant token validation
      if (participantToken) {
        // Case 1: Token matches the participant being edited (standard case)
        if (participantWithGroup.access_token === participantToken) {
          hasAccess = true;
          console.log("[WishlistService.createOrUpdateWishlist] Access granted via participant token");
        } else {
          // Case 2: Token belongs to an elf who is helping this participant
          const { data: elfParticipant, error: elfError } = await this.supabase
            .from("participants")
            .select("id, elf_for_participant_id")
            .eq("access_token", participantToken)
            .eq("elf_for_participant_id", participantId)
            .eq("group_id", participantWithGroup.group_id)
            .single();

          const isElfForParticipant = !elfError && elfParticipant !== null;

          if (isElfForParticipant) {
            hasAccess = true;
            console.log("[WishlistService.createOrUpdateWishlist] Access granted via elf participant token");
          } else {
            console.log("[WishlistService.createOrUpdateWishlist] Participant token validation failed", {
              providedToken: participantToken.substring(0, 8) + "...",
              storedToken: participantWithGroup.access_token?.substring(0, 8) + "...",
            });
          }
        }
      }

      // Check Bearer token permissions (if not already granted access)
      if (!hasAccess && authUserId) {
        // Allow access if user owns this participant OR if this participant belongs to the user
        // (participant may have user_id set, or may be linked by email)
        // OR if the user is an elf for this participant
        const isOwner = participantWithGroup.user_id === authUserId;

        if (!isOwner) {
          // Check if this specific participant belongs to the user
          // This covers cases where participant was added by email and user later registered
          const { data: userProfile, error: userError } = await this.supabase.auth.getUser();
          if (userError) {
            console.log("[WishlistService.createOrUpdateWishlist] Failed to get user profile", {
              error: userError.message,
            });
            // Don't throw here - just continue checking
          } else {
            const userEmail = userProfile?.user?.email;

            // Check if participant belongs to user via email (participant added by email before registration)
            const belongsViaEmail = userEmail && participantWithGroup.email === userEmail;

            // Check if user is an elf for this participant
            const { data: elfParticipant, error: elfError } = await this.supabase
              .from("participants")
              .select("id, elf_for_participant_id")
              .eq("user_id", authUserId)
              .eq("elf_for_participant_id", participantId)
              .eq("group_id", participantWithGroup.group_id)
              .single();

            const isElfForParticipant = !elfError && elfParticipant !== null;

            if (belongsViaEmail || isElfForParticipant) {
              hasAccess = true;
              if (belongsViaEmail) {
                console.log("[WishlistService.createOrUpdateWishlist] Access granted via email matching");
              } else if (isElfForParticipant) {
                console.log("[WishlistService.createOrUpdateWishlist] Access granted via elf relationship");
              }
            } else {
              console.log("[WishlistService.createOrUpdateWishlist] Bearer token permissions not satisfied", {
                authUserId,
                userEmail,
                participantId,
                participantUserId: participantWithGroup.user_id,
                participantEmail: participantWithGroup.email,
                isElfForParticipant,
              });
            }
          }
        } else {
          hasAccess = true;
          console.log("[WishlistService.createOrUpdateWishlist] Access granted via direct ownership");
        }
      }

      // Deny access if neither token nor Bearer permissions were satisfied
      if (!hasAccess) {
        console.log("[WishlistService.createOrUpdateWishlist] Access denied - no valid authentication method");
        throw new Error("FORBIDDEN");
      }

      // Step 3: Check if group end date has passed (compare only dates, ignore time)
      const now = new Date();
      const endDate = new Date(participantWithGroup.group.end_date);
      // Compare only dates (ignore time) - end date is inclusive
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      if (nowDate > endDateOnly) {
        console.log("[WishlistService.createOrUpdateWishlist] End date passed", {
          participantId,
          endDate: participantWithGroup.group.end_date,
          endDateOnly: endDateOnly.toISOString(),
          nowDate: nowDate.toISOString(),
        });
        throw new Error("END_DATE_PASSED");
      }

      console.log("[WishlistService.createOrUpdateWishlist] End date validation passed");

      // Step 4: Perform UPSERT operation
      const { data: wishlist, error } = await this.supabase
        .from("wishes")
        .upsert(
          {
            participant_id: participantId,
            wishlist: command.wishlist,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "participant_id",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error || !wishlist) {
        console.error("[WishlistService.createOrUpdateWishlist] Failed to upsert wishlist:", error);
        throw new Error("Failed to create/update wishlist");
      }

      console.log("[WishlistService.createOrUpdateWishlist] Wishlist upserted successfully", {
        participantId,
        wishlistId: wishlist.id,
      });

      return wishlist;
    } catch (error) {
      console.error("[WishlistService.createOrUpdateWishlist] Error:", error);
      throw error;
    }
  }

  /**
   * Validates whether a user or participant token has access to modify a specific wishlist
   *
   * For registered users: checks if the user_id matches the participant's user_id.
   * For unregistered users: checks if the token matches the participant's access_token.
   *
   * @param participantId - The participant ID being accessed
   * @param authUserId - User ID from Bearer token (null for unregistered users)
   * @param participantToken - Access token from query param (null for registered users)
   * @param participantWithGroup - Participant data with group info
   * @throws {Error} "FORBIDDEN" - If access is denied
   *
   * @example
   * await service.validateWishlistAccess(1, "user-123", null, participantData);
   * // Success for registered user
   *
   * await service.validateWishlistAccess(1, null, "token-abc", participantData);
   * // Success for unregistered user with valid token
   */
  async validateWishlistAccess(
    participantId: number,
    authUserId: UserId | null,
    participantToken: string | null,
    participantWithGroup: ParticipantWithGroupDTO
  ): Promise<void> {
    console.log("[WishlistService.validateWishlistAccess] Validating access", {
      participantId,
      hasAuthUserId: !!authUserId,
      hasParticipantToken: !!participantToken,
    });

    // Case 1: Registered user (Bearer token)
    if (authUserId) {
      if (participantWithGroup.user_id !== authUserId) {
        console.log("[WishlistService.validateWishlistAccess] Registered user access denied", {
          participantId,
          authUserId,
          participantUserId: participantWithGroup.user_id,
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[WishlistService.validateWishlistAccess] Registered user access granted");
      return;
    }

    // Case 2: Unregistered user (participant token)
    if (participantToken) {
      if (participantWithGroup.access_token !== participantToken) {
        console.log("[WishlistService.validateWishlistAccess] Participant token access denied", {
          participantId,
          providedToken: participantToken.substring(0, 8) + "...",
          storedToken: participantWithGroup.access_token?.substring(0, 8) + "...",
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[WishlistService.validateWishlistAccess] Participant token access granted");
      return;
    }

    // Case 3: No authentication provided
    console.log("[WishlistService.validateWishlistAccess] No authentication provided");
    throw new Error("FORBIDDEN");
  }

  /**
   * Retrieves a participant with associated group information
   *
   * Used for validation and business logic checks.
   * Includes group data needed for end date validation.
   *
   * @param id - The participant ID to retrieve
   * @returns Promise resolving to participant with group info, or null if not found
   *
   * @example
   * const participant = await service.getParticipantWithGroupInfo(123);
   * if (participant) {
   *   console.log(`Participant in group ${participant.group_id}`);
   * }
   */
  async getParticipantWithGroupInfo(id: number): Promise<ParticipantWithGroupDTO | null> {
    console.log("[WishlistService.getParticipantWithGroupInfo] Starting", { participantId: id });

    try {
      const { data, error } = await this.supabase
        .from("participants")
        .select(
          `
          *,
          group:groups (
            id,
            end_date,
            creator_id
          )
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.log("[WishlistService.getParticipantWithGroupInfo] Participant not found", {
          participantId: id,
          error: error?.message,
        });
        return null;
      }

      console.log("[WishlistService.getParticipantWithGroupInfo] Participant found", {
        participantId: id,
        groupId: data.group_id,
      });

      return data;
    } catch (error) {
      console.error("[WishlistService.getParticipantWithGroupInfo] Error:", error);
      throw error;
    }
  }

  /**
   * Retrieves a participant's wishlist with HTML rendering and edit permissions
   *
   * Validates access permissions and returns wishlist with auto-linked URLs and edit capability info.
   * For registered users: verifies Bearer token ownership.
   * For unregistered users: verifies participant token.
   *
   * @param participantId - The participant ID whose wishlist to retrieve
   * @param authUserId - User ID from Bearer token (null for unregistered users)
   * @param participantToken - Access token from query param (null for registered users)
   * @returns WishlistWithHtmlDTO with HTML-rendered content and edit permissions
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the wishlist or token is invalid
   * @throws {Error} "WISHLIST_NOT_FOUND" - If wishlist doesn't exist
   *
   * @example
   * const wishlist = await wishlistService.getWishlist(1, "user-123", null);
   * // Returns: { id: 1, participant_id: 1, wishlist: "...", wishlist_html: "...", updated_at: "...", can_edit: true }
   */
  async getWishlist(
    participantId: number,
    authUserId: UserId | null,
    participantToken: string | null
  ): Promise<WishlistWithHtmlDTO> {
    console.log("[WishlistService.getWishlist] Starting", {
      participantId,
      hasAuthUserId: !!authUserId,
      hasParticipantToken: !!participantToken,
    });

    try {
      // Step 1: Validate participant exists and get group info
      const participantWithGroup = await this.getParticipantWithGroupInfo(participantId);
      if (!participantWithGroup) {
        console.log("[WishlistService.getWishlist] Participant not found", { participantId });
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      console.log("[WishlistService.getWishlist] Participant found", {
        participantId,
        groupId: participantWithGroup.group_id,
        groupEndDate: participantWithGroup.group.end_date,
      });

      // Step 2: Validate access permissions
      // For wishlist reading, allow participants to read their own wishlist
      // Access is granted if either participant token is valid OR Bearer token permissions are satisfied
      let hasAccess = false;

      // Check participant token validation
      if (participantToken) {
        // Case 1: Token matches the participant being read (standard case)
        if (participantWithGroup.access_token === participantToken) {
          hasAccess = true;
          console.log("[WishlistService.getWishlist] Access granted via participant token");
        } else {
          // Case 2: Token belongs to an elf who is helping this participant
          const { data: elfParticipant, error: elfError } = await this.supabase
            .from("participants")
            .select("id, elf_for_participant_id")
            .eq("access_token", participantToken)
            .eq("elf_for_participant_id", participantId)
            .eq("group_id", participantWithGroup.group_id)
            .single();

          const isElfForParticipant = !elfError && elfParticipant !== null;

          if (isElfForParticipant) {
            hasAccess = true;
            console.log("[WishlistService.getWishlist] Access granted via elf participant token");
          } else {
            console.log("[WishlistService.getWishlist] Participant token validation failed", {
              providedToken: participantToken.substring(0, 8) + "...",
              storedToken: participantWithGroup.access_token?.substring(0, 8) + "...",
            });
          }
        }
      }

      // Check Bearer token permissions (if not already granted access)
      if (!hasAccess && authUserId) {
        // Allow access if user owns this participant OR if this participant belongs to the user
        // (participant may have user_id set, or may be linked by email)
        // OR if the user is an elf for this participant
        const isOwner = participantWithGroup.user_id === authUserId;

        if (!isOwner) {
          // Check if this specific participant belongs to the user
          // This covers cases where participant was added by email and user later registered
          const { data: userProfile, error: userError } = await this.supabase.auth.getUser();
          if (userError) {
            console.log("[WishlistService.getWishlist] Failed to get user profile", { error: userError.message });
            // Don't throw here - just continue checking
          } else {
            const userEmail = userProfile?.user?.email;

            // Check if participant belongs to user via email (participant added by email before registration)
            const belongsViaEmail = userEmail && participantWithGroup.email === userEmail;

            // Check if user is an elf for this participant
            const { data: elfParticipant, error: elfError } = await this.supabase
              .from("participants")
              .select("id, elf_for_participant_id")
              .eq("user_id", authUserId)
              .eq("elf_for_participant_id", participantId)
              .eq("group_id", participantWithGroup.group_id)
              .single();

            const isElfForParticipant = !elfError && elfParticipant !== null;

            if (belongsViaEmail || isElfForParticipant) {
              hasAccess = true;
              if (belongsViaEmail) {
                console.log("[WishlistService.getWishlist] Access granted via email matching");
              } else if (isElfForParticipant) {
                console.log("[WishlistService.getWishlist] Access granted via elf relationship");
              }
            } else {
              console.log("[WishlistService.getWishlist] Bearer token permissions not satisfied", {
                authUserId,
                userEmail,
                participantId,
                participantUserId: participantWithGroup.user_id,
                participantEmail: participantWithGroup.email,
                isElfForParticipant,
              });
            }
          }
        } else {
          hasAccess = true;
          console.log("[WishlistService.getWishlist] Access granted via direct ownership");
        }
      }

      // Deny access if neither token nor Bearer permissions were satisfied
      if (!hasAccess) {
        console.log("[WishlistService.getWishlist] Access denied - no valid authentication method");
        throw new Error("FORBIDDEN");
      }

      // Step 3: Retrieve wishlist
      const { data: wishlist, error } = await this.supabase
        .from("wishes")
        .select("*")
        .eq("participant_id", participantId)
        .single();

      if (error || !wishlist) {
        console.log("[WishlistService.getWishlist] Wishlist not found", {
          participantId,
          error: error?.message,
        });
        throw new Error("WISHLIST_NOT_FOUND");
      }

      console.log("[WishlistService.getWishlist] Wishlist found", {
        participantId,
        wishlistId: wishlist.id,
      });

      // Step 4: Render HTML with auto-linked URLs
      const wishlistHtml = this.renderWishlistHtml(wishlist.wishlist);

      // Step 5: Determine if user can edit (group end_date hasn't passed)
      const canEdit = this.canEditWishlist(participantWithGroup.group.end_date);

      const result: WishlistWithHtmlDTO = {
        ...wishlist,
        wishlist_html: wishlistHtml,
        can_edit: canEdit,
      };

      console.log("[WishlistService.getWishlist] Wishlist retrieved successfully", {
        participantId,
        wishlistId: wishlist.id,
        canEdit,
      });

      return result;
    } catch (error) {
      console.error("[WishlistService.getWishlist] Error:", error);
      throw error;
    }
  }

  /**
   * Generates a personalized Santa letter using AI based on participant's existing wishlist
   *
   * Retrieves the participant's wishlist content and uses it as input for AI generation.
   * Validates access permissions, rate limits, and group end date before generation.
   * For registered users: verifies Bearer token ownership.
   * For unregistered users: verifies participant token.
   *
   * @param participantId - The participant ID whose wishlist to use for generation
   * @param authUserId - User ID from Bearer token (null for unregistered users)
   * @param participantToken - Access token from query param (null for registered users)
   * @param options - Optional generation options (language, etc.)
   * @returns Promise resolving to generated Santa letter with content, metadata, and rate limit info
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the wishlist or token is invalid
   * @throws {Error} "END_DATE_PASSED" - If group end date has passed
   * @throws {Error} "WISHLIST_NOT_FOUND" - If wishlist doesn't exist or is empty
   * @throws {OpenRouterError} Various AI generation errors (rate limit, timeout, etc.)
   *
   * @example
   * const result = await wishlistService.generateSantaLetterFromWishlist(1, "user-123", null);
   * console.log(result.letter.letterContent); // Generated Santa letter
   * console.log(result.remainingGenerations); // Remaining quota
   */
  async generateSantaLetterFromWishlist(
    participantId: number,
    authUserId: UserId | null,
    participantToken: string | null,
    options?: GenerationOptions,
    openRouterApiKey?: string
  ): Promise<{
    letter: SantaLetterResponse;
    remainingGenerations: number;
    canGenerateMore: boolean;
    isRegistered: boolean;
  }> {
    console.log("[WishlistService.generateSantaLetterFromWishlist] Starting", {
      participantId,
      hasAuthUserId: !!authUserId,
      hasParticipantToken: !!participantToken,
    });

    try {
      // Step 1: Validate participant exists and get group info
      const participantWithGroup = await this.getParticipantWithGroupInfo(participantId);
      if (!participantWithGroup) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] Participant not found", { participantId });
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      console.log("[WishlistService.generateSantaLetterFromWishlist] Participant found", {
        participantId,
        groupId: participantWithGroup.group_id,
        groupEndDate: participantWithGroup.group.end_date,
      });

      // Step 2: Validate access permissions
      // For AI generation, allow participants to generate for their own status
      // Access is granted if either participant token is valid OR Bearer token permissions are satisfied
      let hasAccess = false;

      // Check participant token validation
      if (participantToken) {
        // Case 1: Token matches the participant whose wishlist is being generated (standard case)
        if (participantWithGroup.access_token === participantToken) {
          hasAccess = true;
          console.log("[WishlistService.generateSantaLetterFromWishlist] Access granted via participant token");
        } else {
          // Case 2: Token belongs to an elf who is helping this participant
          const { data: elfParticipant, error: elfError } = await this.supabase
            .from("participants")
            .select("id, elf_for_participant_id")
            .eq("access_token", participantToken)
            .eq("elf_for_participant_id", participantId)
            .eq("group_id", participantWithGroup.group_id)
            .single();

          const isElfForParticipant = !elfError && elfParticipant !== null;

          if (isElfForParticipant) {
            hasAccess = true;
            console.log("[WishlistService.generateSantaLetterFromWishlist] Access granted via elf participant token");
          } else {
            console.log("[WishlistService.generateSantaLetterFromWishlist] Participant token validation failed", {
              providedToken: participantToken.substring(0, 8) + "...",
              storedToken: participantWithGroup.access_token?.substring(0, 8) + "...",
            });
          }
        }
      }

      // Check Bearer token permissions (if not already granted access)
      if (!hasAccess && authUserId) {
        // Allow access if user owns this participant OR if this participant belongs to the user
        // (participant may have user_id set, or may be linked by email)
        // OR if the user is an elf for this participant
        const isOwner = participantWithGroup.user_id === authUserId;

        if (!isOwner) {
          // Check if this specific participant belongs to the user
          // This covers cases where participant was added by email and user later registered
          const { data: userProfile, error: userError } = await this.supabase.auth.getUser();
          if (userError) {
            console.log("[WishlistService.generateSantaLetterFromWishlist] Failed to get user profile", {
              error: userError.message,
            });
            // Don't throw here - just continue checking
          } else {
            const userEmail = userProfile?.user?.email;

            // Check if participant belongs to user via email (participant added by email before registration)
            const belongsViaEmail = userEmail && participantWithGroup.email === userEmail;

            // Check if user is an elf for this participant
            const { data: elfParticipant, error: elfError } = await this.supabase
              .from("participants")
              .select("id, elf_for_participant_id")
              .eq("user_id", authUserId)
              .eq("elf_for_participant_id", participantId)
              .eq("group_id", participantWithGroup.group_id)
              .single();

            const isElfForParticipant = !elfError && elfParticipant !== null;

            if (belongsViaEmail || isElfForParticipant) {
              hasAccess = true;
              if (belongsViaEmail) {
                console.log("[WishlistService.generateSantaLetterFromWishlist] Access granted via email matching");
              } else if (isElfForParticipant) {
                console.log("[WishlistService.generateSantaLetterFromWishlist] Access granted via elf relationship");
              }
            } else {
              console.log("[WishlistService.generateSantaLetterFromWishlist] Bearer token permissions not satisfied", {
                authUserId,
                userEmail,
                participantId,
                participantUserId: participantWithGroup.user_id,
                participantEmail: participantWithGroup.email,
                isElfForParticipant,
              });
            }
          }
        } else {
          hasAccess = true;
          console.log("[WishlistService.generateSantaLetterFromWishlist] Access granted via direct ownership");
        }
      }

      // Deny access if neither token nor Bearer permissions were satisfied
      if (!hasAccess) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] Access denied - no valid authentication method");
        throw new Error("FORBIDDEN");
      }

      // Step 3: Check if group end date has passed
      const now = new Date();
      const endDate = new Date(participantWithGroup.group.end_date);
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      if (nowDate > endDateOnly) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] End date passed", {
          participantId,
          endDate: participantWithGroup.group.end_date,
          endDateOnly: endDateOnly.toISOString(),
          nowDate: nowDate.toISOString(),
        });
        throw new Error("END_DATE_PASSED");
      }

      console.log("[WishlistService.generateSantaLetterFromWishlist] End date validation passed");

      // Step 4: Retrieve existing wishlist
      const { data: wishlist, error } = await this.supabase
        .from("wishes")
        .select("*")
        .eq("participant_id", participantId)
        .single();

      if (error || !wishlist) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] Wishlist not found", {
          participantId,
          error: error?.message,
        });
        throw new Error("WISHLIST_NOT_FOUND");
      }

      // Step 5: Validate wishlist has content
      const wishlistContent = wishlist.wishlist?.trim();
      if (!wishlistContent || wishlistContent.length === 0) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] Wishlist is empty", {
          participantId,
          wishlistLength: wishlistContent?.length || 0,
        });
        throw new Error("WISHLIST_EMPTY");
      }

      console.log("[WishlistService.generateSantaLetterFromWishlist] Wishlist found", {
        participantId,
        wishlistId: wishlist.id,
        wishlistLength: wishlistContent.length,
      });

      // Step 6: Check rate limits
      // Determine isRegistered based on authentication method
      // If user is authenticated with Bearer token, they are registered
      // If using participant token, check if participant has user_id set
      const isRegistered = authUserId ? true : !!participantWithGroup.user_id;

      const rateLimitStatus = await this.validateAIGenerationLimit(participantId, isRegistered);

      if (!rateLimitStatus.canGenerate) {
        console.log("[WishlistService.generateSantaLetterFromWishlist] Rate limit exceeded", {
          participantId,
          generationsUsed: rateLimitStatus.generationsUsed,
          maxGenerations: rateLimitStatus.maxGenerations,
        });
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      console.log("[WishlistService.generateSantaLetterFromWishlist] Rate limit check passed", {
        participantId,
        generationsRemaining: rateLimitStatus.generationsRemaining,
      });

      // Step 7: Generate Santa letter using wishlist content as prompt FIRST
      let generatedLetter: SantaLetterResponse;
      try {
        generatedLetter = await this.getOpenRouterService(openRouterApiKey).generateSantaLetter(
          wishlistContent,
          options
        );
        console.log("[WishlistService.generateSantaLetterFromWishlist] AI generation successful", {
          participantId,
          letterLength: generatedLetter.letterContent.length,
          suggestedGiftsCount: generatedLetter.suggestedGifts.length,
        });

        // Step 8: Increment generation counter AFTER successful generation
        await this.incrementAIGenerationCount(participantId);
        console.log("[WishlistService.generateSantaLetterFromWishlist] Generation counter incremented");
      } catch (generationError) {
        // Generation failed - counter is NOT incremented, user doesn't lose a generation
        console.error("[WishlistService.generateSantaLetterFromWishlist] AI generation failed", {
          participantId,
          error: generationError,
        });
        throw generationError;
      }

      // Step 9: Calculate remaining generations (now decremented after success)
      const remainingGenerations = rateLimitStatus.generationsRemaining - 1;
      const canGenerateMore = remainingGenerations > 0;

      const result = {
        letter: generatedLetter,
        remainingGenerations,
        canGenerateMore,
        isRegistered,
      };

      console.log("[WishlistService.generateSantaLetterFromWishlist] Generation completed successfully", {
        participantId,
        remainingGenerations,
        canGenerateMore,
      });

      return result;
    } catch (error) {
      console.error("[WishlistService.generateSantaLetterFromWishlist] Error:", error);
      throw error;
    }
  }

  /**
   * Deletes a participant's wishlist
   *
   * Validates access permissions, checks group end date hasn't passed, and deletes the wishlist.
   * For registered users: verifies Bearer token ownership.
   * For unregistered users: verifies participant token.
   *
   * @param participantId - The participant ID whose wishlist to delete
   * @param authUserId - User ID from Bearer token (null for unregistered users)
   * @param participantToken - Access token from query param (null for registered users)
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the wishlist or token is invalid
   * @throws {Error} "END_DATE_PASSED" - If group end date has passed
   * @throws {Error} "WISHLIST_NOT_FOUND" - If wishlist doesn't exist
   * @throws {Error} "Failed to delete wishlist" - If database operation fails
   *
   * @example
   * await wishlistService.deleteWishlist(1, "user-123", null);
   * // Wishlist deleted successfully
   */
  async deleteWishlist(
    participantId: number,
    authUserId: UserId | null,
    participantToken: string | null
  ): Promise<void> {
    console.log("[WishlistService.deleteWishlist] Starting", {
      participantId,
      hasAuthUserId: !!authUserId,
      hasParticipantToken: !!participantToken,
    });

    try {
      // Step 1: Validate participant exists and get group info
      const participantWithGroup = await this.getParticipantWithGroupInfo(participantId);
      if (!participantWithGroup) {
        console.log("[WishlistService.deleteWishlist] Participant not found", { participantId });
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      console.log("[WishlistService.deleteWishlist] Participant found", {
        participantId,
        groupId: participantWithGroup.group_id,
        groupEndDate: participantWithGroup.group.end_date,
      });

      // Step 2: Validate access permissions
      // For wishlist deletion, allow participants to delete their own wishlist
      // Access is granted if either participant token is valid OR Bearer token permissions are satisfied
      let hasAccess = false;

      // Check participant token validation
      if (participantToken) {
        // Case 1: Token matches the participant being deleted (standard case)
        if (participantWithGroup.access_token === participantToken) {
          hasAccess = true;
          console.log("[WishlistService.deleteWishlist] Access granted via participant token");
        } else {
          // Case 2: Token belongs to an elf who is helping this participant
          const { data: elfParticipant, error: elfError } = await this.supabase
            .from("participants")
            .select("id, elf_for_participant_id")
            .eq("access_token", participantToken)
            .eq("elf_for_participant_id", participantId)
            .eq("group_id", participantWithGroup.group_id)
            .single();

          const isElfForParticipant = !elfError && elfParticipant !== null;

          if (isElfForParticipant) {
            hasAccess = true;
            console.log("[WishlistService.deleteWishlist] Access granted via elf participant token");
          } else {
            console.log("[WishlistService.deleteWishlist] Participant token validation failed", {
              providedToken: participantToken.substring(0, 8) + "...",
              storedToken: participantWithGroup.access_token?.substring(0, 8) + "...",
            });
          }
        }
      }

      // Check Bearer token permissions (if not already granted access)
      if (!hasAccess && authUserId) {
        // Allow access if user owns this participant OR if this participant belongs to the user
        // (participant may have user_id set, or may be linked by email)
        // OR if the user is an elf for this participant
        const isOwner = participantWithGroup.user_id === authUserId;

        if (!isOwner) {
          // Check if this specific participant belongs to the user
          // This covers cases where participant was added by email and user later registered
          const { data: userProfile, error: userError } = await this.supabase.auth.getUser();
          if (userError) {
            console.log("[WishlistService.deleteWishlist] Failed to get user profile", { error: userError.message });
            // Don't throw here - just continue checking
          } else {
            const userEmail = userProfile?.user?.email;

            // Check if participant belongs to user via email (participant added by email before registration)
            const belongsViaEmail = userEmail && participantWithGroup.email === userEmail;

            // Check if user is an elf for this participant
            const { data: elfParticipant, error: elfError } = await this.supabase
              .from("participants")
              .select("id, elf_for_participant_id")
              .eq("user_id", authUserId)
              .eq("elf_for_participant_id", participantId)
              .eq("group_id", participantWithGroup.group_id)
              .single();

            const isElfForParticipant = !elfError && elfParticipant !== null;

            if (belongsViaEmail || isElfForParticipant) {
              hasAccess = true;
              if (belongsViaEmail) {
                console.log("[WishlistService.deleteWishlist] Access granted via email matching");
              } else if (isElfForParticipant) {
                console.log("[WishlistService.deleteWishlist] Access granted via elf relationship");
              }
            } else {
              console.log("[WishlistService.deleteWishlist] Bearer token permissions not satisfied", {
                authUserId,
                userEmail,
                participantId,
                participantUserId: participantWithGroup.user_id,
                participantEmail: participantWithGroup.email,
                isElfForParticipant,
              });
            }
          }
        } else {
          hasAccess = true;
          console.log("[WishlistService.deleteWishlist] Access granted via direct ownership");
        }
      }

      // Deny access if neither token nor Bearer permissions were satisfied
      if (!hasAccess) {
        console.log("[WishlistService.deleteWishlist] Access denied - no valid authentication method");
        throw new Error("FORBIDDEN");
      }

      // Step 3: Check if group end date has passed (DELETE is blocked after end_date)
      const now = new Date();
      const endDate = new Date(participantWithGroup.group.end_date);
      // Compare only dates (ignore time) - end date is inclusive
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      if (nowDate > endDateOnly) {
        console.log("[WishlistService.deleteWishlist] End date passed", {
          participantId,
          endDate: participantWithGroup.group.end_date,
          endDateOnly: endDateOnly.toISOString(),
          nowDate: nowDate.toISOString(),
        });
        throw new Error("END_DATE_PASSED");
      }

      console.log("[WishlistService.deleteWishlist] End date validation passed");

      // Step 4: Check if wishlist exists
      const { data: existingWishlist, error: checkError } = await this.supabase
        .from("wishes")
        .select("id")
        .eq("participant_id", participantId)
        .single();

      if (checkError || !existingWishlist) {
        console.log("[WishlistService.deleteWishlist] Wishlist not found", {
          participantId,
          error: checkError?.message,
        });
        throw new Error("WISHLIST_NOT_FOUND");
      }

      // Step 5: Delete wishlist
      const { error } = await this.supabase.from("wishes").delete().eq("participant_id", participantId);

      if (error) {
        console.error("[WishlistService.deleteWishlist] Failed to delete wishlist:", error);
        throw new Error("Failed to delete wishlist");
      }

      console.log("[WishlistService.deleteWishlist] Wishlist deleted successfully", {
        participantId,
        wishlistId: existingWishlist.id,
      });
    } catch (error) {
      console.error("[WishlistService.deleteWishlist] Error:", error);
      throw error;
    }
  }

  /**
   * Renders wishlist content as HTML with auto-linked URLs
   *
   * FIX #4: Completely rewritten to prevent XSS vulnerability
   * - URLs are detected BEFORE HTML escaping (so & in URLs work correctly)
   * - Each text/URL fragment is escaped separately
   * - URLs in href attributes are properly escaped
   * - Prevents ReDoS with bounded regex
   *
   * Converts plain text URLs to clickable HTML links and preserves line breaks.
   *
   * @param wishlistText - The raw wishlist text content
   * @returns HTML string with auto-linked URLs
   *
   * @example
   * const html = service.renderWishlistHtml("Check out https://example.com?foo=bar&baz=qux\nAnd this site too");
   * // Returns: "Check out <a href='https://example.com?foo=bar&amp;baz=qux'>https://example.com?foo=bar&amp;baz=qux</a><br>And this site too"
   */
  private renderWishlistHtml(wishlistText: string): string {
    let result = "";
    let i = 0;

    while (i < wishlistText.length) {
      // Look for markdown links [text](url)
      if (wishlistText[i] === "[") {
        const bracketStart = i;
        const bracketEnd = wishlistText.indexOf("]", i);

        if (bracketEnd !== -1 && bracketEnd + 1 < wishlistText.length && wishlistText[bracketEnd + 1] === "(") {
          const parenStart = bracketEnd + 1;
          // Find the matching closing parenthesis for the URL
          // We need to handle nested parentheses in URLs
          let parenCount = 1;
          let parenEnd = parenStart + 1;

          while (parenEnd < wishlistText.length && parenCount > 0) {
            if (wishlistText[parenEnd] === "(") {
              parenCount++;
            } else if (wishlistText[parenEnd] === ")") {
              parenCount--;
            }
            parenEnd++;
          }

          // Check if we found a valid markdown link
          if (parenCount === 0 && parenEnd <= wishlistText.length) {
            const linkText = wishlistText.slice(bracketStart + 1, bracketEnd);
            const url = wishlistText.slice(parenStart + 1, parenEnd - 1);

            // Escape the link text and URL
            const escapedText = linkText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#x27;");

            const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

            result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;

            i = parenEnd;
            continue;
          }
        }
      }

      // Look for plain URLs
      if (wishlistText.startsWith("http://", i) || wishlistText.startsWith("https://", i)) {
        const urlStart = i;
        let urlEnd = i;

        // Find the end of the URL (stops at whitespace or end of text)
        while (urlEnd < wishlistText.length && !/\s/.test(wishlistText[urlEnd])) {
          urlEnd++;
        }

        const url = wishlistText.slice(urlStart, urlEnd);

        // Escape the URL
        const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

        result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;

        i = urlEnd;
        continue;
      }

      // Regular character - escape it
      const char = wishlistText[i];
      if (char === "&") {
        result += "&amp;";
      } else if (char === "<") {
        result += "&lt;";
      } else if (char === ">") {
        result += "&gt;";
      } else if (char === '"') {
        result += "&quot;";
      } else if (char === "'") {
        result += "&#x27;";
      } else if (char === "\n") {
        result += "<br>";
      } else {
        result += char;
      }

      i++;
    }

    return result;
  }

  /**
   * Validates AI generation rate limit for a participant
   *
   * Checks the participant's AI generation quota without requiring API key.
   * Used for status checks and quota validation.
   *
   * @param participantId - The participant ID to check
   * @param isRegistered - Whether the participant is a registered user
   * @returns Promise resolving to rate limit status
   * @throws {Error} "INVALID_INPUT" - Invalid participant ID format
   * @throws {Error} "SERVER_ERROR" - Database error occurred
   *
   * @example
   * const status = await service.validateAIGenerationLimit(123, true);
   * if (status.canGenerate) {
   *   console.log(`Can generate. Remaining: ${status.generationsRemaining}`);
   * }
   */
  async validateAIGenerationLimit(participantId: number, isRegistered: boolean): Promise<RateLimitStatus> {
    if (isNaN(participantId) || participantId <= 0) {
      console.error("[WishlistService.validateAIGenerationLimit] Invalid participant ID", { participantId });
      throw new Error("INVALID_INPUT");
    }

    try {
      const { data, error } = await this.supabase
        .from("wishes")
        .select("ai_generation_count_per_group, ai_last_generated_at")
        .eq("participant_id", participantId)
        .single();

      if (error) {
        // If no wishlist exists yet, participant can generate
        if (error.code === "PGRST116") {
          const maxGenerations = isRegistered ? AI_MAX_GENERATIONS_REGISTERED : AI_MAX_GENERATIONS_UNREGISTERED;
          return {
            canGenerate: true,
            generationsUsed: 0,
            generationsRemaining: maxGenerations,
            maxGenerations,
            lastGeneratedAt: null,
          };
        }
        throw error;
      }

      const maxGenerations = isRegistered ? AI_MAX_GENERATIONS_REGISTERED : AI_MAX_GENERATIONS_UNREGISTERED;
      const currentCount = data.ai_generation_count_per_group || 0;

      return {
        canGenerate: currentCount < maxGenerations,
        generationsUsed: currentCount,
        generationsRemaining: Math.max(0, maxGenerations - currentCount),
        maxGenerations,
        lastGeneratedAt: data.ai_last_generated_at ? new Date(data.ai_last_generated_at) : null,
      };
    } catch (error) {
      console.error("[WishlistService.validateAIGenerationLimit] Database error:", error);
      throw new Error("SERVER_ERROR");
    }
  }

  /**
   * Atomically increments AI generation count for a participant
   *
   * Updates the participant's AI generation counter using a SECURITY DEFINER
   * database function. Creates a wishlist record if it doesn't exist (UPSERT).
   *
   * This should be called AFTER successful AI generation to prevent users from
   * losing quota on failed generations. The counter is only incremented when
   * generation succeeds.
   *
   * @param participantId - The participant ID
   * @throws {Error} "INVALID_INPUT" - Invalid participant ID format
   * @throws {Error} "SERVER_ERROR" - Database error occurred
   *
   * @example
   * // Generate AI content first
   * const result = await generateAIContent(prompt);
   * // Increment counter only after successful generation
   * await service.incrementAIGenerationCount(123);
   */
  async incrementAIGenerationCount(participantId: number): Promise<void> {
    if (isNaN(participantId) || participantId <= 0) {
      console.error("[WishlistService.incrementAIGenerationCount] Invalid participant ID", { participantId });
      throw new Error("INVALID_INPUT");
    }

    try {
      const { error } = await this.supabase.rpc("increment_ai_generation_count", {
        p_participant_id: participantId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("[WishlistService.incrementAIGenerationCount] Database error:", error);
      throw new Error("SERVER_ERROR");
    }
  }

  /**
   * Determines if a wishlist can be edited based on group end date
   *
   * @param groupEndDate - The group's end date as ISO string
   * @returns true if current time is before end date, false otherwise
   *
   * @example
   * const canEdit = service.canEditWishlist("2025-12-25T23:59:59Z");
   * // Returns: true (if current time is before Christmas 2025)
   */
  private canEditWishlist(groupEndDate: string): boolean {
    const now = new Date();
    const endDate = new Date(groupEndDate);
    return now <= endDate;
  }
}
