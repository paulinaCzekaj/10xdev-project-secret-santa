import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateParticipantCommand,
  ParticipantWithTokenDTO,
  ParticipantInsert,
  ParticipantUpdate,
  ParticipantDTO,
  UserId,
} from "../../types";
import { generateAccessToken } from "../utils/token.utils";

/**
 * Service for managing Secret Santa participants
 */
export class ParticipantService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Adds a new participant to a Secret Santa group
   *
   * Only the group creator can add participants, and only before the draw.
   * Generates a secure access token for the participant.
   * Validates email uniqueness within the group.
   *
   * @param groupId - The ID of the group to add the participant to
   * @param userId - The ID of the user attempting to add the participant (must be creator)
   * @param command - The participant creation data (name, optional email)
   * @returns ParticipantWithTokenDTO including the generated access_token
   * @throws {Error} "GROUP_NOT_FOUND" - If group doesn't exist
   * @throws {Error} "FORBIDDEN" - If user is not the group creator
   * @throws {Error} "DRAW_COMPLETED" - If draw has already been completed
   * @throws {Error} "DUPLICATE_EMAIL" - If email already exists in the group
   * @throws {Error} "Failed to add participant" - If database operation fails
   *
   * @example
   * const participant = await participantService.addParticipantToGroup(
   *   1,
   *   "user-id-123",
   *   { name: "Jane Smith", email: "jane@example.com" }
   * );
   * // Returns: { id: 2, group_id: 1, name: "Jane Smith", ..., access_token: "uuid" }
   */
  async addParticipantToGroup(
    groupId: number,
    userId: UserId,
    command: CreateParticipantCommand
  ): Promise<ParticipantWithTokenDTO> {
    // Guard: Check if groupId and userId exist
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    console.log("[ParticipantService.addParticipantToGroup] Starting", {
      groupId,
      userId,
      participantName: command.name,
      hasEmail: !!command.email,
    });

    try {
      // Step 1: Validate group exists and get group data
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("id, creator_id")
        .eq("id", groupId)
        .single();

      // Guard: Check if group exists
      if (groupError || !group) {
        console.log("[ParticipantService.addParticipantToGroup] Group not found", {
          groupId,
          error: groupError?.message,
        });
        throw new Error("GROUP_NOT_FOUND");
      }

      console.log("[ParticipantService.addParticipantToGroup] Group found", {
        groupId,
        creatorId: group.creator_id,
      });

      // Step 2: Check if user is creator
      if (group.creator_id !== userId) {
        console.log("[ParticipantService.addParticipantToGroup] User not authorized", {
          userId,
          creatorId: group.creator_id,
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[ParticipantService.addParticipantToGroup] User is creator - authorized");

      // Step 3: Check if draw has been completed
      const { data: hasAssignments } = await this.supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)
        .maybeSingle();

      // Guard: Check if draw completed
      if (hasAssignments !== null) {
        console.log("[ParticipantService.addParticipantToGroup] Draw already completed", {
          groupId,
        });
        throw new Error("DRAW_COMPLETED");
      }

      console.log("[ParticipantService.addParticipantToGroup] Draw not completed - can add participant");

      // Step 4: Check email uniqueness in group (if provided)
      if (command.email) {
        const { data: existingParticipant } = await this.supabase
          .from("participants")
          .select("id, name")
          .eq("group_id", groupId)
          .eq("email", command.email)
          .maybeSingle();

        // Guard: Check if email already exists
        if (existingParticipant) {
          console.log("[ParticipantService.addParticipantToGroup] Email already exists", {
            groupId,
            email: command.email,
            existingParticipantId: existingParticipant.id,
          });
          throw new Error("DUPLICATE_EMAIL");
        }

        console.log("[ParticipantService.addParticipantToGroup] Email is unique in group");
      }

      // Step 5: Optional - Check if email belongs to registered user
      // For MVP, we skip this step - user_id will be null for all participants added via this endpoint
      // Future enhancement: Query Supabase Auth to link existing users
      const linkedUserId: string | null = null;

      // Step 6: Generate secure access token
      const accessToken = generateAccessToken();
      console.log("[ParticipantService.addParticipantToGroup] Generated access token", {
        tokenLength: accessToken.length,
      });

      // Step 7: Insert participant
      const participantInsert: ParticipantInsert = {
        group_id: groupId,
        user_id: linkedUserId,
        name: command.name,
        email: command.email || null,
      };

      const { data: participant, error: insertError } = await this.supabase
        .from("participants")
        .insert(participantInsert)
        .select()
        .single();

      if (insertError || !participant) {
        console.error("[ParticipantService.addParticipantToGroup] Failed to insert participant:", insertError);
        throw new Error("Failed to add participant");
      }

      console.log("[ParticipantService.addParticipantToGroup] Participant added successfully", {
        participantId: participant.id,
        groupId: participant.group_id,
        name: participant.name,
      });

      // Step 8: Return ParticipantWithTokenDTO
      const result: ParticipantWithTokenDTO = {
        ...participant,
        access_token: accessToken,
      };

      return result;
    } catch (error) {
      console.error("[ParticipantService.addParticipantToGroup] Error:", error);
      throw error;
    }
  }

  /**
   * Retrieves a participant with associated group information
   *
   * This method fetches participant data along with group details using a JOIN query.
   * Essential for authorization checks and business logic validation.
   *
   * @param id - The participant ID to retrieve
   * @returns Promise resolving to participant with group info, or null if not found
   *
   * @example
   * const participant = await service.getParticipantWithGroupInfo(123);
   * if (participant) {
   *   console.log(`Participant ${participant.name} in group ${participant.group_id}`);
   * }
   */
  async getParticipantWithGroupInfo(id: number) {
    console.log("[ParticipantService.getParticipantWithGroupInfo] Starting", { participantId: id });

    try {
      const { data, error } = await this.supabase
        .from("participants")
        .select(
          `
          *,
          group:groups (
            id,
            creator_id,
            name
          )
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.log("[ParticipantService.getParticipantWithGroupInfo] Participant not found", {
          participantId: id,
          error: error?.message,
        });
        return null;
      }

      console.log("[ParticipantService.getParticipantWithGroupInfo] Participant found", {
        participantId: id,
        groupId: data.group_id,
      });

      return data;
    } catch (error) {
      console.error("[ParticipantService.getParticipantWithGroupInfo] Error:", error);
      throw error;
    }
  }

  /**
   * Checks if a draw has been completed for a specific group
   *
   * Queries the assignments table to determine if any Secret Santa assignments
   * have been made for the group. This is crucial for preventing modifications
   * to the group after the draw has been executed.
   *
   * @param groupId - The group ID to check
   * @returns Promise resolving to true if draw completed, false otherwise
   *
   * @example
   * const isDrawn = await service.checkDrawCompleted(1);
   * if (isDrawn) {
   *   throw new Error("Cannot modify group after draw");
   * }
   */
  async checkDrawCompleted(groupId: number): Promise<boolean> {
    console.log("[ParticipantService.checkDrawCompleted] Checking draw status", { groupId });

    try {
      const { data, error } = await this.supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[ParticipantService.checkDrawCompleted] Database error:", error);
        throw new Error("Failed to check draw status");
      }

      const drawCompleted = data !== null;

      console.log("[ParticipantService.checkDrawCompleted] Draw status checked", {
        groupId,
        drawCompleted,
      });

      return drawCompleted;
    } catch (error) {
      console.error("[ParticipantService.checkDrawCompleted] Error:", error);
      throw error;
    }
  }

  /**
   * Verifies if a user is the creator of a specific group
   *
   * This is an authorization check to ensure only the group creator
   * can perform sensitive operations like updating or deleting participants.
   *
   * @param userId - The user ID to verify
   * @param groupId - The group ID to check ownership of
   * @returns Promise resolving to true if user is creator, false otherwise
   *
   * @example
   * const isCreator = await service.checkUserIsGroupCreator("user-123", 1);
   * if (!isCreator) {
   *   throw new Error("FORBIDDEN");
   * }
   */
  async checkUserIsGroupCreator(userId: string, groupId: number): Promise<boolean> {
    console.log("[ParticipantService.checkUserIsGroupCreator] Checking creator status", {
      userId,
      groupId,
    });

    try {
      const { data, error } = await this.supabase.from("groups").select("creator_id").eq("id", groupId).single();

      if (error || !data) {
        console.log("[ParticipantService.checkUserIsGroupCreator] Group not found", {
          groupId,
          error: error?.message,
        });
        return false;
      }

      const isCreator = data.creator_id === userId;

      console.log("[ParticipantService.checkUserIsGroupCreator] Creator check complete", {
        userId,
        groupId,
        isCreator,
      });

      return isCreator;
    } catch (error) {
      console.error("[ParticipantService.checkUserIsGroupCreator] Error:", error);
      throw error;
    }
  }

  /**
   * Checks if an email is unique within a specific group
   *
   * Validates that no other participant in the group has the same email address.
   * Essential for preventing duplicate email entries during participant updates.
   *
   * @param email - The email address to check
   * @param groupId - The group ID to check within
   * @param excludeId - Participant ID to exclude from check (for updates)
   * @returns Promise resolving to true if email exists, false if unique
   *
   * @example
   * const exists = await service.checkEmailUniqueness("test@example.com", 1, 5);
   * if (exists) {
   *   throw new Error("EMAIL_EXISTS");
   * }
   */
  async checkEmailUniqueness(email: string, groupId: number, excludeId: number): Promise<boolean> {
    console.log("[ParticipantService.checkEmailUniqueness] Checking email uniqueness", {
      email,
      groupId,
      excludeId,
    });

    try {
      const { data, error } = await this.supabase
        .from("participants")
        .select("id")
        .eq("group_id", groupId)
        .eq("email", email)
        .neq("id", excludeId)
        .maybeSingle();

      if (error) {
        console.error("[ParticipantService.checkEmailUniqueness] Database error:", error);
        throw new Error("Failed to check email uniqueness");
      }

      const emailExists = data !== null;

      console.log("[ParticipantService.checkEmailUniqueness] Email check complete", {
        email,
        groupId,
        emailExists,
      });

      return emailExists;
    } catch (error) {
      console.error("[ParticipantService.checkEmailUniqueness] Error:", error);
      throw error;
    }
  }

  /**
   * Checks if a participant is the creator of their group
   *
   * This prevents deletion of the group creator, which would leave the group orphaned.
   * Compares participant's user_id with the group's creator_id.
   *
   * @param participantId - The participant ID to check
   * @param groupId - The group ID to verify against
   * @returns Promise resolving to true if participant is creator, false otherwise
   *
   * @example
   * const isCreator = await service.isParticipantCreator(5, 1);
   * if (isCreator) {
   *   throw new Error("CANNOT_DELETE_CREATOR");
   * }
   */
  async isParticipantCreator(participantId: number, groupId: number): Promise<boolean> {
    console.log("[ParticipantService.isParticipantCreator] Checking if participant is creator", {
      participantId,
      groupId,
    });

    try {
      const { data, error } = await this.supabase
        .from("participants")
        .select(
          `
          user_id,
          group:groups!inner (
            creator_id
          )
        `
        )
        .eq("id", participantId)
        .eq("group_id", groupId)
        .single();

      if (error || !data) {
        console.log("[ParticipantService.isParticipantCreator] Participant not found", {
          participantId,
          error: error?.message,
        });
        return false;
      }

      // Check if participant's user_id matches group's creator_id
      const isCreator = data.user_id !== null && data.user_id === (data.group as any).creator_id;

      console.log("[ParticipantService.isParticipantCreator] Creator check complete", {
        participantId,
        groupId,
        isCreator,
      });

      return isCreator;
    } catch (error) {
      console.error("[ParticipantService.isParticipantCreator] Error:", error);
      throw error;
    }
  }

  /**
   * Updates a participant's information
   *
   * Allows updating name and/or email for a participant.
   * Must be called only after all validations have passed (authorization, draw status, email uniqueness).
   *
   * @param id - The participant ID to update
   * @param data - Partial update data (name and/or email)
   * @returns Promise resolving to updated participant data
   * @throws {Error} "Failed to update participant" if database operation fails
   *
   * @example
   * const updated = await service.updateParticipant(5, { name: "New Name" });
   * console.log(updated.name); // "New Name"
   */
  async updateParticipant(id: number, data: ParticipantUpdate): Promise<ParticipantDTO> {
    console.log("[ParticipantService.updateParticipant] Starting update", {
      participantId: id,
      updateData: data,
    });

    try {
      const { data: updatedParticipant, error } = await this.supabase
        .from("participants")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error || !updatedParticipant) {
        console.error("[ParticipantService.updateParticipant] Failed to update participant:", error);
        throw new Error("Failed to update participant");
      }

      console.log("[ParticipantService.updateParticipant] Participant updated successfully", {
        participantId: updatedParticipant.id,
        updatedFields: Object.keys(data),
      });

      return updatedParticipant;
    } catch (error) {
      console.error("[ParticipantService.updateParticipant] Error:", error);
      throw error;
    }
  }

  /**
   * Deletes a participant from a group
   *
   * Permanently removes a participant. Related records (exclusion rules, wishes, assignments)
   * are automatically deleted via database CASCADE constraints.
   * Must be called only after all validations have passed (authorization, draw status, not creator).
   *
   * @param id - The participant ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws {Error} "Failed to delete participant" if database operation fails
   *
   * @example
   * await service.deleteParticipant(5);
   * // Participant and all related data removed
   */
  async deleteParticipant(id: number): Promise<void> {
    console.log("[ParticipantService.deleteParticipant] Starting deletion", {
      participantId: id,
    });

    try {
      const { error } = await this.supabase.from("participants").delete().eq("id", id);

      if (error) {
        console.error("[ParticipantService.deleteParticipant] Failed to delete participant:", error);
        throw new Error("Failed to delete participant");
      }

      console.log("[ParticipantService.deleteParticipant] Participant deleted successfully", {
        participantId: id,
      });
    } catch (error) {
      console.error("[ParticipantService.deleteParticipant] Error:", error);
      throw error;
    }
  }
}
