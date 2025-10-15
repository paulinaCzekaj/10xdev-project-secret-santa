import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateOrUpdateWishlistCommand,
  WishlistDTO,
  WishlistWithHtmlDTO,
  ParticipantTokenQuery,
  UserId,
} from "../../types";

/**
 * Service for managing Secret Santa participant wishlists
 */
export class WishlistService {
  constructor(private supabase: SupabaseClient) {}

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
      await this.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup);

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
    participantWithGroup: any
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
  async getParticipantWithGroupInfo(id: number) {
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
      await this.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup);

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
      await this.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup);

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
   * Converts plain text URLs to clickable HTML links and preserves line breaks.
   *
   * @param wishlistText - The raw wishlist text content
   * @returns HTML string with auto-linked URLs
   *
   * @example
   * const html = service.renderWishlistHtml("Check out https://example.com\nAnd this site too");
   * // Returns: "Check out <a href='https://example.com'>https://example.com</a><br>And this site too"
   */
  private renderWishlistHtml(wishlistText: string): string {
    // Escape HTML characters for security
    const escaped = wishlistText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    // Auto-link URLs (simple regex for HTTP/HTTPS URLs)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const linked = escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Convert line breaks to <br> tags
    return linked.replace(/\n/g, "<br>");
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
