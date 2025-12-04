import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateParticipantCommand,
  ParticipantWithTokenDTO,
  ParticipantInsert,
  ParticipantUpdate,
  ParticipantDTO,
  ParticipantListItemDTO,
  ResultAccessTrackingDTO,
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
      elfParticipantId: command.elfParticipantId,
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

      // Step 7: Insert participant with access token (without elf assignment yet)
      const participantInsert: ParticipantInsert = {
        group_id: groupId,
        user_id: linkedUserId,
        name: command.name,
        email: command.email || null,
        access_token: accessToken, // Store token in database
        elf_for_participant_id: null, // Will be set on the elf participant if elfParticipantId is provided
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

      // Step 8: Assign elf helper if specified
      // If elfParticipantId is provided, update that participant to be an elf for the newly created participant
      if (command.elfParticipantId) {
        try {
          console.log("[ParticipantService.addParticipantToGroup] Assigning elf helper", {
            newParticipantId: participant.id,
            elfParticipantId: command.elfParticipantId,
          });

          // Update the elf participant to help the new participant
          const { error: elfUpdateError } = await this.supabase
            .from("participants")
            .update({ elf_for_participant_id: participant.id })
            .eq("id", command.elfParticipantId)
            .eq("group_id", groupId); // Security: ensure elf is in the same group

          if (elfUpdateError) {
            console.error("[ParticipantService.addParticipantToGroup] Failed to assign elf:", elfUpdateError);
            // Non-critical error - participant was created successfully
          } else {
            console.log("[ParticipantService.addParticipantToGroup] Elf helper assigned successfully");
          }

          // Step 9: Auto-create exclusion for elf relationship (Podopieczny cannot draw their Elf)
          console.log("[ParticipantService.addParticipantToGroup] Creating automatic exclusion for elf relationship", {
            podopiecznyId: participant.id,
            elfId: command.elfParticipantId,
          });

          // Check if exclusion already exists
          const { data: existingExclusion } = await this.supabase
            .from("exclusion_rules")
            .select("id")
            .eq("group_id", groupId)
            .eq("blocker_participant_id", participant.id)
            .eq("blocked_participant_id", command.elfParticipantId)
            .maybeSingle();

          if (!existingExclusion) {
            const { error: exclusionError } = await this.supabase
              .from("exclusion_rules")
              .insert({
                group_id: groupId,
                blocker_participant_id: participant.id, // New participant (podopieczny) cannot draw their elf
                blocked_participant_id: command.elfParticipantId,
              });

            if (exclusionError) {
              console.error("[ParticipantService.addParticipantToGroup] Failed to create automatic exclusion:", exclusionError);
              // Don't throw here - the participant was created successfully, exclusion is just a bonus
            } else {
              console.log("[ParticipantService.addParticipantToGroup] Automatic exclusion created successfully", {
                elfParticipantId: participant.id,
                helpedParticipantId: command.elfForParticipantId,
              });
            }
          } else {
            console.log("[ParticipantService.addParticipantToGroup] Automatic exclusion already exists", {
              elfParticipantId: participant.id,
              helpedParticipantId: command.elfForParticipantId,
            });
          }
        } catch (error) {
          console.error("[ParticipantService.addParticipantToGroup] Error creating automatic exclusion:", error);
          // Don't throw - participant creation succeeded
        }
      }

      // Step 9: Return ParticipantWithTokenDTO
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
      const isCreator = data.user_id !== null && data.user_id === (data.group as { creator_id: string }).creator_id;

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
   * @param data - Partial update data (name, email, elfForParticipantId)
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
      // Step 1: Get current participant data before update (needed for elf exclusion logic)
      const { data: currentParticipant, error: fetchError } = await this.supabase
        .from("participants")
        .select("id, group_id, elf_for_participant_id")
        .eq("id", id)
        .single();

      if (fetchError || !currentParticipant) {
        console.error("[ParticipantService.updateParticipant] Failed to fetch current participant:", fetchError);
        throw new Error("Failed to fetch participant for update");
      }

      // Step 2: Update the participant
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

      // Step 3: Handle automatic exclusion rules for elf relationships
      const oldElfForParticipantId = currentParticipant.elf_for_participant_id;
      const newElfForParticipantId = data.elf_for_participant_id !== undefined ? data.elf_for_participant_id : oldElfForParticipantId;

      // Check if elf relationship changed
      if (oldElfForParticipantId !== newElfForParticipantId) {
        console.log("[ParticipantService.updateParticipant] Elf relationship changed", {
          participantId: id,
          oldElfForParticipantId,
          newElfForParticipantId,
        });

        try {
          // Remove old exclusion if it existed
          if (oldElfForParticipantId) {
            console.log("[ParticipantService.updateParticipant] Removing old elf exclusion", {
              elfParticipantId: id,
              oldHelpedParticipantId: oldElfForParticipantId,
            });

            // Check if exclusion exists before trying to delete
            const { data: existingExclusion } = await this.supabase
              .from("exclusion_rules")
              .select("id")
              .eq("group_id", currentParticipant.group_id)
              .eq("blocker_participant_id", oldElfForParticipantId)
              .eq("blocked_participant_id", id)
              .maybeSingle();

            if (existingExclusion) {
              const { error: deleteError } = await this.supabase
                .from("exclusion_rules")
                .delete()
                .eq("id", existingExclusion.id);

              if (deleteError) {
                console.error("[ParticipantService.updateParticipant] Failed to remove old exclusion:", deleteError);
              } else {
                console.log("[ParticipantService.updateParticipant] Old exclusion removed successfully");
              }
            } else {
              console.log("[ParticipantService.updateParticipant] Old exclusion not found - nothing to remove");
            }
          }

          // Create new exclusion if elf relationship exists
          if (newElfForParticipantId) {
            console.log("[ParticipantService.updateParticipant] Creating new elf exclusion", {
              elfParticipantId: id,
              newHelpedParticipantId: newElfForParticipantId,
            });

            // Check if exclusion already exists before trying to create
            const { data: existingNewExclusion } = await this.supabase
              .from("exclusion_rules")
              .select("id")
              .eq("group_id", currentParticipant.group_id)
              .eq("blocker_participant_id", newElfForParticipantId)
              .eq("blocked_participant_id", id)
              .maybeSingle();

            if (!existingNewExclusion) {
              const { error: insertError } = await this.supabase
                .from("exclusion_rules")
                .insert({
                  group_id: currentParticipant.group_id,
                  blocker_participant_id: newElfForParticipantId, // Person being helped cannot draw their elf
                  blocked_participant_id: id,
                });

              if (insertError) {
                console.error("[ParticipantService.updateParticipant] Failed to create new exclusion:", insertError);
              } else {
                console.log("[ParticipantService.updateParticipant] New exclusion created successfully", {
                  elfParticipantId: id,
                  helpedParticipantId: newElfForParticipantId,
                });
              }
            } else {
              console.log("[ParticipantService.updateParticipant] New exclusion already exists - skipping creation", {
                elfParticipantId: id,
                helpedParticipantId: newElfForParticipantId,
              });
            }
          }
        } catch (exclusionError) {
          console.error("[ParticipantService.updateParticipant] Error handling elf exclusions:", exclusionError);
          // Don't throw - participant update succeeded, exclusion handling is secondary
        }
      }

      return updatedParticipant;
    } catch (error) {
      console.error("[ParticipantService.updateParticipant] Error:", error);
      throw error;
    }
  }

  /**
   * Updates the elf helper relationship for a participant
   *
   * This method handles the logic where:
   * - We select which participant will be the elf helper FOR the edited participant
   * - We update that elf participant's elf_for_participant_id to point to the edited participant
   * - We manage the automatic exclusion rule (podopieczny cannot draw their elf)
   *
   * @param participantId - The ID of the participant being edited (podopieczny)
   * @param elfParticipantId - The ID of the participant who will be the elf helper (or null to remove)
   * @param groupId - The group ID for security validation
   * @returns Promise resolving when the relationship is updated
   * @throws {Error} "Failed to update elf relationship" if database operation fails
   *
   * @example
   * await service.updateParticipantElfRelationship(5, 3, 1);
   * // Participant 3 is now the elf helper for participant 5
   */
  async updateParticipantElfRelationship(
    participantId: number,
    elfParticipantId: number | null,
    groupId: number
  ): Promise<void> {
    console.log("[ParticipantService.updateParticipantElfRelationship] Starting", {
      participantId,
      elfParticipantId,
      groupId,
    });

    try {
      // Step 1: Find current elf helper (if any)
      const { data: currentElf } = await this.supabase
        .from("participants")
        .select("id")
        .eq("group_id", groupId)
        .eq("elf_for_participant_id", participantId)
        .maybeSingle();

      const currentElfId = currentElf?.id || null;

      console.log("[ParticipantService.updateParticipantElfRelationship] Current elf found", {
        currentElfId,
      });

      // Step 2: If there's a current elf and it's different from the new one, remove the relationship
      if (currentElfId && currentElfId !== elfParticipantId) {
        console.log("[ParticipantService.updateParticipantElfRelationship] Removing old elf relationship", {
          oldElfId: currentElfId,
        });

        const { error: removeError } = await this.supabase
          .from("participants")
          .update({ elf_for_participant_id: null })
          .eq("id", currentElfId)
          .eq("group_id", groupId);

        if (removeError) {
          console.error(
            "[ParticipantService.updateParticipantElfRelationship] Failed to remove old elf relationship:",
            removeError
          );
        }

        // Remove old exclusion rule (podopieczny cannot draw old elf)
        const { data: oldExclusion } = await this.supabase
          .from("exclusion_rules")
          .select("id")
          .eq("group_id", groupId)
          .eq("blocker_participant_id", participantId)
          .eq("blocked_participant_id", currentElfId)
          .maybeSingle();

        if (oldExclusion) {
          await this.supabase.from("exclusion_rules").delete().eq("id", oldExclusion.id);
          console.log("[ParticipantService.updateParticipantElfRelationship] Old exclusion removed");
        }
      }

      // Step 3: If new elf is provided, create the relationship
      if (elfParticipantId) {
        console.log("[ParticipantService.updateParticipantElfRelationship] Creating new elf relationship", {
          newElfId: elfParticipantId,
        });

        const { error: updateError } = await this.supabase
          .from("participants")
          .update({ elf_for_participant_id: participantId })
          .eq("id", elfParticipantId)
          .eq("group_id", groupId);

        if (updateError) {
          console.error(
            "[ParticipantService.updateParticipantElfRelationship] Failed to create new elf relationship:",
            updateError
          );
          throw new Error("Failed to update elf relationship");
        }

        // Create new exclusion rule (podopieczny cannot draw new elf)
        const { data: existingExclusion } = await this.supabase
          .from("exclusion_rules")
          .select("id")
          .eq("group_id", groupId)
          .eq("blocker_participant_id", participantId)
          .eq("blocked_participant_id", elfParticipantId)
          .maybeSingle();

        if (!existingExclusion) {
          const { error: exclusionError } = await this.supabase.from("exclusion_rules").insert({
            group_id: groupId,
            blocker_participant_id: participantId, // Podopieczny cannot draw their elf
            blocked_participant_id: elfParticipantId,
          });

          if (exclusionError) {
            console.error(
              "[ParticipantService.updateParticipantElfRelationship] Failed to create exclusion:",
              exclusionError
            );
          } else {
            console.log("[ParticipantService.updateParticipantElfRelationship] New exclusion created");
          }
        }

        console.log("[ParticipantService.updateParticipantElfRelationship] Elf relationship updated successfully");
      } else if (currentElfId && !elfParticipantId) {
        // No new elf, but there was an old one - already removed in Step 2
        console.log("[ParticipantService.updateParticipantElfRelationship] Elf relationship removed (no new elf assigned)");
      }
    } catch (error) {
      console.error("[ParticipantService.updateParticipantElfRelationship] Error:", error);
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

  /**
   * Retrieves all participants of a specific group with wishlist status
   *
   * Only group participants can access this information. Checks authorization
   * before returning the list. Includes has_wishlist field indicating whether
   * each participant has created a wishlist.
   *
   * @param groupId - The ID of the group to get participants for
   * @param userId - The ID of the user requesting the list (must be group participant)
   * @returns Promise resolving to array of participants with wishlist status
   * @throws {Error} "GROUP_NOT_FOUND" - If group doesn't exist
   * @throws {Error} "FORBIDDEN" - If user is not a participant in the group
   * @throws {Error} "Failed to get group participants" - If database operation fails
   *
   * @example
   * const participants = await participantService.getGroupParticipants(1, "user-123");
   * // Returns: [{ id: 1, name: "John", ..., has_wishlist: true }, ...]
   */
  async getGroupParticipants(groupId: number, userId: UserId): Promise<ParticipantListItemDTO[]> {
    console.log("[ParticipantService.getGroupParticipants] Starting", {
      groupId,
      userId,
    });

    try {
      // Step 1: Check if group exists and if user is creator
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("id, creator_id")
        .eq("id", groupId)
        .maybeSingle();

      if (groupError) {
        console.error("[ParticipantService.getGroupParticipants] Failed to get group:", groupError);
        throw new Error("Failed to get group information");
      }

      if (!group) {
        console.log("[ParticipantService.getGroupParticipants] Group not found", { groupId });
        throw new Error("GROUP_NOT_FOUND");
      }

      const isCreator = group.creator_id === userId;

      console.log("[ParticipantService.getGroupParticipants] Group found", {
        groupId,
        isCreator,
      });

      // Step 2: Check if user is authorized (participant or creator)
      const { data: isUserInGroup, error: authError } = await this.supabase.rpc("is_user_in_group", {
        p_group_id: groupId,
        p_user_id: userId,
      });

      if (authError) {
        console.error("[ParticipantService.getGroupParticipants] Authorization check failed:", authError);
        throw new Error("Failed to verify user access");
      }

      if (!isUserInGroup) {
        console.log("[ParticipantService.getGroupParticipants] User not in group", {
          groupId,
          userId,
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[ParticipantService.getGroupParticipants] User authorized to view participants");

      // Step 3: Get all participants for the group
      const { data: participants, error: participantsError } = await this.supabase
        .from("participants")
        .select(
          `
          id,
          group_id,
          user_id,
          name,
          email,
          created_at,
          access_token,
          result_viewed_at,
          elf_for_participant_id,
          elf_accessed_at
        `
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (participantsError) {
        console.error("[ParticipantService.getGroupParticipants] Failed to get participants:", participantsError);
        throw new Error("Failed to get group participants");
      }

      if (!participants || participants.length === 0) {
        console.log("[ParticipantService.getGroupParticipants] No participants found", { groupId });
        return [];
      }

      console.log("[ParticipantService.getGroupParticipants] Found participants", {
        groupId,
        participantCount: participants.length,
      });

      // Step 4: Get wishlist status for all participants in one query
      const participantIds = participants.map((p) => p.id);
      const { data: wishlists, error: wishlistsError } = await this.supabase
        .from("wishes")
        .select("participant_id")
        .in("participant_id", participantIds);

      if (wishlistsError) {
        console.error("[ParticipantService.getGroupParticipants] Failed to get wishlists:", wishlistsError);
        // Don't throw here - just log and continue with empty wishlists
      }

      // Create a set of participant IDs that have wishlists
      const participantsWithWishlists = new Set(wishlists?.map((w) => w.participant_id) || []);

      console.log("[ParticipantService.getGroupParticipants] Wishlist status retrieved", {
        totalParticipants: participants.length,
        withWishlistsCount: participantsWithWishlists.size,
        participantsWithWishlists: Array.from(participantsWithWishlists),
      });

      // Step 5: Transform the data to match ParticipantListItemDTO format
      // Include access_token only if user is the group creator
      const participantsWithWishlistStatus: ParticipantListItemDTO[] = participants.map((participant) => {
        const hasWishlist = participantsWithWishlists.has(participant.id);

        const baseData = {
          id: participant.id,
          group_id: participant.group_id,
          user_id: participant.user_id,
          name: participant.name,
          email: participant.email,
          created_at: participant.created_at,
          result_viewed_at: participant.result_viewed_at,
          has_wishlist: hasWishlist,
          result_viewed: participant.result_viewed_at !== null,
          elf_for_participant_id: participant.elf_for_participant_id,
          elf_accessed_at: participant.elf_accessed_at,
        };

        // Only include access_token if user is creator
        if (isCreator) {
          return {
            ...baseData,
            access_token: participant.access_token,
          };
        }

        return baseData;
      });

      console.log("[ParticipantService.getGroupParticipants] Successfully retrieved participants", {
        groupId,
        participantCount: participantsWithWishlistStatus.length,
        withWishlistCount: participantsWithWishlistStatus.filter((p) => p.has_wishlist).length,
        includesAccessToken: isCreator,
      });

      return participantsWithWishlistStatus;
    } catch (error) {
      console.error("[ParticipantService.getGroupParticipants] Error:", error);
      throw error;
    }
  }

  /**
   * Tracks when an unregistered participant accesses their Secret Santa result
   *
   * Updates the result_viewed_at timestamp for the participant.
   * Returns access tracking information including count and timestamps.
   *
   * @param accessToken - The participant's access token
   * @returns ResultAccessTrackingDTO with access information
   * @throws {Error} "PARTICIPANT_NOT_FOUND" - If token doesn't match any participant
   * @throws {Error} "Failed to track result access" - If database operation fails
   *
   * @example
   * const tracking = await participantService.trackResultAccess("uuid-token");
   * // Returns: { participant_id: 1, access_count: 3, first_accessed_at: "2025-10-14T10:00:00Z", last_accessed_at: "2025-10-14T10:30:00Z" }
   */
  async trackResultAccess(accessToken: string): Promise<ResultAccessTrackingDTO> {
    console.log("[ParticipantService.trackResultAccess] Starting", {
      accessToken: accessToken.substring(0, 8) + "...",
    });

    try {
      // Find participant by access token
      const { data: participant, error: findError } = await this.supabase
        .from("participants")
        .select("id, result_viewed_at")
        .eq("access_token", accessToken)
        .maybeSingle();

      if (findError) {
        console.error("[ParticipantService.trackResultAccess] Failed to find participant:", findError);
        throw new Error("Failed to find participant");
      }

      if (!participant) {
        console.log("[ParticipantService.trackResultAccess] Participant not found", {
          accessToken: accessToken.substring(0, 8) + "...",
        });
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      const now = new Date().toISOString();

      // Update result_viewed_at if not set yet, or just track the access
      const { error: updateError } = await this.supabase
        .from("participants")
        .update({ result_viewed_at: now })
        .eq("id", participant.id);

      if (updateError) {
        console.error("[ParticipantService.trackResultAccess] Failed to update result_viewed_at:", updateError);
        throw new Error("Failed to track result access");
      }

      // For now, we just return basic tracking info
      // In a more advanced implementation, we could track access history in a separate table
      const result: ResultAccessTrackingDTO = {
        participant_id: participant.id,
        access_count: participant.result_viewed_at ? 2 : 1, // Simple count - could be improved
        first_accessed_at: participant.result_viewed_at || now,
        last_accessed_at: now,
      };

      console.log("[ParticipantService.trackResultAccess] Successfully tracked result access", {
        participantId: participant.id,
        wasFirstAccess: !participant.result_viewed_at,
      });

      return result;
    } catch (error) {
      console.error("[ParticipantService.trackResultAccess] Error:", error);
      throw error;
    }
  }
}
