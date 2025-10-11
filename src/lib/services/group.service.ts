import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateGroupCommand, GroupListItemDTO, UserId, GroupInsert, ParticipantInsert } from "../../types";

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
}
