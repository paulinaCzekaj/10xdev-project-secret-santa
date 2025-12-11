import type { SupabaseClient } from "../../db/supabase.client";
import type { ElfResultResponseDTO, TrackElfAccessResponseDTO, UserId } from "../../types";
import { linkifyUrls } from "../utils/linkify";

/**
 * Command for getting elf result
 */
interface GetElfResultCommand {
  participantId: number;
  userId: string; // UUID z Supabase Auth
  helpedParticipantId?: number; // Optional: specific participant to get result for
}

/**
 * Command for tracking elf access
 */
interface TrackElfAccessCommand {
  participantId: number;
  userId: string; // UUID z Supabase Auth
}

/**
 * Command for getting elf result by token (unauthenticated access)
 */
interface GetElfResultByTokenCommand {
  token: string; // access token z participants.access_token
}

/**
 * Type for validated elf participant (guarantees elf_participant_ids is not empty)
 */
interface ValidatedElfParticipant {
  id: number;
  user_id: string | null;
  elf_participant_ids: number[]; // IDs of participants this elf helps
  group_id: number;
  access_token?: string | null;
}

/**
 * Service for managing elf access to Secret Santa results
 */
export class ElfService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves the draw result that an elf can see (the result of the participant they are helping)
   *
   * @param command - The command containing participantId and userId
   * @returns ElfResultResponseDTO with complete result information
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the participant or participant is not an elf
   * @throws {Error} "NOT_FOUND" - If helped participant or assignment doesn't exist
   */
  async getElfResult(command: GetElfResultCommand): Promise<ElfResultResponseDTO> {
    console.log("[ElfService.getElfResult] Starting", {
      participantId: command.participantId,
      userId: command.userId.substring(0, 8) + "...",
    });

    // Step 1: Validate participant exists and belongs to user, and is an elf
    const participant = await this.validateElfParticipant(command.participantId, command.userId);

    // Step 2: Determine which participant to get result for
    const targetHelpedParticipantId = command.helpedParticipantId || participant.elf_participant_ids[0];

    // Validate that the elf actually helps this participant
    if (!participant.elf_participant_ids.includes(targetHelpedParticipantId)) {
      console.log("[ElfService.getElfResult] Elf does not help requested participant", {
        elfParticipantId: command.participantId,
        requestedHelpedParticipantId: targetHelpedParticipantId,
        actualHelpedParticipantIds: participant.elf_participant_ids,
      });
      throw new Error("FORBIDDEN");
    }

    // Step 3: Get helped participant details
    const helpedParticipant = await this.getHelpedParticipant(targetHelpedParticipantId);

    // Step 3: Get assignment for the helped participant
    const assignment = await this.getHelpedParticipantAssignment(helpedParticipant.id);

    // Step 4: Get receiver details and wishlist
    const receiver = await this.getReceiverDetails(assignment.receiver_participant_id);
    const wishlist = await this.getReceiverWishlist(assignment.receiver_participant_id);

    // Step 5: Get helped participant's wishlist
    const helpedParticipantWishlist = await this.getReceiverWishlist(helpedParticipant.id);

    // Step 6: Get group details
    const group = await this.getGroupDetails(participant.group_id);

    // Step 6: Build response DTO
    const result: ElfResultResponseDTO = {
      assignment: {
        receiverName: receiver.name,
        receiverWishlist: wishlist,
        receiverWishlistHtml: linkifyUrls(wishlist),
      },
      group: {
        id: group.id,
        name: group.name,
        budget: group.budget,
        endDate: group.end_date,
      },
      helpedParticipant: {
        id: helpedParticipant.id,
        name: helpedParticipant.name,
        wishlist: helpedParticipantWishlist,
        canEditWishlist: this.canEditWishlist(group.end_date), // Check group end date
        accessToken: helpedParticipant.access_token,
      },
    };

    console.log("[ElfService.getElfResult] Successfully retrieved elf result", {
      participantId: command.participantId,
      helpedParticipantId: helpedParticipant.id,
      receiverId: receiver.id,
    });

    return result;
  }

  /**
   * Tracks when an elf first accesses the result of the participant they are helping
   * This is idempotent - only sets the timestamp if it's currently NULL
   *
   * @param command - The command containing participantId and userId
   * @returns TrackElfAccessResponseDTO indicating success
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If user doesn't own the participant or participant is not an elf
   */
  async trackElfAccess(command: TrackElfAccessCommand): Promise<TrackElfAccessResponseDTO> {
    console.log("[ElfService.trackElfAccess] Starting", {
      participantId: command.participantId,
      userId: command.userId.substring(0, 8) + "...",
    });

    // Step 1: Validate participant exists and belongs to user, and is an elf
    await this.validateElfParticipant(command.participantId, command.userId);

    // Step 2: Update elf_accessed_at only if it's currently NULL (idempotent)
    const { error } = await this.supabase
      .from("participants")
      .update({ elf_accessed_at: new Date().toISOString() })
      .eq("id", command.participantId)
      .is("elf_accessed_at", null);

    if (error) {
      console.error("[ElfService.trackElfAccess] Error updating elf_accessed_at:", error);
      throw new Error("INTERNAL_ERROR");
    }

    console.log("[ElfService.trackElfAccess] Successfully tracked elf access", {
      participantId: command.participantId,
    });

    return { success: true };
  }

  /**
   * Validates that a participant exists, belongs to the authenticated user, and is an elf
   * @private
   */
  private async validateElfParticipant(participantId: number, userId: UserId): Promise<ValidatedElfParticipant> {
    const { data: participant, error } = await this.supabase
      .from("participants")
      .select("id, user_id, group_id")
      .eq("id", participantId)
      .single();

    if (error || !participant) {
      console.log("[ElfService.validateElfParticipant] Participant not found", {
        participantId,
        error: error?.message,
      });
      throw new Error("PARTICIPANT_NOT_FOUND");
    }

    // Check ownership
    if (participant.user_id !== userId) {
      console.log("[ElfService.validateElfParticipant] Participant doesn't belong to user", {
        participantId,
        userId: userId.substring(0, 8) + "...",
        participantUserId: participant.user_id?.substring(0, 8) + "...",
      });
      throw new Error("FORBIDDEN");
    }

    // Check if participant is an elf (helps anyone)
    const { data: helpedParticipants } = await this.supabase
      .from("participants")
      .select("id")
      .eq("elf_participant_id", participantId)
      .eq("group_id", participant.group_id);

    if (!helpedParticipants || helpedParticipants.length === 0) {
      console.log("[ElfService.validateElfParticipant] Participant is not an elf", {
        participantId,
      });
      throw new Error("FORBIDDEN");
    }

    const elfParticipantIds = helpedParticipants.map((p) => p.id);

    return {
      ...participant,
      elf_participant_ids: elfParticipantIds,
    };
  }

  /**
   * Gets the participant that this elf is helping
   * @private
   */
  private async getHelpedParticipant(helpedParticipantId: number) {
    const { data: helpedParticipant, error } = await this.supabase
      .from("participants")
      .select("id, name, access_token")
      .eq("id", helpedParticipantId)
      .single();

    if (error || !helpedParticipant) {
      console.log("[ElfService.getHelpedParticipant] Helped participant not found", {
        helpedParticipantId,
        error: error?.message,
      });
      throw new Error("NOT_FOUND");
    }

    return helpedParticipant;
  }

  /**
   * Gets the assignment for the helped participant (who they are giving to)
   * @private
   */
  private async getHelpedParticipantAssignment(helpedParticipantId: number) {
    const { data: assignment, error } = await this.supabase
      .from("assignments")
      .select("receiver_participant_id")
      .eq("giver_participant_id", helpedParticipantId)
      .single();

    if (error || !assignment) {
      console.log("[ElfService.getHelpedParticipantAssignment] Assignment not found - draw not completed", {
        helpedParticipantId,
        error: error?.message,
      });
      throw new Error("NOT_FOUND");
    }

    return assignment;
  }

  /**
   * Gets the receiver participant details
   * @private
   */
  private async getReceiverDetails(receiverId: number) {
    const { data: receiver, error } = await this.supabase
      .from("participants")
      .select("id, name")
      .eq("id", receiverId)
      .single();

    if (error || !receiver) {
      console.error("[ElfService.getReceiverDetails] Receiver not found", {
        receiverId,
        error: error?.message,
      });
      throw new Error("INTERNAL_ERROR");
    }

    return receiver;
  }

  /**
   * Gets the receiver's wishlist content
   * @private
   */
  private async getReceiverWishlist(receiverId: number): Promise<string> {
    const { data: wishlist, error } = await this.supabase
      .from("wishes")
      .select("wishlist")
      .eq("participant_id", receiverId)
      .single();

    // Wishlist is optional - return empty string if not found
    if (error) {
      if (error.code === "PGRST116") {
        // No wishlist exists
        return "";
      }
      console.error("[ElfService.getReceiverWishlist] Error fetching wishlist:", error);
      throw new Error("INTERNAL_ERROR");
    }

    return wishlist?.wishlist || "";
  }

  /**
   * Gets the group details
   * @private
   */
  private async getGroupDetails(groupId: number) {
    const { data: group, error } = await this.supabase
      .from("groups")
      .select("id, name, budget, end_date")
      .eq("id", groupId)
      .single();

    if (error || !group) {
      console.error("[ElfService.getGroupDetails] Group not found", {
        groupId,
        error: error?.message,
      });
      throw new Error("INTERNAL_ERROR");
    }

    return group;
  }

  /**
   * Determines if wishlist can be edited based on group end date
   * Uses date-only comparison (ignores time) - end date is inclusive
   * @private
   */
  private canEditWishlist(groupEndDate: string): boolean {
    const now = new Date();
    const endDate = new Date(groupEndDate);
    // Compare only dates (ignore time) - end date is inclusive
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const isExpired = endDateOnly < nowDate;

    return !isExpired;
  }

  /**
   * Retrieves the draw result that an elf can see using access token (for unauthenticated users)
   *
   * @param command - The command containing access token
   * @returns ElfResultResponseDTO with complete result information
   * @throws {Error} "INVALID_TOKEN" - If token is invalid or participant doesn't exist
   * @throws {Error} "FORBIDDEN" - If participant is not an elf
   * @throws {Error} "NOT_FOUND" - If helped participant or assignment doesn't exist
   */
  async getElfResultByToken(command: GetElfResultByTokenCommand): Promise<ElfResultResponseDTO> {
    console.log("[ElfService.getElfResultByToken] Starting", {
      tokenLength: command.token.length,
    });

    // Step 1: Validate token and get participant (must be an elf)
    const participant = await this.validateElfParticipantByToken(command.token);

    // Step 2: Get helped participant details (for now, get the first one they help)
    const helpedParticipantId = participant.elf_participant_ids[0];
    const helpedParticipant = await this.getHelpedParticipant(helpedParticipantId);

    // Step 3: Get assignment for the helped participant
    const assignment = await this.getHelpedParticipantAssignment(helpedParticipant.id);

    // Step 4: Get receiver details and wishlist
    const receiver = await this.getReceiverDetails(assignment.receiver_participant_id);
    const wishlist = await this.getReceiverWishlist(assignment.receiver_participant_id);

    // Step 5: Get helped participant's wishlist
    const helpedParticipantWishlist = await this.getReceiverWishlist(helpedParticipant.id);

    // Step 6: Get group details
    const group = await this.getGroupDetails(participant.group_id);

    // Step 6: Build response DTO
    const result: ElfResultResponseDTO = {
      assignment: {
        receiverName: receiver.name,
        receiverWishlist: wishlist,
        receiverWishlistHtml: linkifyUrls(wishlist),
      },
      group: {
        id: group.id,
        name: group.name,
        budget: group.budget,
        endDate: group.end_date,
      },
      helpedParticipant: {
        id: helpedParticipant.id,
        name: helpedParticipant.name,
        wishlist: helpedParticipantWishlist,
        canEditWishlist: this.canEditWishlist(group.end_date), // Check group end date
        accessToken: helpedParticipant.access_token,
      },
    };

    console.log("[ElfService.getElfResultByToken] Successfully retrieved elf result", {
      participantId: participant.id,
      helpedParticipantId: helpedParticipant.id,
      receiverId: receiver.id,
    });

    return result;
  }

  /**
   * Validates that a participant exists by access token and is an elf
   * @private
   */
  private async validateElfParticipantByToken(token: string): Promise<ValidatedElfParticipant> {
    const { data: participant, error } = await this.supabase
      .from("participants")
      .select("id, group_id, access_token")
      .eq("access_token", token)
      .single();

    if (error || !participant) {
      console.log("[ElfService.validateElfParticipantByToken] Participant not found by token", {
        tokenLength: token.length,
        error: error?.message,
      });
      throw new Error("INVALID_TOKEN");
    }

    // Check if participant is an elf (helps anyone)
    const { data: helpedParticipants } = await this.supabase
      .from("participants")
      .select("id")
      .eq("elf_participant_id", participant.id)
      .eq("group_id", participant.group_id);

    if (!helpedParticipants || helpedParticipants.length === 0) {
      console.log("[ElfService.validateElfParticipantByToken] Participant is not an elf", {
        participantId: participant.id,
      });
      throw new Error("FORBIDDEN");
    }

    const elfParticipantIds = helpedParticipants.map((p) => p.id);

    return {
      ...participant,
      elf_participant_ids: elfParticipantIds,
    };
  }
}
