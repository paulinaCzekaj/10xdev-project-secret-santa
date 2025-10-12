import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateGroupCommand,
  UpdateGroupCommand,
  GroupListItemDTO,
  GroupDetailDTO,
  GroupDTO,
  UserId,
  GroupInsert,
  GroupUpdate,
  ParticipantInsert,
} from "../../types";

/**
 * Service for managing Secret Santa groups
 */
export class GroupService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new Secret Santa group and automatically adds the creator as first participant
   *
   * @param userId - The ID of the user creating the group
   * @param command - The group creation data
   * @returns The created group with participants count
   * @throws {Error} If database operation fails
   */
  async createGroup(userId: UserId, command: CreateGroupCommand): Promise<GroupListItemDTO> {
    // Guard: Check if userId exists
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      // 1. Insert group
      const groupInsert: GroupInsert = {
        name: command.name,
        budget: command.budget,
        end_date: command.end_date,
        creator_id: userId,
      };

      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .insert(groupInsert)
        .select()
        .single();

      if (groupError || !group) {
        console.error("[GroupService.createGroup] Failed to create group:", groupError);
        throw new Error("Failed to create group: " + groupError?.message);
      }

      // 2. Add creator as participant
      // Using placeholder data until auth is implemented
      const participantInsert: ParticipantInsert = {
        group_id: group.id,
        user_id: userId,
        name: "Default User", // Placeholder - will be replaced with real user data
        email: "user@example.com", // Placeholder - will be replaced with real user email
      };

      const { error: participantError } = await this.supabase.from("participants").insert(participantInsert);

      if (participantError) {
        console.error("[GroupService.createGroup] Failed to add creator as participant:", participantError);
        // Rollback - delete the group
        await this.supabase.from("groups").delete().eq("id", group.id);
        throw new Error("Failed to add creator as participant");
      }

      // 3. Return group with additional fields
      return {
        ...group,
        is_drawn: false,
        participants_count: 1,
        is_creator: true,
      };
    } catch (error) {
      console.error("[GroupService.createGroup] Error:", error);
      throw error;
    }
  }

  /**
   * Retrieves detailed information about a specific group
   *
   * Checks if the user has access to the group (is creator or participant)
   * and returns complete group details with participants and exclusions.
   *
   * @param groupId - The ID of the group to retrieve
   * @param userId - The ID of the user requesting the group
   * @returns GroupDetailDTO if found and user has access, null otherwise
   * @throws {Error} If database operation fails
   */
  async getGroupById(groupId: number, userId: UserId): Promise<GroupDetailDTO | null> {
    // Guard: Check if groupId and userId exist
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    try {
      // Step 1: Fetch group from database
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      // Guard: Check if group exists
      if (groupError || !group) {
        console.log("[GroupService.getGroupById] Group not found", { groupId, error: groupError?.message });
        return null;
      }

      console.log("[GroupService.getGroupById] Group found", { groupId, groupName: group.name });

      // Step 2: Check user authorization
      // Check if user is the creator
      const isCreator = group.creator_id === userId;

      // Check if user is a participant
      const { data: participation } = await this.supabase
        .from("participants")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();

      const isParticipant = participation !== null;

      // Guard: Check if user has access (must be creator OR participant)
      if (!isCreator && !isParticipant) {
        console.log("[GroupService.getGroupById] User has no access", { userId, groupId, isCreator, isParticipant });
        return null;
      }

      console.log("[GroupService.getGroupById] User authorized", { userId, isCreator, isParticipant });

      // Step 3: Fetch participants
      const { data: participants } = await this.supabase
        .from("participants")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      console.log("[GroupService.getGroupById] Fetched participants", { count: participants?.length || 0 });

      // Step 4: Fetch exclusion rules
      const { data: exclusions } = await this.supabase
        .from("exclusion_rules")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      console.log("[GroupService.getGroupById] Fetched exclusions", { count: exclusions?.length || 0 });

      // Step 5: Calculate is_drawn field
      // Check if any assignments exist for this group
      const { data: hasAssignments } = await this.supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)
        .maybeSingle();

      const isDrawn = hasAssignments !== null;

      console.log("[GroupService.getGroupById] Calculated is_drawn", { isDrawn, hasAssignments: !!hasAssignments });

      // Step 6: Calculate can_edit field
      // User can edit only if they're the creator AND the draw hasn't happened yet
      const canEdit = isCreator && !isDrawn;

      console.log("[GroupService.getGroupById] Calculated can_edit", { canEdit, isCreator, isDrawn });

      // Step 7: Construct and return GroupDetailDTO
      const groupDetailDTO: GroupDetailDTO = {
        ...group,
        is_drawn: isDrawn,
        participants: participants || [],
        exclusions: exclusions || [],
        is_creator: isCreator,
        can_edit: canEdit,
      };

      console.log("[GroupService.getGroupById] Returning GroupDetailDTO", {
        groupId: groupDetailDTO.id,
        participantsCount: groupDetailDTO.participants.length,
        exclusionsCount: groupDetailDTO.exclusions.length,
        isDrawn: groupDetailDTO.is_drawn,
        canEdit: groupDetailDTO.can_edit,
      });

      return groupDetailDTO;
    } catch (error) {
      console.error("[GroupService.getGroupById] Error:", error);
      throw error;
    }
  }

  /**
   * Updates a Secret Santa group
   * Only the creator can update the group, and only before the draw
   *
   * @param groupId - The ID of the group to update
   * @param userId - The ID of the user attempting to update
   * @param command - The update data (all fields optional)
   * @returns Updated GroupDTO
   * @throws {Error} If group not found, user unauthorized, or draw completed
   */
  async updateGroup(
    groupId: number,
    userId: UserId,
    command: UpdateGroupCommand
  ): Promise<GroupDTO> {
    // Guard: Validate input
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    try {
      // Step 1: Fetch group and check authorization
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      // Guard: Check if group exists
      if (groupError || !group) {
        console.log("[GroupService.updateGroup] Group not found", { groupId });
        throw new Error("GROUP_NOT_FOUND");
      }

      // Guard: Check if user is creator
      if (group.creator_id !== userId) {
        console.log("[GroupService.updateGroup] User not authorized", {
          userId,
          creatorId: group.creator_id,
        });
        throw new Error("FORBIDDEN");
      }

      // Step 2: Check if draw has been completed
      const { data: hasAssignments } = await this.supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)
        .maybeSingle();

      // Guard: Check if draw completed
      if (hasAssignments !== null) {
        console.log("[GroupService.updateGroup] Draw already completed", { groupId });
        throw new Error("DRAW_COMPLETED");
      }

      // Step 3: Prepare update data
      const updateData: GroupUpdate = {};
      if (command.name !== undefined) updateData.name = command.name;
      if (command.budget !== undefined) updateData.budget = command.budget;
      if (command.end_date !== undefined) updateData.end_date = command.end_date;

      // Step 4: Update group
      const { data: updatedGroup, error: updateError } = await this.supabase
        .from("groups")
        .update(updateData)
        .eq("id", groupId)
        .select()
        .single();

      if (updateError || !updatedGroup) {
        console.error("[GroupService.updateGroup] Failed to update group:", updateError);
        throw new Error("Failed to update group");
      }

      console.log("[GroupService.updateGroup] Group updated successfully", { groupId });

      // Step 5: Return GroupDTO with is_drawn field
      return {
        ...updatedGroup,
        is_drawn: false, // We already checked it's not drawn
      };
    } catch (error) {
      console.error("[GroupService.updateGroup] Error:", error);
      throw error;
    }
  }

  /**
   * Deletes a Secret Santa group and all related data
   * Only the creator can delete the group
   *
   * @param groupId - The ID of the group to delete
   * @param userId - The ID of the user attempting to delete
   * @throws {Error} If group not found or user unauthorized
   */
  async deleteGroup(groupId: number, userId: UserId): Promise<void> {
    // Guard: Validate input
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    try {
      // Step 1: Fetch group and check authorization
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("id, creator_id")
        .eq("id", groupId)
        .single();

      // Guard: Check if group exists
      if (groupError || !group) {
        console.log("[GroupService.deleteGroup] Group not found", { groupId });
        throw new Error("GROUP_NOT_FOUND");
      }

      // Guard: Check if user is creator
      if (group.creator_id !== userId) {
        console.log("[GroupService.deleteGroup] User not authorized", {
          userId,
          creatorId: group.creator_id,
        });
        throw new Error("FORBIDDEN");
      }

      // Step 2: Delete group (CASCADE will handle related records)
      const { error: deleteError } = await this.supabase.from("groups").delete().eq("id", groupId);

      if (deleteError) {
        console.error("[GroupService.deleteGroup] Failed to delete group:", deleteError);
        throw new Error("Failed to delete group");
      }

      console.log("[GroupService.deleteGroup] Group deleted successfully", { groupId });
    } catch (error) {
      console.error("[GroupService.deleteGroup] Error:", error);
      throw error;
    }
  }
}
