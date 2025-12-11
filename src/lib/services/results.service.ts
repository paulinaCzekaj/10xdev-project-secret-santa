import type { SupabaseClient } from "../../db/supabase.client";
import type {
  DrawResultResponseDTO,
  ResultGroupInfo,
  ResultParticipantInfo,
  ResultAssignedParticipant,
  ResultMyWishlist,
  WishlistStats,
  UserId,
} from "../../types";

/**
 * Type for full participant data from database
 */
interface ParticipantDataFromDB {
  id: number;
  group_id: number;
  user_id: string | null;
  name: string;
  email: string | null;
  result_viewed_at: string | null;
  elf_participant_id: number | null;
}

/**
 * Type for assigned participant data used in formatting
 */
interface AssignedParticipantData {
  id: number;
  name: string;
}

/**
 * Service for managing Secret Santa draw results retrieval
 */
export class ResultsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves draw result for an authenticated user
   *
   * @param groupId - The ID of the group
   * @param userId - The ID of the authenticated user (must be a participant)
   * @param userEmail - The email of the authenticated user (for matching participants added by email)
   * @returns DrawResultResponseDTO with complete result information
   * @throws {Error} "GROUP_NOT_FOUND" - If group doesn't exist
   * @throws {Error} "FORBIDDEN" - If user is not a participant in the group
   * @throws {Error} "DRAW_NOT_COMPLETED" - If draw hasn't been completed yet
   */
  async getAuthenticatedUserResult(
    groupId: number,
    userId: UserId,
    userEmail?: string
  ): Promise<DrawResultResponseDTO> {
    console.log("[ResultsService.getAuthenticatedUserResult] Starting", {
      groupId,
      userId,
      userEmail,
    });

    // Step 1: Validate draw is completed and get basic data
    const { participant, group } = await this.validateDrawCompletedAndGetParticipant(
      "authenticated",
      groupId,
      userId,
      userEmail
    );

    // Step 2: Get assignment and assigned participant data
    const { assignedParticipant, assignedWishlist } = await this.getAssignedParticipantData(groupId, participant.id);

    // Step 3: Get current participant's wishlist
    const myWishlist = await this.getParticipantWishlist(participant.id);

    // Step 4: Get wishlist statistics for the group
    const wishlistStats = await this.getWishlistStats(groupId);

    // Step 5: Get my elf helper (who is helping me)
    const myElf = await this.getMyElfHelper(participant.id, groupId);

    // Step 6: Note - result_viewed_at is now updated only when gift is revealed

    // Step 7: Format and return response
    const now = new Date();
    const endDate = new Date(group.end_date);
    // Compare only dates (ignore time) - end date is inclusive
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const isExpired = endDateOnly < nowDate;

    console.log("[ResultsService.getAuthenticatedUserResult] Date check", {
      groupId,
      participantId: participant.id,
      endDate: group.end_date,
      endDateParsed: endDate.toISOString(),
      now: now.toISOString(),
      endDateOnly: endDateOnly.toISOString(),
      nowDate: nowDate.toISOString(),
      isExpired,
      canEdit: !isExpired,
    });

    const result: DrawResultResponseDTO = {
      group: this.formatGroupInfo(group),
      participant: await this.formatParticipantInfo(participant),
      assigned_to: this.formatAssignedParticipant(assignedParticipant, assignedWishlist),
      my_wishlist: this.formatMyWishlist(myWishlist, !isExpired), // Can edit only if not expired
      wishlist_stats: wishlistStats,
      elf: myElf || undefined,
    };

    console.log("[ResultsService.getAuthenticatedUserResult] Successfully retrieved result", {
      groupId,
      participantId: participant.id,
      assignedToId: assignedParticipant.id,
      hasElf: !!myElf,
    });

    return result;
  }

  /**
   * Retrieves draw result for a token-based access (unregistered participants)
   *
   * @param token - The access token for the participant
   * @returns DrawResultResponseDTO with complete result information
   * @throws {Error} "INVALID_TOKEN" - If token is invalid or doesn't exist
   * @throws {Error} "DRAW_NOT_COMPLETED" - If draw hasn't been completed yet
   */
  async getTokenBasedResult(token: string): Promise<DrawResultResponseDTO> {
    console.log("[ResultsService.getTokenBasedResult] Starting", {
      tokenLength: token.length,
    });

    // Step 1: Find participant by token and validate draw is completed
    const { participant, group } = await this.validateDrawCompletedAndGetParticipant(
      "token",
      undefined,
      undefined,
      undefined,
      token
    );

    // Step 2: Get assignment and assigned participant data
    const { assignedParticipant, assignedWishlist } = await this.getAssignedParticipantData(
      participant.group_id,
      participant.id
    );

    // Step 3: Get current participant's wishlist
    const myWishlist = await this.getParticipantWishlist(participant.id);

    // Step 4: Get wishlist statistics for the group
    const wishlistStats = await this.getWishlistStats(participant.group_id);

    // Step 5: Get my elf helper (who is helping me)
    const myElf = await this.getMyElfHelper(participant.id, participant.group_id);

    // Step 6: Note - result_viewed_at is now updated only when gift is revealed

    // Step 7: Format and return response
    const now = new Date();
    const endDate = new Date(group.end_date);
    // Compare only dates (ignore time) - end date is inclusive
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const isExpired = endDateOnly < nowDate;

    console.log("[ResultsService.getTokenBasedResult] Date check", {
      groupId: participant.group_id,
      participantId: participant.id,
      endDate: group.end_date,
      endDateParsed: endDate.toISOString(),
      now: now.toISOString(),
      endDateOnly: endDateOnly.toISOString(),
      nowDate: nowDate.toISOString(),
      isExpired,
      canEdit: !isExpired,
    });

    const result: DrawResultResponseDTO = {
      group: this.formatGroupInfo(group),
      participant: await this.formatParticipantInfo(participant),
      assigned_to: this.formatAssignedParticipant(assignedParticipant, assignedWishlist),
      my_wishlist: this.formatMyWishlist(myWishlist, !isExpired), // Can edit only if not expired
      wishlist_stats: wishlistStats,
      elf: myElf || undefined,
    };

    console.log("[ResultsService.getTokenBasedResult] Successfully retrieved result", {
      groupId: participant.group_id,
      participantId: participant.id,
      assignedToId: assignedParticipant.id,
      hasElf: !!myElf,
    });

    return result;
  }

  /**
   * Validates that draw is completed and retrieves participant/group data
   * This is a common validation step for both access methods
   */
  private async validateDrawCompletedAndGetParticipant(
    accessType: "authenticated" | "token",
    groupId?: number,
    userId?: UserId,
    userEmail?: string,
    token?: string
  ): Promise<{ participant: ParticipantDataFromDB; group: ResultGroupInfo }> {
    // Step 1: Check if draw is completed
    const targetGroupId = groupId || (await this.getGroupIdFromToken(token || ""));

    const { data: assignments, error: assignmentsError } = await this.supabase
      .from("assignments")
      .select("id")
      .eq("group_id", targetGroupId)
      .limit(1);

    if (assignmentsError) {
      console.error(
        "[ResultsService.validateDrawCompletedAndGetParticipant] Error checking assignments:",
        assignmentsError
      );
      throw new Error("INTERNAL_ERROR");
    }

    if (!assignments || assignments.length === 0) {
      console.log("[ResultsService.validateDrawCompletedAndGetParticipant] No assignments found - draw not completed", {
        groupId: targetGroupId,
      });
      throw new Error("DRAW_NOT_COMPLETED");
    }

    // Step 2: Get group data
    const { data: group, error: groupError } = await this.supabase
      .from("groups")
      .select("id, name, budget, end_date")
      .eq("id", targetGroupId)
      .single();

    if (groupError || !group) {
      console.log("[ResultsService.validateDrawCompletedAndGetParticipant] Group not found", {
        groupId: targetGroupId,
        error: groupError?.message,
      });
      throw new Error("GROUP_NOT_FOUND");
    }

    // Step 3: Get participant data based on access type
    let participant;
    if (accessType === "authenticated") {
      if (!groupId || !userId) {
        throw new Error("INVALID_ACCESS");
      }
      // Find participant by user_id OR email (for users added before account creation)

      const query = this.supabase
        .from("participants")
        .select("id, group_id, user_id, name, email, result_viewed_at, elf_participant_id")
        .eq("group_id", groupId);

      // Build OR condition carefully - always include user_id check
      // Also check email if provided (for legacy participants added by email)
      if (userEmail) {
        query.or(`user_id.eq.${userId},email.eq.${userEmail}`);
      } else {
        query.eq("user_id", userId);
      }

      const { data: participantData, error: participantError } = await query.single();

      if (participantError || !participantData) {
        console.log("[ResultsService.validateDrawCompletedAndGetParticipant] Participant not found", {
          groupId,
          userId,
          userEmail,
          error: participantError?.message,
          code: participantError?.code,
        });

        // If we can't find a participant record, check if the user is the group creator
        // and if so, they should be allowed to view results (they might be missing participant record)
        const { data: groupData } = await this.supabase.from("groups").select("creator_id").eq("id", groupId).single();

        if (groupData?.creator_id === userId) {
          console.log(
            "[ResultsService.validateDrawCompletedAndGetParticipant] User is group creator but missing participant record, creating one",
            {
              groupId,
              userId,
            }
          );

          // Create a participant record for the creator
          const { data: newParticipant, error: createError } = await this.supabase
            .from("participants")
            .insert({
              group_id: groupId,
              user_id: userId,
              name: "Creator", // This will be updated by the user later
              email: userEmail || null,
            })
            .select("id, group_id, user_id, name, email, result_viewed_at, elf_participant_id")
            .single();

          if (createError || !newParticipant) {
            console.error(
              "[ResultsService.validateDrawCompletedAndGetParticipant] Failed to create participant record for creator",
              {
                error: createError?.message,
              }
            );
            throw new Error("FORBIDDEN");
          }

          participant = newParticipant;
        } else {
          throw new Error("FORBIDDEN");
        }
      }
      participant = participantData;
    } else {
      if (!token) {
        throw new Error("INVALID_ACCESS");
      }
      const { data: participantData, error: participantError } = await this.supabase
        .from("participants")
        .select("id, group_id, user_id, name, email, result_viewed_at, elf_for_participant_id")
        .eq("access_token", token)
        .single();

      if (participantError || !participantData) {
        console.log("[ResultsService.validateDrawCompletedAndGetParticipant] Invalid token", {
          error: participantError?.message,
        });
        throw new Error("INVALID_TOKEN");
      }
      participant = participantData;
    }

    return { participant, group };
  }

  /**
   * Gets group ID from access token (for token-based access)
   */
  private async getGroupIdFromToken(token: string): Promise<number> {
    const { data: participant, error } = await this.supabase
      .from("participants")
      .select("group_id")
      .eq("access_token", token)
      .single();

    if (error || !participant) {
      throw new Error("INVALID_TOKEN");
    }

    return participant.group_id;
  }

  /**
   * Retrieves assigned participant data and their wishlist
   */
  private async getAssignedParticipantData(
    groupId: number,
    giverParticipantId: number
  ): Promise<{ assignedParticipant: ResultAssignedParticipant; assignedWishlist: string | null }> {
    // Get assignment for this giver
    const { data: assignment, error: assignmentError } = await this.supabase
      .from("assignments")
      .select("receiver_participant_id")
      .eq("group_id", groupId)
      .eq("giver_participant_id", giverParticipantId)
      .single();

    if (assignmentError || !assignment) {
      console.error("[ResultsService.getAssignedParticipantData] Assignment not found", {
        groupId,
        giverParticipantId,
        error: assignmentError?.message,
      });
      throw new Error("INTERNAL_ERROR");
    }

    // Get assigned participant details
    const { data: assignedParticipant, error: participantError } = await this.supabase
      .from("participants")
      .select("id, name, elf_participant_id")
      .eq("id", assignment.receiver_participant_id)
      .single();

    if (participantError || !assignedParticipant) {
      console.error("[ResultsService.getAssignedParticipantData] Assigned participant not found", {
        assignedParticipantId: assignment.receiver_participant_id,
        error: participantError?.message,
      });
      throw new Error("INTERNAL_ERROR");
    }

    // Get assigned participant's wishlist
    const assignedWishlist = await this.getParticipantWishlist(assignment.receiver_participant_id);

    return { assignedParticipant, assignedWishlist };
  }

  /**
   * Retrieves a participant's wishlist content
   */
  private async getParticipantWishlist(participantId: number): Promise<string | null> {
    const { data: wishlist, error } = await this.supabase
      .from("wishes")
      .select("wishlist")
      .eq("participant_id", participantId)
      .single();

    if (error) {
      // If no wishlist exists, return null (this is not an error)
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[ResultsService.getParticipantWishlist] Error fetching wishlist:", error);
      throw new Error("INTERNAL_ERROR");
    }

    return wishlist?.wishlist || null;
  }

  /**
   * Retrieves wishlist statistics for a group
   */
  private async getWishlistStats(groupId: number): Promise<WishlistStats> {
    // Get total participants count
    const { data: participants, error: participantsError } = await this.supabase
      .from("participants")
      .select("id")
      .eq("group_id", groupId);

    if (participantsError) {
      console.error("[ResultsService.getWishlistStats] Error fetching participants:", participantsError);
      throw new Error("INTERNAL_ERROR");
    }

    const totalParticipants = participants?.length || 0;

    // Get participants with wishlists (where wishlist is not null and not empty)
    const { data: wishlistsData, error: wishlistsError } = await this.supabase
      .from("wishes")
      .select("participant_id")
      .in("participant_id", participants?.map((p) => p.id) || [])
      .not("wishlist", "is", null);

    if (wishlistsError) {
      console.error("[ResultsService.getWishlistStats] Error fetching wishlists:", wishlistsError);
      throw new Error("INTERNAL_ERROR");
    }

    // Database query already filters nulls, empty strings are still valid wishlists
    const participantsWithWishlist = wishlistsData?.length || 0;

    return {
      total_participants: totalParticipants,
      participants_with_wishlist: participantsWithWishlist,
    };
  }

  /**
   * Updates the result_viewed_at timestamp when participant reveals their result
   * This should only be called when the user actually opens the gift
   */
  async trackResultReveal(participantId: number): Promise<void> {
    console.log("[ResultsService.trackResultReveal] Tracking result reveal", { participantId });

    const { error } = await this.supabase
      .from("participants")
      .update({ result_viewed_at: new Date().toISOString() })
      .eq("id", participantId);

    if (error) {
      console.error("[ResultsService.trackResultReveal] Error updating result_viewed_at:", error);
      throw new Error("Failed to track result reveal");
    }

    console.log("[ResultsService.trackResultReveal] Successfully tracked result reveal", { participantId });
  }

  /**
   * Updates the result_viewed_at timestamp for a participant (legacy method)
   * @deprecated Use trackResultReveal instead
   */
  private async updateResultViewedAt(participantId: number): Promise<void> {
    const { error } = await this.supabase
      .from("participants")
      .update({ result_viewed_at: new Date().toISOString() })
      .eq("id", participantId);

    if (error) {
      console.error("[ResultsService.updateResultViewedAt] Error updating result_viewed_at:", error);
      // Don't throw here - this is not critical for the result display
    }
  }

  /**
   * Formats group data for response
   */
  private formatGroupInfo(group: { id: number; name: string; budget: number; end_date: string }): ResultGroupInfo {
    return {
      id: group.id,
      name: group.name,
      budget: group.budget,
      end_date: group.end_date,
    };
  }

  /**
   * Gets elf helper data for a participant (who is helping them)
   * Finds a participant who has elf_participant_id === currentParticipantId
   */
  private async getMyElfHelper(
    currentParticipantId: number,
    groupId: number
  ): Promise<{ id: number; name: string } | null> {
    const { data: elfParticipant, error } = await this.supabase
      .from("participants")
      .select("id, name")
      .eq("group_id", groupId)
      .eq("elf_participant_id", currentParticipantId)
      .single();

    if (error) {
      // No elf assigned (PGRST116 = no rows found) - this is not an error
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[ResultsService.getMyElfHelper] Error fetching elf:", error);
      return null;
    }

    if (!elfParticipant) {
      return null;
    }

    return {
      id: elfParticipant.id,
      name: elfParticipant.name,
    };
  }

  /**
   * Gets elf helper data for a participant (who they are helping as an elf)
   */
  private async getElfHelperData(
    participantId: number,
    groupId: number
  ): Promise<{ helpedParticipantNames: string[]; helpedParticipantIds: number[] } | null> {
    const { data: helpedParticipants, error } = await this.supabase
      .from("participants")
      .select("id, name")
      .eq("elf_participant_id", participantId)
      .eq("group_id", groupId);

    if (error) {
      console.error("[ResultsService.getElfHelperData] Error fetching helped participants:", error);
      return null;
    }

    if (!helpedParticipants || helpedParticipants.length === 0) {
      return null;
    }

    return {
      helpedParticipantNames: helpedParticipants.map((p) => p.name),
      helpedParticipantIds: helpedParticipants.map((p) => p.id),
    };
  }

  /**
   * Formats participant data for response
   */
  private async formatParticipantInfo(participant: ParticipantDataFromDB): Promise<ResultParticipantInfo> {
    const baseInfo: ResultParticipantInfo = {
      id: participant.id,
      name: participant.name,
      result_viewed_at: participant.result_viewed_at || undefined,
    };

    // If participant is an elf for someone, get their data
    const elfData = await this.getElfHelperData(participant.id, participant.group_id);
    if (elfData) {
      baseInfo.isElfForSomeone = true;
      baseInfo.helpedParticipantNames = elfData.helpedParticipantNames;
      baseInfo.helpedParticipantIds = elfData.helpedParticipantIds;
    }

    return baseInfo;
  }

  /**
   * Formats assigned participant data for response
   */
  private formatAssignedParticipant(
    assignedParticipant: AssignedParticipantData,
    wishlist: string | null
  ): ResultAssignedParticipant {
    return {
      id: assignedParticipant.id,
      name: assignedParticipant.name,
      wishlist: wishlist || undefined,
    };
  }

  /**
   * Formats current participant's wishlist for response
   */
  private formatMyWishlist(wishlist: string | null, canEdit: boolean): ResultMyWishlist {
    console.log("[ResultsService.formatMyWishlist] Formatting wishlist", {
      hasContent: !!wishlist,
      canEdit,
    });

    return {
      content: wishlist || undefined,
      can_edit: canEdit,
    };
  }
}
